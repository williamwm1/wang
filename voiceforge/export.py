"""
export.py
=========
Stage 3 — mux the repaired audio back into the source media and write the
final deliverable.

* Video inputs (mp4 / mov)  -> ``<name>_VoiceForge.mp4`` with the original
  video stream copied untouched and the new AAC audio muxed in.
* Audio inputs (wav / mp3)  -> ``<name>_VoiceForge.wav``.

The processed audio is resampled / channel-mapped back to the source layout so
the export matches what the creator originally uploaded (mono stays mono,
stereo is up-mixed from the mono repair bus).
"""

from __future__ import annotations

import os
from typing import Optional

from . import audio_engine as ae


VIDEO_EXTS = {".mp4", ".mov", ".m4v", ".mkv", ".avi", ".webm"}
AUDIO_EXTS = {".wav", ".mp3", ".m4a", ".aac", ".flac"}


def output_name(src: str, out_dir: str, is_video: bool) -> str:
    """Return ``<stem>_VoiceForge.<mp4|wav>`` inside ``out_dir``."""
    stem = os.path.splitext(os.path.basename(src))[0]
    ext = ".mp4" if is_video else ".wav"
    os.makedirs(out_dir, exist_ok=True)
    return os.path.join(out_dir, f"{stem}_VoiceForge{ext}")


def export(
    src: str,
    repaired_wav: str,
    out_path: str,
    info,
    log: ae.Logger = ae._noop,
) -> str:
    """Produce the final file at ``out_path``.

    ``info`` is the :class:`~voiceforge.audio_engine.MediaInfo` of the source,
    used to decide video vs. audio and to match the source channel layout.
    """
    channels = max(1, info.channels or 1)

    if info.has_video:
        # Copy the video stream verbatim; encode the repaired audio as AAC.
        cmd = [
            ae.FFMPEG, "-y",
            "-i", src,            # 0: original (for video)
            "-i", repaired_wav,   # 1: repaired audio
            "-map", "0:v:0",
            "-map", "1:a:0",
            "-c:v", "copy",
            "-c:a", "aac",
            "-b:a", "192k",
            "-ac", str(channels),
            "-movflags", "+faststart",
            "-shortest",
            out_path,
        ]
        ae.run(cmd, log=log)
    else:
        # Audio-only export -> clean 48 kHz PCM WAV at the source channel count.
        cmd = [
            ae.FFMPEG, "-y",
            "-i", repaired_wav,
            "-ac", str(channels),
            "-ar", "48000",
            "-c:a", "pcm_s16le",
            out_path,
        ]
        ae.run(cmd, log=log)

    return out_path
