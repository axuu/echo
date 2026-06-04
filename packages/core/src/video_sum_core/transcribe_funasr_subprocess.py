from __future__ import annotations

import argparse
import json
import logging
import os
import re
import sys
import time
from pathlib import Path

# Guard: torch's _load_dll_libraries calls os.add_dll_directory()
# for torch/lib, which can fail with WinError 206 on portable Python
# builds.  The directory is already on PATH, so swallowing this error
# is safe — DLL loading via PATH still works.
_original_add_dll_directory = getattr(os, "add_dll_directory", None)
if _original_add_dll_directory is not None:
    def _safe_add_dll_directory(path):
        try:
            return _original_add_dll_directory(path)
        except (FileNotFoundError, OSError):
            return None
    os.add_dll_directory = _safe_add_dll_directory


logger = logging.getLogger("video_sum_core.transcribe_funasr_subprocess")


def configure_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s | %(message)s",
    )


def write_progress(progress_path: Path, payload: dict[str, object]) -> None:
    with progress_path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(payload, ensure_ascii=False) + "\n")
        handle.flush()


def configure_runtime_library_dirs() -> None:
    raw_paths = os.environ.get("VIDEO_SUM_DLL_PATHS", "")
    if not raw_paths:
        return
    dll_paths: list[str] = []
    for entry in raw_paths.split(os.pathsep):
        path = entry.strip()
        if path and path not in dll_paths and Path(path).exists():
            dll_paths.append(path)

    if not dll_paths:
        return

    os.environ["PATH"] = os.pathsep.join([*dll_paths, os.environ.get("PATH", "")])
    add_dll_directory = getattr(os, "add_dll_directory", None)
    if add_dll_directory is None:
        return
    for path in dll_paths:
        try:
            add_dll_directory(path)
        except OSError:
            logger.debug("skip dll directory path=%s", path, exc_info=True)


def _cleanup_stale_modelscope_locks() -> int:
    """Remove orphaned ModelScope hub lock files left behind by crashed processes.

    ModelScope uses file-based locking in ``~/.cache/modelscope/hub/.lock/``.
    If a process is killed during download the lock file persists and
    subsequent attempts spin forever waiting for it.  A lock is considered
    *orphaned* when it is at least 10 minutes old (downloads complete faster
    than that and the lock is released on success).
    """
    candidates = [
        Path.home() / ".cache" / "modelscope" / "hub" / ".lock",
        Path.home() / ".cache" / "modelscope" / "hub" / ".____temp_lock",
    ]
    cleaned = 0
    threshold = time.time() - 600  # 10 min ago → orphaned
    for lock_dir in candidates:
        if not lock_dir.is_dir():
            continue
        for lock_file in list(lock_dir.iterdir()):
            if not lock_file.is_file():
                continue
            try:
                mtime = lock_file.stat().st_mtime
            except OSError:
                continue
            if mtime < threshold:
                logger.warning("removing orphaned modelscope lock %s (mtime=%s)", lock_file, mtime)
                try:
                    lock_file.unlink()
                    cleaned += 1
                except OSError:
                    logger.debug("could not remove orphaned lock %s", lock_file, exc_info=True)
    return cleaned


def format_timestamp(seconds: float) -> str:
    total = max(0, int(seconds))
    hours = total // 3600
    minutes = (total % 3600) // 60
    secs = total % 60
    if hours:
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"
    return f"{minutes:02d}:{secs:02d}"


