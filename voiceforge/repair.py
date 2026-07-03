"""
repair.py
=========
Stage 2 — the heart of the MVP.  Applies, in the fixed order mandated by the
product spec:

    1. AI de-noise         (DeepFilterNet -> RNNoise -> FFmpeg afftdn fallback)
    2. High-pass           (75 Hz, raised to 90 Hz when rumble detected)
    3. EQ                  (+120-180 Hz, -250-400 Hz, +2-4 kHz, gentle +10 kHz)
    4. Compressor          (3:1, 20 ms attack, 100 ms release)
    5. De-esser            (5-8 kHz, tuned for Chinese sibilance)
    6. Limiter             (true peak -1 dB)
    7. Loudness normalise  (real two-pass loudnorm to -14 LUFS)

Parameters are *seeded* from the spec defaults and then nudged based on the
:class:`~voiceforge.analysis.AudioReport` so the chain adapts to each clip
instead of being hard-wired.  No stage is allowed to hard-fail the run: the
de-noise ladder always degrades gracefully to afftdn, which ships with FFmpeg.
"""

from __future__ import annotations

import json
import os
import shutil
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional, Tuple

from . import audio_engine as ae
from .analysis import AudioReport


# --------------------------------------------------------------------------- #
# Parameter model
# --------------------------------------------------------------------------- #
@dataclass
class RepairParams:
    denoise_method: str = "afftdn"          # resolved at runtime
    denoise_reduction_db: float = 12.0
    denoise_floor_db: float = -40.0

    highpass_hz: int = 75
    notch_hum: bool = False
    hum_freqs: List[int] = field(default_factory=lambda: [50, 60, 100, 120])

    eq_low_hz: int = 150
    eq_low_gain: float = 2.5
    eq_mud_hz: int = 320
    eq_mud_gain: float = -3.0
    eq_presence_hz: int = 3000
    eq_presence_gain: float = 3.0
    eq_air_hz: int = 10000
    eq_air_gain: float = 1.5

    comp_threshold_db: float = -18.0
    comp_ratio: float = 3.0
    comp_attack_ms: float = 20.0
    comp_release_ms: float = 100.0

    deess_intensity: float = 0.3
    deess_freq_hz: int = 6500

    limiter_tp_db: float = -1.0

    target_lufs: float = -14.0
    target_tp_db: float = -1.0

    def as_dict(self) -> Dict:
        return asdict(self)


@dataclass
class RepairResult:
    output_wav: str
    params: RepairParams
    denoise_method_used: str
    filter_chain: str
    loudnorm_measured: Dict[str, str] = field(default_factory=dict)
    notes: List[str] = field(default_factory=list)


# --------------------------------------------------------------------------- #
# Parameter selection from analysis
# --------------------------------------------------------------------------- #
def choose_params(report: AudioReport) -> RepairParams:
    """Seed spec defaults, then adapt to the detected problems."""
    p = RepairParams()

    # -- de-noise strength scales with detected noise/hiss ---------------- #
    p.denoise_reduction_db = 6.0 + 4.0 * report.noise        # 6..26 dB
    # Quiet recordings get boosted hard by loudness-normalise, which also lifts
    # the noise floor — so pre-empt that by de-noising more when a large make-up
    # gain is coming.  (report.lufs is the source integrated loudness.)
    gain_needed = p.target_lufs - report.lufs
    if gain_needed > 10 and report.lufs > -60:
        p.denoise_reduction_db += min(10.0, (gain_needed - 10.0) * 0.6)
    nf = report.metrics.get("noise_floor_db", -40.0)
    p.denoise_floor_db = max(-80.0, min(-20.0, nf - 3.0))

    # -- high-pass: raise to 90 Hz when there is real low-end rumble ------ #
    if report.rumble >= 3:
        p.highpass_hz = 90
    else:
        p.highpass_hz = 75

    # -- mains hum notches ------------------------------------------------ #
    if report.hum >= 2:
        p.notch_hum = True

    # -- EQ tweaks -------------------------------------------------------- #
    # Muddy / boomy takes get a deeper low-mid cut and a smaller bass boost.
    if report.rumble >= 3 or report.room >= 3:
        p.eq_low_gain = 1.5
        p.eq_mud_gain = -4.0
    if report.room >= 3:
        # more presence helps intelligibility in a reverberant room
        p.eq_presence_gain = 4.0
    # Dull recordings (little sibilance/air) get a touch more top end.
    if report.sibilance <= 1:
        p.eq_air_gain = 2.5
    elif report.sibilance >= 4:
        p.eq_air_gain = 0.5     # already bright; don't add hiss

    # -- de-esser: intensity & centre track sibilance -------------------- #
    p.deess_intensity = min(0.9, 0.15 + 0.14 * report.sibilance)
    sib_ratio = report.metrics.get("sibilance_ratio", 0.0)
    # nudge the de-ess centre up a little for very bright sibilance
    p.deess_freq_hz = 7000 if sib_ratio > 0.35 else 6500

    return p


