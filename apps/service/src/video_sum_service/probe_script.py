"""Environment probe script — executed via subprocess in detect_environment().

Read by runtime_support.py and passed to ``python -c`` to inspect the
runtime Python's installed packages and capabilities.

NOTE: Do NOT add ``from __future__ import annotations`` here — this script
is executed via ``python -c`` by concatenating test shims, and __future__
imports must appear at the very start of the file.
"""

import importlib
import importlib.metadata
import json
import sys


def importable_distribution(
    distribution_name: str, import_name: str
) -> tuple[bool, str, str]:
    """Check whether *distribution_name* is installed and *import_name* is importable.

    Returns ``(importable, version, error)``.
    """
    try:
        version = importlib.metadata.version(distribution_name)
    except importlib.metadata.PackageNotFoundError:
        return False, "", ""
    try:
        importlib.import_module(import_name)
    except Exception as exc:
        return False, version, f"{type(exc).__name__}: {exc}"
    return True, version, ""


def probe() -> dict:
    """Run the environment probe and return a JSON-serializable payload."""
    torch_error = ""
    try:
        import torch  # noqa: F811
    except Exception as exc:
        torch = None
        torch_error = f"{type(exc).__name__}: {exc}"

    cuda_available = bool(torch is not None and torch.cuda.is_available())
    gpu_name = torch.cuda.get_device_name(0) if cuda_available else ""

    payload = {
        "pythonVersion": sys.version.split()[0],
        "torchInstalled": torch is not None,
        "torchVersion": torch.__version__ if torch is not None else "",
        "torchError": torch_error,
        "cudaAvailable": cuda_available,
        "gpuName": gpu_name,
        "ytDlpVersion": importlib.metadata.version("yt-dlp"),
        "localAsrVersion": "",
        "localAsrInstalled": False,
        "localAsrAvailable": False,
        "chromadbVersion": "",
        "chromadbInstalled": False,
        "chromadbError": "",
        "sentenceTransformersVersion": "",
        "sentenceTransformersInstalled": False,
        "sentenceTransformersError": "",
        "knowledgeDependenciesReady": False,
        "knowledgeDependenciesError": "",
        "ffmpegLocation": "",
        "recommendedModel": "large-v3-turbo" if cuda_available else "base",
        "recommendedDevice": "cuda" if cuda_available else "cpu",
    }

    try:
        payload["localAsrVersion"] = importlib.metadata.version("faster-whisper")
        payload["localAsrInstalled"] = True
        payload["localAsrAvailable"] = True
    except importlib.metadata.PackageNotFoundError:
        pass

    funasr_installed, funasr_version, funasr_error = importable_distribution(
        "funasr", "funasr"
    )
    payload["funasrVersion"] = funasr_version
    payload["funasrInstalled"] = funasr_installed
    payload["funasrAvailable"] = funasr_installed
    payload["funasrError"] = funasr_error

    chromadb_installed, chromadb_version, chromadb_error = importable_distribution(
        "chromadb", "chromadb"
    )
    payload["chromadbVersion"] = chromadb_version
    payload["chromadbInstalled"] = chromadb_installed
    payload["chromadbError"] = chromadb_error

    st_installed, st_version, st_error = importable_distribution(
        "sentence-transformers", "sentence_transformers"
    )
    payload["sentenceTransformersVersion"] = st_version
    payload["sentenceTransformersInstalled"] = st_installed
    payload["sentenceTransformersError"] = st_error

    payload["knowledgeDependenciesReady"] = bool(
        payload.get("chromadbInstalled") and payload.get("sentenceTransformersInstalled")
    )
    if not payload["knowledgeDependenciesReady"]:
        errors = [
            value
            for value in [
                payload.get("chromadbError"),
                payload.get("sentenceTransformersError"),
            ]
            if value
        ]
        payload["knowledgeDependenciesError"] = "\n".join(errors)

    return payload


def main() -> None:
    """Entry point: print the probe payload as JSON to stdout."""
    print(json.dumps(probe(), ensure_ascii=False))


if __name__ == "__main__":
    main()