def parse_funasr_result(
    result: list[dict] | dict,
    duration: float | None,
    progress_path: Path,
) -> list[dict[str, object]]:
    """Convert FunASR output to Whisper-compatible segments with timestamps.

    FunASR returns different shapes depending on model family.  Strategies
    tried in order:

    1. ``sentence_info`` / ``sentences`` — sentence-level timestamps.
    2. ``timestamp`` word-level — dict (SEACO, seconds) or list (ms).
    3. Punctuation-only split with proportional time estimates.
    """
    _SENT_SPLIT = re.compile(r"[。！？.!?\n]+")

    segments: list[dict[str, object]] = []
    if isinstance(result, dict):
        result = [result]
    if not result:
        return segments

    current_offset = 0.0

    for item in result:
        text = str(item.get("text", "")).strip()
        if not text:
            continue

        # ── strategy 1: sentence-level timestamps ────────────────────
        # FunASR 1.x uses "sentences", SEACO models with
        # sentence_timestamp=True may use "sentence_info".
        sent_list = item.get("sentence_info") or item.get("sentences")
        if sent_list and isinstance(sent_list, list):
            for sent in sent_list:
                if not isinstance(sent, dict):
                    continue
                sent_text = str(sent.get("text", "")).strip()
                if not sent_text:
                    continue
                start_val = float(sent.get("start", 0))
                end_val = float(sent.get("end", 0))
                # Heuristic: if the span of a single sentence is > 100 seconds,
                # timestamps are in milliseconds.
                # Heuristic: if the span of a single sentence is > 100 seconds,
                # timestamps are in milliseconds
                if (end_val - start_val) > 100:
                    start_val /= 1000.0
                    end_val /= 1000.0
                seg = {
                    "start": round(start_val, 3),
                    "end": round(end_val, 3),
                    "text": sent_text,
                }
                segments.append(seg)
                current_offset = seg["end"]
            continue

        # ── strategy 2: word-level timestamp ─────────────────────────
        timestamp = item.get("timestamp")
        if timestamp and isinstance(timestamp, list):
            # Detect format: SEACO dicts {"text":"字","start":s,"end":s}
            # vs legacy list-of-pairs [[start_ms, end_ms], ...]
            if all(isinstance(t, dict) for t in timestamp):
                # SEACO word-level — start/end are in *seconds* (float)
                ts_entries = [(float(t.get("start", 0)), float(t.get("end", 0))) for t in timestamp]
            else:
                # Legacy list-of-pairs — values in *milliseconds*
                ts_entries = []
                for t in timestamp:
                    if isinstance(t, (list, tuple)) and len(t) >= 2:
                        ts_entries.append((float(t[0]) / 1000.0, float(t[1]) / 1000.0))

            if ts_entries:
                raw_sents = _SENT_SPLIT.split(text)
                sents = [s.strip() for s in raw_sents if s.strip()]

                # If punctuation split produced nothing useful (raw text
                # may lack punctuation when punc model applies separately),
                # fall back to splitting on timestamp *gaps* — a gap > 0.5 s
                # between consecutive words almost always means a sentence
                # boundary.  Only works for SEACO dict timestamps (which
                # carry per-character text); skip for legacy list-of-pairs.
                if len(sents) <= 1 and all(isinstance(t, dict) for t in timestamp):
                    gap_threshold = 0.3
                    gap_sents: list[str] = []
                    gap_buf: list[str] = []
                    for i, (ts_s, ts_e) in enumerate(ts_entries):
                        gap_buf.append(str(timestamp[i].get("text", "")))
                        if i + 1 < len(ts_entries):
                            next_start = ts_entries[i + 1][0]
                            if next_start - ts_e > gap_threshold:
                                gap_sents.append("".join(gap_buf))
                                gap_buf = []
                    if gap_buf:
                        gap_sents.append("".join(gap_buf))
                    if len(gap_sents) > 1:
                        sents = gap_sents

                if not sents:
                    sents = [text]
                total_chars = max(1, sum(len(s) for s in sents))
                ts_span = max(1.0, ts_entries[-1][1] - ts_entries[0][0])
                # Align chars → timestamps proportionally
                seg_start = ts_entries[0][0]
                char_pos = 0
                for sent in sents:
                    char_end = char_pos + len(sent)
                    # Find corresponding timestamp range
                    t_start_idx = min(len(ts_entries) - 1, int(len(ts_entries) * char_pos / total_chars))
                    t_end_idx = min(len(ts_entries) - 1, int(len(ts_entries) * char_end / total_chars))
                    seg = {
                        "start": round(ts_entries[t_start_idx][0], 3),
                        "end": round(ts_entries[t_end_idx][1], 3),
                        "text": sent,
                    }
                    segments.append(seg)
                    current_offset = seg["end"]
                    char_pos = char_end
                continue

        # ── strategy 3: punctuation split, proportional time ─────────
        raw_sents = _SENT_SPLIT.split(text)
        sents = [s.strip() for s in raw_sents if s.strip()]
        if not sents:
            sents = [text]
        total_chars = max(1, sum(len(s) for s in sents))
        total_dur = float(duration or total_chars * 0.15)
        for sent in sents:
            est_dur = max(1.0, total_dur * len(sent) / total_chars)
            seg = {
                "start": round(current_offset, 3),
                "end": round(current_offset + est_dur, 3),
                "text": sent,
            }
            segments.append(seg)
            current_offset += est_dur

    return segments


