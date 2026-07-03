"""
cli.py
======
Headless command-line entry point — the same pipeline the GUI drives, usable on
servers / CI where no display is available.

    python -m voiceforge.cli input.mp4 [-o OUTPUT_DIR] [--waveforms]

``--waveforms`` additionally renders before/after waveform PNGs (used for the
acceptance-criteria comparison screenshots).
"""

from __future__ import annotations

import argparse
import os
import sys

from . import audio_engine as ae
from . import pipeline


def render_waveform(wav_or_media: str, png_path: str, title: str = "") -> str:
    """Render a waveform PNG for a media/audio file via FFmpeg showwavespic."""
    cmd = [
        ae.FFMPEG, "-y",
        "-i", wav_or_media,
        "-filter_complex",
        "aformat=channel_layouts=mono,showwavespic=s=1000x240:colors=#1e88e5",
        "-frames:v", "1",
        png_path,
    ]
    ae.run(cmd)
    return png_path


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(prog="voiceforge", description="VoiceForge AI CLI")
    parser.add_argument("input", help="input video/audio (mp4/mov/wav/mp3)")
    parser.add_argument("-o", "--out-dir", default=None, help="output directory")
    parser.add_argument("--waveforms", action="store_true",
                        help="also render before/after waveform PNGs")
    args = parser.parse_args(argv)

    if not os.path.exists(args.input):
        print(f"Input not found: {args.input}", file=sys.stderr)
        return 2
    if not ae.have_ffmpeg():
        print("FFmpeg/FFprobe not found on PATH.", file=sys.stderr)
        return 3

    state = pipeline.run_all(args.input, out_dir=args.out_dir, log=print)

    if args.waveforms and state.output_path:
        out_dir = os.path.dirname(state.output_path)
        stem = os.path.splitext(os.path.basename(args.input))[0]
        before_png = os.path.join(out_dir, f"{stem}_before.png")
        after_png = os.path.join(out_dir, f"{stem}_after.png")
        render_waveform(args.input, before_png, "before")
        render_waveform(state.output_path, after_png, "after")
        print(f"Waveforms: {before_png} , {after_png}")

    print("\n" + "=" * 40)
    print(f"Output : {state.output_path}")
    print(f"Report : {state.report_path}")
    print(f"LUFS   : {state.before.lufs:.1f} -> {state.after.lufs:.1f}")
    print(f"Peak   : {state.before.peak_dbfs:.1f} -> {state.after.peak_dbfs:.1f} dBFS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