# --------------------------------------------------------------------------- #
# De-noise ladder
# --------------------------------------------------------------------------- #
def _deepfilternet_available() -> bool:
    if shutil.which("deepFilter"):
        return True
    try:
        import importlib.util
        return importlib.util.find_spec("df") is not None
    except Exception:
        return False


def _rnnoise_model() -> Optional[str]:
    """Return a bundled RNNoise model path (.rnnn) if one is available."""
    assets = os.path.join(os.path.dirname(__file__), "assets")
    if not os.path.isdir(assets):
        return None
    for name in sorted(os.listdir(assets)):
        if name.lower().endswith(".rnnn"):
            return os.path.join(assets, name)
    return None


def _denoise(src: str, dst: str, params: RepairParams, log: ae.Logger) -> str:
    """Run the best available de-noiser, degrading gracefully.

    Returns the name of the method actually used and writes to ``dst``.
    Never raises: a failure at any rung falls through to the next.
    """
    # 1) DeepFilterNet -------------------------------------------------- #
    if _deepfilternet_available():
        try:
            log("De-noise: trying DeepFilterNet...")
            if shutil.which("deepFilter"):
                outdir = os.path.dirname(dst) or "."
                ae.run(["deepFilter", src, "-o", outdir], log=log)
                produced = os.path.join(
                    outdir, os.path.splitext(os.path.basename(src))[0] + "_DeepFilterNet3.wav"
                )
                if not os.path.exists(produced):
                    # some versions keep the original stem
                    cand = os.path.join(outdir, os.path.basename(src))
                    produced = cand if os.path.exists(cand) else produced
                if os.path.exists(produced):
                    shutil.move(produced, dst)
                    params.denoise_method = "DeepFilterNet"
                    return "DeepFilterNet"
            else:
                from df.enhance import init_df, enhance, load_audio, save_audio  # type: ignore
                model, df_state, _ = init_df()
                audio, _ = load_audio(src, sr=df_state.sr())
                enhanced = enhance(model, df_state, audio)
                save_audio(dst, enhanced, df_state.sr())
                if os.path.exists(dst):
                    params.denoise_method = "DeepFilterNet"
                    return "DeepFilterNet"
        except Exception as exc:  # pragma: no cover - depends on env
            log(f"DeepFilterNet unavailable ({exc}); falling back.")

    # 2) RNNoise (ffmpeg arnndn, needs a model file) -------------------- #
    model = _rnnoise_model()
    if model:
        try:
            log(f"De-noise: trying RNNoise (arnndn) with {os.path.basename(model)}...")
            ae.apply_filter_chain(src, dst, f"arnndn=m={model}", log=log)
            if os.path.exists(dst):
                params.denoise_method = "RNNoise"
                return "RNNoise"
        except Exception as exc:
            log(f"RNNoise failed ({exc}); falling back to afftdn.")

    # 3) FFmpeg afftdn (always present) --------------------------------- #
    log("De-noise: using FFmpeg afftdn.")
    nr = max(0.01, min(97.0, params.denoise_reduction_db))
    nf = max(-80.0, min(-20.0, params.denoise_floor_db))
    ae.apply_filter_chain(src, dst, f"afftdn=nr={nr:.1f}:nf={nf:.0f}:tn=1", log=log)
    params.denoise_method = "afftdn"
    return "afftdn"