def transcribe_funasr(
    audio_path: Path,
    model_name: str,
    device: str,
    vad_model: str,
    punc_model: str,
    spk_model: str,
    hub: str,
    hotword: str,
    progress_path: Path,
    output_path: Path,
    duration: float | None,
) -> None:
    configure_runtime_library_dirs()

    logger.info(
        "child funasr transcription start audio=%s model=%s device=%s vad=%s punc=%s spk=%s hub=%s",
        audio_path,
        model_name,
        device,
        vad_model or "none",
        punc_model or "none",
        spk_model or "none",
        hub,
    )

    write_progress(
        progress_path,
        {
            "stage": "transcribing",
            "progress": 54,
            "message": f"正在加载 FunASR 模型 {model_name}（首次运行需下载，请耐心等待）",
        },
    )

    # Purge orphaned lock files left by previously killed subprocess runs.
    # Without this, ModelScope spins forever trying to acquire a lock that
    # will never be released.
    _cleanup_stale_modelscope_locks()

    # Build model kwargs
    model_kwargs = {
        "model": model_name,
        "device": device,
        "hub": hub,
    }

    if vad_model:
        model_kwargs["vad_model"] = vad_model
    if punc_model:
        model_kwargs["punc_model"] = punc_model
    if spk_model:
        model_kwargs["spk_model"] = spk_model

    # Ensure torchaudio/lib is in the DLL search path before importing
    # funasr (→ torch → torchaudio).  Guards handle WinError 206.
    for _sp in [p for p in sys.path if p]:
        _tal = os.path.join(_sp, "torchaudio", "lib")
        if os.path.isdir(_tal):
            os.add_dll_directory(_tal)
            break

    from funasr import AutoModel

    model = None
    for try_hub in [hub, "hf" if hub == "ms" else "ms"]:
        try:
            model_kwargs["hub"] = try_hub
            model = AutoModel(**model_kwargs)
            break
        except Exception as e:
            if "download" in str(e).lower() or "network" in str(e).lower():
                logger.warning("Model load failed with hub=%s, trying hub=%s: %s", hub, try_hub, e)
                continue
            raise
    if model is None:
        raise RuntimeError(f"Failed to load model {model_name} from any hub")

    write_progress(
        progress_path,
        {
            "stage": "transcribing",
            "progress": 62,
            "message": f"模型加载完成，正在转写音频 {audio_path.name}",
        },
    )

    # Build generate kwargs.
    # NOTE: do NOT pass sentence_timestamp=True — SEACO models return
    # word-level timestamp dicts natively, and sentence-level timestamps
    # are unreliable across funasr versions.
    generate_kwargs = {
        "input": str(audio_path),
        "batch_size": 1,
    }

    if hotword:
        generate_kwargs["hotword"] = hotword

    result = model.generate(**generate_kwargs)

    # Debug: log result structure so we can diagnose missing timestamps
    _sample = result
    if isinstance(_sample, list) and _sample:
        _sample = _sample[0]
    if isinstance(_sample, dict):
        _keys = sorted(_sample.keys())
        _has_text = "text" in _sample
        _text_len = len(str(_sample.get("text", "")))
        _has_sents = bool(_sample.get("sentence_info") or _sample.get("sentences"))
        _has_ts = bool(_sample.get("timestamp"))
        logger.info(
            "funasr result keys=%s text_len=%s has_sentence_info=%s has_sentences=%s has_timestamp=%s",
            _keys, _text_len, bool(_sample.get("sentence_info")), bool(_sample.get("sentences")), _has_ts,
        )
        if _has_ts:
            _ts = _sample["timestamp"]
            if isinstance(_ts, list) and _ts:
                logger.info("funasr timestamp sample[0]=%s type=%s", _ts[0], type(_ts[0]).__name__)
        if _has_sents:
            _si = _sample.get("sentence_info") or _sample.get("sentences")
            if isinstance(_si, list) and _si:
                logger.info("funasr sentence sample[0]=%s", {k: v for k, v in _si[0].items() if k in ("text", "start", "end")})

    # Parse result
    segments = parse_funasr_result(result, duration, progress_path)
    logger.info(
        "funasr parsed result_items=%d output_segments=%d",
        len(result) if isinstance(result, list) else 1,
        len(segments),
    )

    if not segments:
        raise RuntimeError("FunASR transcription produced empty output.")

    # Build transcript
    transcript_lines = [f"[{format_timestamp(s['start'])}] {s['text']}" for s in segments]
    transcript = "\n".join(transcript_lines)

    # Check CJK character ratio to warn about non-Chinese audio
    text = "".join(str(s.get("text", "")) for s in segments)
    if len(text) > 100:
        cjk_chars = 0
        for c in text:
            try:
                name = __import__("unicodedata").name(c, "")
                if "CJK" in name:
                    cjk_chars += 1
            except ValueError:
                pass
        cjk_ratio = cjk_chars / len(text)
        if cjk_ratio < 0.1:
            logger.warning("Detected low CJK ratio (%.1f%%). Audio may not be Chinese.", cjk_ratio * 100)

    write_progress(
        progress_path,
        {
            "stage": "transcribing",
            "progress": 84,
            "message": f"转写完成，共识别 {len(segments)} 段",
            "payload": {"segment_count": len(segments)},
        },
    )

    output_path.write_text(
        json.dumps({"transcript": transcript, "segments": segments}, ensure_ascii=False),
        encoding="utf-8",
    )

    logger.info(
        "child funasr transcription finish audio=%s segments=%d transcript_chars=%d",
        audio_path,
        len(segments),
        len(transcript),
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run FunASR transcription in an isolated subprocess.")
    parser.add_argument("--audio-path", required=True)
    parser.add_argument("--model", required=True)
    parser.add_argument("--device", required=True)
    parser.add_argument("--vad-model", default="")
    parser.add_argument("--punc-model", default="")
    parser.add_argument("--spk-model", default="")
    parser.add_argument("--hub", default="ms")
    parser.add_argument("--hotword", default="")
    parser.add_argument("--progress-path", required=True)
    parser.add_argument("--output-path", required=True)
    parser.add_argument("--duration", type=float)
    return parser.parse_args()


def main() -> int:
    configure_logging()
    args = parse_args()
    try:
        transcribe_funasr(
            audio_path=Path(args.audio_path),
            model_name=args.model,
            device=args.device,
            vad_model=args.vad_model,
            punc_model=args.punc_model,
            spk_model=args.spk_model,
            hub=args.hub,
            hotword=args.hotword,
            progress_path=Path(args.progress_path),
            output_path=Path(args.output_path),
            duration=args.duration,
        )
    except Exception:
        logger.exception("child funasr transcription failed")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
