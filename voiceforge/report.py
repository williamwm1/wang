"""
report.py
=========
Generate the ``report.txt`` deliverable summarising a full run:

    * input / output file
    * detection results (the Audio Report)
    * every DSP parameter actually used
    * final LUFS / peak
    * processing time

Also exposes :func:`build_report_text` so the UI can show the same content in
its report panel without touching disk.
"""

from __future__ import annotations

import os
from datetime import datetime
from typing import Optional

from .analysis import AudioReport
from .repair import RepairResult


def build_report_text(
    src: str,
    out_path: str,
    before: AudioReport,
    after: AudioReport,
    result: RepairResult,
    elapsed_s: float,
) -> str:
    p = result.params
    lines = []
    lines.append("VoiceForge AI — Processing Report")
    lines.append("=" * 40)
    lines.append(f"Generated : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append("")
    lines.append("Files")
    lines.append("-" * 40)
    lines.append(f"Input     : {src}")
    lines.append(f"Output    : {out_path}")
    lines.append("")

    lines.append(before.format_stars())
    lines.append("")

    lines.append("DSP Chain & Parameters")
    lines.append("-" * 40)
    lines.append(f"1. De-noise    : {result.denoise_method_used} "
                 f"(reduction≈{p.denoise_reduction_db:.1f} dB, floor {p.denoise_floor_db:.0f} dB)")
    lines.append(f"2. High-pass   : {p.highpass_hz} Hz"
                 + ("  + hum notches @ " + "/".join(map(str, p.hum_freqs)) + " Hz" if p.notch_hum else ""))
    lines.append(f"3. EQ          : low {p.eq_low_hz}Hz {p.eq_low_gain:+.1f}dB | "
                 f"mud {p.eq_mud_hz}Hz {p.eq_mud_gain:+.1f}dB | "
                 f"presence {p.eq_presence_hz}Hz {p.eq_presence_gain:+.1f}dB | "
                 f"air {p.eq_air_hz}Hz {p.eq_air_gain:+.1f}dB")
    lines.append(f"4. Compressor  : ratio {p.comp_ratio:.0f}:1, "
                 f"threshold {p.comp_threshold_db:.0f} dB, "
                 f"attack {p.comp_attack_ms:.0f} ms, release {p.comp_release_ms:.0f} ms")
    lines.append(f"5. De-esser    : intensity {p.deess_intensity:.2f} "
                 f"(~{p.deess_freq_hz} Hz sibilance)")
    lines.append(f"6. Limiter     : true peak {p.limiter_tp_db:.1f} dB")
    lines.append(f"7. Loudness    : target {p.target_lufs:.1f} LUFS "
                 f"(true two-pass normalise, TP {p.target_tp_db:.1f} dB)")
    lines.append(f"   Full chain  : {result.filter_chain}")
    lines.append("")

    lines.append("Before / After")
    lines.append("-" * 40)
    lines.append(f"{'Metric':<14}{'Before':>12}{'After':>12}")
    lines.append(f"{'LUFS':<14}{before.lufs:>11.1f}{after.lufs:>12.1f}")
    lines.append(f"{'Peak (dBFS)':<14}{before.peak_dbfs:>11.1f}{after.peak_dbfs:>12.1f}")
    lines.append(f"{'Dyn Range dB':<14}{before.dynamic_range:>11.1f}{after.dynamic_range:>12.1f}")
    lines.append(f"{'Noise ★':<14}{before.noise:>11d}{after.noise:>12d}")
    lines.append(f"{'Rumble ★':<14}{before.rumble:>11d}{after.rumble:>12d}")
    lines.append(f"{'Sibilance ★':<14}{before.sibilance:>11d}{after.sibilance:>12d}")
    lines.append(f"{'Hum ★':<14}{before.hum:>11d}{after.hum:>12d}")
    lines.append("")
    lines.append(f"Final LUFS : {after.lufs:.1f} LUFS")
    lines.append(f"Final Peak : {after.peak_dbfs:.1f} dBFS")
    lines.append(f"Elapsed    : {elapsed_s:.1f} s")
    lines.append("")
    return "\n".join(lines)


def write_report(
    dst_txt: str,
    src: str,
    out_path: str,
    before: AudioReport,
    after: AudioReport,
    result: RepairResult,
    elapsed_s: float,
) -> str:
    text = build_report_text(src, out_path, before, after, result, elapsed_s)
    os.makedirs(os.path.dirname(dst_txt) or ".", exist_ok=True)
    with open(dst_txt, "w", encoding="utf-8") as fh:
        fh.write(text)
    return dst_txt
