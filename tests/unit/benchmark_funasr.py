"""
FunASR Performance Benchmark

This script benchmarks FunASR transcription performance including:
- Transcription time
- Memory usage
- Model loading time
- Throughput (audio duration / processing time)

Usage:
    python tests/benchmark_funasr.py --audio-path /path/to/audio.wav --model paraformer-zh
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

try:
    import psutil

    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False


def format_bytes(size: int) -> str:
    for unit in ["B", "KB", "MB", "GB"]:
        if size < 1024:
            return f"{size:.2f} {unit}"
        size /= 1024
    return f"{size:.2f} TB"


def format_duration(seconds: float) -> str:
    if seconds < 60:
        return f"{seconds:.2f}s"
    minutes = int(seconds // 60)
    secs = seconds % 60
    return f"{minutes}m {secs:.2f}s"


def get_memory_usage() -> int | None:
    if not PSUTIL_AVAILABLE:
        return None
    process = psutil.Process()
    return process.memory_info().rss


def benchmark_funasr(
    audio_path: Path,
    model_name: str,
    device: str,
    vad_model: str,
    punc_model: str,
    spk_model: str,
    hub: str,
    hotword: str,
) -> dict[str, object]:
    from video_sum_core.transcribe_funasr_subprocess import transcribe_funasr

    progress_path = audio_path.parent / "benchmark_progress.jsonl"
    output_path = audio_path.parent / "benchmark_output.json"

    if progress_path.exists():
        progress_path.unlink()
    if output_path.exists():
        output_path.unlink()

    # Get audio duration
    try:
        import subprocess

        result = subprocess.run(
            ["ffprobe", "-v", "quiet", "-show_entries", "format=duration", "-of", "csv=p=0", str(audio_path)],
            capture_output=True,
            text=True,
            timeout=30,
        )
        audio_duration = float(result.stdout.strip())
    except Exception:
        audio_duration = None

    # Measure model loading time
    print("Loading model...")
    mem_before_load = get_memory_usage()
    load_start = time.time()

    from funasr import AutoModel

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

    model = AutoModel(**model_kwargs)
    load_time = time.time() - load_start
    mem_after_load = get_memory_usage()

    print(f"Model loaded in {format_duration(load_time)}")
    if mem_before_load and mem_after_load:
        model_memory = mem_after_load - mem_before_load
        print(f"Model memory: {format_bytes(model_memory)}")

    # Measure transcription time
    print("Transcribing...")
    mem_before_transcribe = get_memory_usage()
    transcribe_start = time.time()

    transcribe_funasr(
        audio_path=audio_path,
        model_name=model_name,
        device=device,
        vad_model=vad_model,
        punc_model=punc_model,
        spk_model=spk_model,
        hub=hub,
        hotword=hotword,
        progress_path=progress_path,
        output_path=output_path,
        duration=audio_duration,
    )

    transcribe_time = time.time() - transcribe_start
    mem_after_transcribe = get_memory_usage()

    print(f"Transcription completed in {format_duration(transcribe_time)}")

    # Load results
    result = json.loads(output_path.read_text(encoding="utf-8"))
    segments = result["segments"]
    transcript = result["transcript"]

    # Calculate metrics
    metrics = {
        "audio_path": str(audio_path),
        "audio_duration": audio_duration,
        "model_name": model_name,
        "device": device,
        "vad_model": vad_model,
        "punc_model": punc_model,
        "spk_model": spk_model,
        "hub": hub,
        "load_time": round(load_time, 3),
        "transcribe_time": round(transcribe_time, 3),
        "total_time": round(load_time + transcribe_time, 3),
        "segment_count": len(segments),
        "transcript_chars": len(transcript),
    }

    if audio_duration:
        metrics["throughput"] = round(audio_duration / transcribe_time, 2)
        metrics["real_time_factor"] = round(transcribe_time / audio_duration, 2)

    if mem_before_load and mem_after_load:
        metrics["model_memory_bytes"] = mem_after_load - mem_before_load
        metrics["model_memory"] = format_bytes(mem_after_load - mem_before_load)

    if mem_before_transcribe and mem_after_transcribe:
        metrics["transcribe_memory_bytes"] = mem_after_transcribe - mem_before_transcribe
        metrics["transcribe_memory"] = format_bytes(mem_after_transcribe - mem_before_transcribe)

    if mem_after_transcribe:
        metrics["peak_memory_bytes"] = mem_after_transcribe
        metrics["peak_memory"] = format_bytes(mem_after_transcribe)

    return metrics


def print_metrics(metrics: dict[str, object]) -> None:
    print("\n" + "=" * 60)
    print("BENCHMARK RESULTS")
    print("=" * 60)
    print(f"Audio: {metrics['audio_path']}")
    if metrics.get("audio_duration"):
        print(f"Duration: {format_duration(float(metrics['audio_duration']))}")
    print(f"Model: {metrics['model_name']}")
    print(f"Device: {metrics['device']}")
    if metrics.get("vad_model"):
        print(f"VAD: {metrics['vad_model']}")
    if metrics.get("punc_model"):
        print(f"Punctuation: {metrics['punc_model']}")
    if metrics.get("spk_model"):
        print(f"Speaker: {metrics['spk_model']}")
    print()
    print(f"Model load time: {format_duration(float(metrics['load_time']))}")
    print(f"Transcription time: {format_duration(float(metrics['transcribe_time']))}")
    print(f"Total time: {format_duration(float(metrics['total_time']))}")
    print()
    print(f"Segments: {metrics['segment_count']}")
    print(f"Transcript chars: {metrics['transcript_chars']}")
    print()
    if metrics.get("throughput"):
        print(f"Throughput: {metrics['throughput']}x real-time")
    if metrics.get("real_time_factor"):
        print(f"Real-time factor: {metrics['real_time_factor']}")
    print()
    if metrics.get("model_memory"):
        print(f"Model memory: {metrics['model_memory']}")
    if metrics.get("transcribe_memory"):
        print(f"Transcription memory: {metrics['transcribe_memory']}")
    if metrics.get("peak_memory"):
        print(f"Peak memory: {metrics['peak_memory']}")
    print("=" * 60)


def main() -> int:
    parser = argparse.ArgumentParser(description="Benchmark FunASR transcription performance")
    parser.add_argument("--audio-path", required=True, help="Path to audio file")
    parser.add_argument("--model", default="paraformer-zh", help="FunASR model name")
    parser.add_argument("--device", default="cpu", help="Device (cpu/cuda)")
    parser.add_argument("--vad-model", default="fsmn-vad", help="VAD model")
    parser.add_argument("--punc-model", default="ct-punc", help="Punctuation model")
    parser.add_argument("--spk-model", default="", help="Speaker model")
    parser.add_argument("--hub", default="ms", help="Model hub")
    parser.add_argument("--hotword", default="", help="Hotwords")
    parser.add_argument("--output", help="Output JSON file for metrics")
    args = parser.parse_args()

    audio_path = Path(args.audio_path)
    if not audio_path.exists():
        print(f"Error: Audio file not found: {audio_path}")
        return 1

    if not PSUTIL_AVAILABLE:
        print("Warning: psutil not available, memory metrics will not be collected")

    try:
        metrics = benchmark_funasr(
            audio_path=audio_path,
            model_name=args.model,
            device=args.device,
            vad_model=args.vad_model,
            punc_model=args.punc_model,
            spk_model=args.spk_model,
            hub=args.hub,
            hotword=args.hotword,
        )

        print_metrics(metrics)

        if args.output:
            output_path = Path(args.output)
            output_path.write_text(json.dumps(metrics, ensure_ascii=False, indent=2), encoding="utf-8")
            print(f"\nMetrics saved to: {output_path}")

        return 0
    except Exception as e:
        print(f"Error: {e}")
        import traceback

        traceback.print_exc()
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