# --------------------------------------------------------------------------- #
# Filter-chain construction (stages 2-6)
# --------------------------------------------------------------------------- #
def build_filter_chain(p: RepairParams) -> str:
    """Assemble the FFmpeg -af string for high-pass through limiter."""
    parts: List[str] = []

    # 2) High-pass (two poles for a steeper rumble roll-off)
    parts.append(f"highpass=f={p.highpass_hz}:poles=2")

    # optional mains-hum notches
    if p.notch_hum:
        for f in p.hum_freqs:
            parts.append(f"equalizer=f={f}:width_type=q:w=30:g=-24")

    # 3) EQ
    parts.append(f"equalizer=f={p.eq_low_hz}:width_type=q:w=1.0:g={p.eq_low_gain:.1f}")
    parts.append(f"equalizer=f={p.eq_mud_hz}:width_type=q:w=1.2:g={p.eq_mud_gain:.1f}")
    parts.append(f"equalizer=f={p.eq_presence_hz}:width_type=q:w=0.9:g={p.eq_presence_gain:.1f}")
    # air as a high shelf so it lifts everything above ~10 kHz gently
    parts.append(f"treble=g={p.eq_air_gain:.1f}:f={p.eq_air_hz}:width_type=q:w=0.7")

    # 4) Compressor
    parts.append(
        "acompressor="
        f"threshold={p.comp_threshold_db}dB:"
        f"ratio={p.comp_ratio}:"
        f"attack={p.comp_attack_ms}:"
        f"release={p.comp_release_ms}:"
        "makeup=2:detection=rms"
    )

    # 5) De-esser (5-8 kHz sibilance control)
    parts.append(f"deesser=i={p.deess_intensity:.2f}:m=0.5:f=0.5:s=o")

    # 6) Limiter — true peak ceiling at -1 dB (0.891 linear)
    limit_lin = 10 ** (p.limiter_tp_db / 20.0)
    parts.append(f"alimiter=level=disabled:limit={limit_lin:.4f}")

    return ",".join(parts)


