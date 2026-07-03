"""
audio_engine.py
================
Low-level helpers that wrap FFmpeg / FFprobe and provide shared utilities
used by the analysis, repair and export stages.

Everything that actually shells out to FFmpeg lives here so the higher level
modules stay readable and the command construction is testable in one place.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass, field
from typing import Callable, List, Optional


# --------------------------------------------------------------------------- #
# Tool discovery
# --------------------------------------------------------------------------- #
def _which(name: str) -> Optional[str]:
    return shutil.which(name)


def _bundle_dirs() -> List[str]:
    """Candidate directories that may hold a bundled ffmpeg/ffprobe.

    Covers a PyInstaller onefile/onedir layout (``sys._MEIPASS`` and the exe
    dir) plus a ``bin/`` folder shipped next to the package.
    """
    dirs: List[str] = []
    meipass = getattr(sys, "_MEIPASS", None)
    if meipass:
        dirs.append(meipass)
        dirs.append(os.path.join(meipass, "bin"))
    if getattr(sys, "frozen", False):
        dirs.append(os.path.dirname(sys.executable))
        dirs.append(os.path.join(os.path.dirname(sys.executable), "bin"))
    here = os.path.dirname(__file__)
    dirs.append(os.path.join(here, "bin"))
    return dirs


def _find_tool(name: str) -> Optional[str]:
    """Locate ``ffmpeg``/``ffprobe`` from PATH, a bundle dir, or imageio-ffmpeg."""
    exe = name + (".exe" if os.name == "nt" else "")
    # 1) bundled next to the app / inside the PyInstaller archive
    for d in _bundle_dirs():
        cand = os.path.join(d, exe)
        if os.path.isfile(cand) and os.access(cand, os.X_OK):
            return cand
    # 2) system PATH
    p = _which(name)
    if p:
        return p
    # 3) imageio-ffmpeg ships a static ffmpeg binary (ffmpeg only, not ffprobe)
    if name == "ffmpeg":
        try:
            import imageio_ffmpeg  # type: ignore
            return imageio_ffmpeg.get_ffmpeg_exe()
        except Exception:
            pass
    return None


FFMPEG = _find_tool("ffmpeg") or "ffmpeg"
FFPROBE = _find_tool("ffprobe") or ""


class AudioEngineError(RuntimeError):
    """Raised when an underlying FFmpeg/FFprobe call fails."""


def have_ffmpeg() -> bool:
    """True when we can process audio.

    ``ffmpeg`` is required; ``ffprobe`` is optional because :func:`probe` can
    fall back to parsing ``ffmpeg -i`` output when ffprobe is unavailable
    (e.g. a bundle that only ships the ffmpeg binary).
    """
    return bool(_find_tool("ffmpeg"))


# --------------------------------------------------------------------------- #
# Logging helper
# --------------------------------------------------------------------------- #
Logger = Callable[[str], None]


def _noop(_msg: str) -> None:  # default logger
    pass


# --------------------------------------------------------------------------- #
# Process runner
# --------------------------------------------------------------------------- #
def run(cmd: List[str], log: Logger = _noop, check: bool = True) -> subprocess.CompletedProcess:
    """Run a subprocess, streaming a short summary to ``log``."""
    log(f"$ {' '.join(_shorten(c) for c in cmd)}")
    proc = subprocess.run(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    if check and proc.returncode != 0:
        raise AudioEngineError(
            f"Command failed (exit {proc.returncode}): {' '.join(cmd)}\n{proc.stderr[-2000:]}"
        )
    return proc


def _shorten(token: str, maxlen: int = 60) -> str:
    if len(token) <= maxlen:
        return token
    return token[: maxlen - 3] + "..."


# --------------------------------------------------------------------------- #
# Media probing
# --------------------------------------------------------------------------- #
@dataclass
class MediaInfo:
    path: str
    duration: float = 0.0            # seconds
    sample_rate: int = 0             # Hz
    channels: int = 0
    has_video: bool = False
    video_codec: str = ""
    audio_codec: str = ""
    container: str = ""

    @property
    def is_audio_only(self) -> bool:
        return not self.has_video


def probe(path: str, log: Logger = _noop) -> MediaInfo:
    """Return container / stream metadata for ``path``.

    Uses ffprobe when available; otherwise falls back to parsing ``ffmpeg -i``
    output so a bundle that ships only the ffmpeg binary still works.
    """
    if not os.path.exists(path):
        raise AudioEngineError(f"File not found: {path}")

    if not FFPROBE:
        return _probe_with_ffmpeg(path, log=log)

    cmd = [
        FFPROBE,
        "-v", "error",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        path,
    ]
    proc = run(cmd, log=log)
    data = json.loads(proc.stdout or "{}")

    info = MediaInfo(path=path)
    fmt = data.get("format", {})
    info.container = fmt.get("format_name", "")
    try:
        info.duration = float(fmt.get("duration", 0.0))
    except (TypeError, ValueError):
        info.duration = 0.0

    for stream in data.get("streams", []):
        stype = stream.get("codec_type")
        if stype == "audio":
            info.sample_rate = int(stream.get("sample_rate", 0) or 0)
            info.channels = int(stream.get("channels", 0) or 0)
            info.audio_codec = stream.get("codec_name", "")
            if info.duration == 0.0:
                try:
                    info.duration = float(stream.get("duration", 0.0))
                except (TypeError, ValueError):
                    pass
        elif stype == "video":
            # Ignore attached cover-art / thumbnail streams.
            if stream.get("disposition", {}).get("attached_pic", 0) == 1:
                continue
            info.has_video = True
            info.video_codec = stream.get("codec_name", "")

    if info.sample_rate == 0 and info.channels == 0 and info.audio_codec == "":
        raise AudioEngineError(f"No audio stream found in {path}")

    return info


def _probe_with_ffmpeg(path: str, log: Logger = _noop) -> MediaInfo:
    """ffprobe-less fallback: parse ``ffmpeg -i`` diagnostic output."""
    proc = run([FFMPEG, "-hide_banner", "-i", path], log=log, check=False)
    text = proc.stderr
    info = MediaInfo(path=path)

    m = re.search(r"Duration:\s*(\d+):(\d+):(\d+\.\d+)", text)
    if m:
        h, mm, ss = int(m.group(1)), int(m.group(2)), float(m.group(3))
        info.duration = h * 3600 + mm * 60 + ss

    for line in text.splitlines():
        line = line.strip()
        if not line.startswith("Stream #"):
            continue
        if "Video:" in line and "attached pic" not in line:
            info.has_video = True
            vm = re.search(r"Video:\s*([a-zA-Z0-9_]+)", line)
            if vm:
                info.video_codec = vm.group(1)
        elif "Audio:" in line:
            am = re.search(r"Audio:\s*([a-zA-Z0-9_]+)", line)
            if am:
                info.audio_codec = am.group(1)
            sr = re.search(r"(\d+)\s*Hz", line)
            if sr:
                info.sample_rate = int(sr.group(1))
            if "stereo" in line:
                info.channels = 2
            elif "mono" in line:
                info.channels = 1
            else:
                ch = re.search(r"(\d+)\s*channels", line)
                info.channels = int(ch.group(1)) if ch else 1

    if info.sample_rate == 0 and info.channels == 0 and info.audio_codec == "":
        raise AudioEngineError(f"No audio stream found in {path}")
    return info


# --------------------------------------------------------------------------- #
# Audio extraction / IO
# --------------------------------------------------------------------------- #
def extract_wav(
    src: str,
    dst: str,
    sample_rate: int = 48000,
    channels: int = 1,
    log: Logger = _noop,
) -> str:
    """Decode any input to a clean PCM WAV for analysis / processing.

    Mono @ 48k by default which keeps DSP fast and predictable; the original
    audio layout is preserved separately for the final export where we care
    about matching the source.
    """
    cmd = [
        FFMPEG, "-y",
        "-i", src,
        "-vn",
        "-ac", str(channels),
        "-ar", str(sample_rate),
        "-c:a", "pcm_s16le",
        dst,
    ]
    run(cmd, log=log)
    return dst


def apply_filter_chain(
    src_wav: str,
    dst_wav: str,
    filter_str: str,
    log: Logger = _noop,
) -> str:
    """Render ``src_wav`` through an FFmpeg -af filter string to ``dst_wav``."""
    cmd = [
        FFMPEG, "-y",
        "-i", src_wav,
        "-af", filter_str,
        "-c:a", "pcm_s16le",
        dst_wav,
    ]
    run(cmd, log=log)
    return dst_wav


def temp_path(suffix: str = ".wav", prefix: str = "vf_") -> str:
    """Return a unique temp path inside the project temp dir."""
    base = os.path.join(os.path.dirname(__file__), "temp")
    os.makedirs(base, exist_ok=True)
    fd, path = tempfile.mkstemp(suffix=suffix, prefix=prefix, dir=base)
    os.close(fd)
    return path


def cleanup(paths: List[str]) -> None:
    for p in paths:
        try:
            if p and os.path.exists(p):
                os.remove(p)
        except OSError:
            pass
