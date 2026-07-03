"""
pipeline.py
===========
Glue that runs the three product stages end-to-end and is shared by both the
GUI (``app.py``) and the command-line entry point.

    Analyze  ->  Repair  ->  Export (+ Report)

Each stage takes a ``log`` callback so the UI can stream progress into its log
window while the CLI just prints.  State is carried in :class:`PipelineState`
so the UI can run the stages from separate button clicks.
"""

from __future__ import annotations

import os
import time
from dataclasses import dataclass, field
from typing import Callable, Optional

from . import audio_engine as ae
from . import analysis, repair, export, report

Logger = Callable[[str], None]


@dataclass
class PipelineState:
    src: str
    info: Optional[ae.MediaInfo] = None
    before: Optional[analysis.AudioReport] = None
    after: Optional[analysis.AudioReport] = None
    repaired_wav: Optional[str] = None
    repair_result: Optional[repair.RepairResult] = None
    output_path: Optional[str] = None
    report_path: Optional[str] = None
    elapsed_s: float = 0.0


def _default_out_dir() -> str:
    d = os.path.join(os.path.dirname(__file__), "output")
    os.makedirs(d, exist_ok=True)
    return d


# --------------------------------------------------------------------------- #
# Individual stages
# --------------------------------------------------------------------------- #
def analyze(state: PipelineState, log: Logger = print) -> analysis.AudioReport:
    log("=== Analyze ===")
    state.info = ae.probe(state.src, log=log)
    state.before = analysis.analyze_file(state.src, log=log)
    log(state.before.format_stars())
    return state.before


def repair_stage(state: PipelineState, log: Logger = print) -> repair.RepairResult:
    if state.before is None:
        analyze(state, log=log)
    log("=== Repair ===")
    t0 = time.time()

    work_wav = ae.temp_path("_src.wav")
    try:
        ae.extract_wav(state.src, work_wav, sample_rate=48000, channels=1, log=log)
        repaired = ae.temp_path("_repaired.wav")
        state.repaired_wav = repaired
        state.repair_result = repair.repair_wav(work_wav, repaired, state.before, log=log)
        state.after = analysis.analyze_wav(repaired)
        state.elapsed_s += time.time() - t0
        log(f"Repair done in {time.time() - t0:.1f}s "
            f"({state.before.lufs:.1f} -> {state.after.lufs:.1f} LUFS)")
        return state.repair_result
    finally:
        ae.cleanup([work_wav])


def export_stage(
    state: PipelineState,
    out_dir: Optional[str] = None,
    log: Logger = print,
) -> str:
    if state.repaired_wav is None or state.repair_result is None:
        repair_stage(state, log=log)
    log("=== Export ===")
    out_dir = out_dir or _default_out_dir()
    is_video = bool(state.info and state.info.has_video)
    out_path = export.output_name(state.src, out_dir, is_video)
    export.export(state.src, state.repaired_wav, out_path, state.info, log=log)
    state.output_path = out_path
    log(f"Exported: {out_path}")

    # report.txt alongside the output
    report_path = os.path.join(out_dir, "report.txt")
    report.write_report(
        report_path, state.src, out_path,
        state.before, state.after, state.repair_result, state.elapsed_s,
    )
    state.report_path = report_path
    log(f"Report:   {report_path}")
    return out_path


# --------------------------------------------------------------------------- #
# One-shot
# --------------------------------------------------------------------------- #
def run_all(
    src: str,
    out_dir: Optional[str] = None,
    log: Logger = print,
) -> PipelineState:
    """Analyze + Repair + Export in one call. Returns the final state."""
    if not ae.have_ffmpeg():
        raise ae.AudioEngineError(
            "FFmpeg/FFprobe not found on PATH. Install FFmpeg and retry."
        )
    state = PipelineState(src=src)
    t0 = time.time()
    analyze(state, log=log)
    repair_stage(state, log=log)
    export_stage(state, out_dir=out_dir, log=log)
    state.elapsed_s = time.time() - t0
    # rewrite report with the true total elapsed
    if state.report_path:
        report.write_report(
            state.report_path, state.src, state.output_path,
            state.before, state.after, state.repair_result, state.elapsed_s,
        )
    log(f"All done in {state.elapsed_s:.1f}s")
    return state


def cleanup_state(state: PipelineState) -> None:
    if state.repaired_wav:
        ae.cleanup([state.repaired_wav])