# --------------------------------------------------------------------------- #
# Two-pass loudness normalisation (stage 7)
# --------------------------------------------------------------------------- #
def _loudnorm_measure(src: str, p: RepairParams, log: ae.Logger) -> Dict[str, str]:
    """First loudnorm pass: measure the input so pass 2 can normalise linearly."""
    af = (
        f"loudnorm=I={p.target_lufs}:TP={p.target_tp_db}:LRA=11:"
        "print_format=json"
    )
    proc = ae.run(
        [ae.FFMPEG, "-y", "-i", src, "-af", af, "-f", "null", "-"],
        log=log, check=False,
    )
    text = proc.stderr
    # the JSON block is the last {...} in stderr
    start = text.rfind("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(text[start:end + 1])
        except json.JSONDecodeError:
            pass
    log("loudnorm: could not parse measurement; will use dynamic mode.")
    return {}


def _loudnorm_apply(
    src: str, dst: str, p: RepairParams, measured: Dict[str, str],
    out_sr: int, log: ae.Logger,
) -> str:
    base = f"loudnorm=I={p.target_lufs}:TP={p.target_tp_db}:LRA=11"
    if measured:
        af = (
            base
            + f":measured_I={measured.get('input_i')}"
            + f":measured_TP={measured.get('input_tp')}"
            + f":measured_LRA={measured.get('input_lra')}"
            + f":measured_thresh={measured.get('input_thresh')}"
            + f":offset={measured.get('target_offset')}"
            + ":linear=true:print_format=summary"
        )
    else:
        af = base
    ae.run(
        [ae.FFMPEG, "-y", "-i", src, "-af", af, "-ar", str(out_sr),
         "-c:a", "pcm_s16le", dst],
        log=log,
    )
    return dst


def _measure_lufs(path: str) -> Optional[float]:
    """Integrated loudness of ``path`` via pyloudnorm, or None if unavailable."""
    try:
        import numpy as np
        import soundfile as sf
        import pyloudnorm as pyln
        x, sr = sf.read(path, always_2d=False)
        if x.ndim > 1:
            x = x.mean(axis=1)
        if len(x) < int(0.4 * sr):
            return None
        val = float(pyln.Meter(sr).integrated_loudness(x.astype("float64")))
        return val if val == val else None  # guard NaN
    except Exception:
        return None


def _loudness_trim(path: str, p: RepairParams, log: ae.Logger) -> Optional[float]:
    """Guarantee the loudness target after loudnorm.

    loudnorm can undershoot the target for very quiet or peaky inputs because it
    refuses to breach the true-peak ceiling.  We verify the result and, if it is
    still off by more than 0.3 LU, apply a corrective gain followed by the same
    true-peak limiter so the final integrated loudness lands on target *without*
    exceeding -1 dBTP.  Returns the final measured LUFS (or None).
    """
    measured = _measure_lufs(path)
    if measured is None:
        return None
    limit_lin = 10 ** (p.limiter_tp_db / 20.0)

    # Iterate: each pass raises RMS via gain and squashes peaks via the limiter.
    # Because a TP-limited peaky signal only gains part of the applied dB per
    # pass, a couple of passes are needed to converge on the target.
    for _ in range(4):
        delta = p.target_lufs - measured
        if abs(delta) <= 0.3:
            break
        gain = max(-12.0, min(12.0, delta))
        log(f"Loudness trim: {measured:.1f} -> target {p.target_lufs:.1f} LUFS "
            f"(applying {gain:+.1f} dB + limiter)")
        tmp = ae.temp_path("_trim.wav")
        try:
            ae.apply_filter_chain(
                path, tmp,
                f"volume={gain:.2f}dB,alimiter=level=disabled:limit={limit_lin:.4f}",
                log=log,
            )
            shutil.move(tmp, path)
        except Exception as exc:
            log(f"Loudness trim skipped ({exc}).")
            ae.cleanup([tmp])
            break
        new_measured = _measure_lufs(path)
        if new_measured is None:
            break
        # stop if a pass no longer makes meaningful progress (crest-factor wall)
        if abs(new_measured - measured) < 0.15:
            measured = new_measured
            break
        measured = new_measured
    return measured


# --------------------------------------------------------------------------- #
# Orchestration
# --------------------------------------------------------------------------- #
def repair_wav(
    src_wav: str,
    dst_wav: str,
    report: AudioReport,
    log: ae.Logger = ae._noop,
    out_sr: int = 48000,
) -> RepairResult:
    """Run the full repair chain on a WAV and write the result to ``dst_wav``."""
    params = choose_params(report)
    tmp_files: List[str] = []
    notes: List[str] = []

    try:
        # ---- 1) de-noise ---------------------------------------------- #
        denoised = ae.temp_path("_denoise.wav")
        tmp_files.append(denoised)
        method = _denoise(src_wav, denoised, params, log)
        notes.append(f"De-noise via {method}")

        # ---- 2-6) high-pass .. limiter -------------------------------- #
        chain = build_filter_chain(params)
        log(f"Filter chain: {chain}")
        processed = ae.temp_path("_chain.wav")
        tmp_files.append(processed)
        ae.apply_filter_chain(denoised, processed, chain, log=log)

        # ---- 7) loudness normalise (two-pass) ------------------------- #
        log("Loudness: measuring (pass 1/2)...")
        measured = _loudnorm_measure(processed, params, log)
        log(f"Loudness: normalising to {params.target_lufs} LUFS (pass 2/2)...")
        _loudnorm_apply(processed, dst_wav, params, measured, out_sr, log)

        # verify + corrective trim so quiet/peaky inputs still hit the target
        final_lufs = _loudness_trim(dst_wav, params, log)
        if final_lufs is not None:
            notes.append(f"Final loudness {final_lufs:.1f} LUFS")

        return RepairResult(
            output_wav=dst_wav,
            params=params,
            denoise_method_used=method,
            filter_chain=chain,
            loudnorm_measured=measured,
            notes=notes,
        )
    finally:
        ae.cleanup(tmp_files)
