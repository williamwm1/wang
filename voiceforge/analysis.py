"""
analysis.py
===========
Stage 1 of the pipeline: measure the audio and detect common problems so the
repair stage can adapt its parameters.

Measurements
------------
* duration, sample rate, channels
* integrated loudness (LUFS)
* true-ish peak (dBFS)
* dynamic range (LRA-style, loud vs quiet percentile spread)

Detections (each scored 0..5 "stars")
-------------------------------------
* noise      – broadband noise floor
* hum        – mains electrical hum at 50/60 Hz (+harmonics)
* rumble     – sub-bass rumble below ~80 Hz
* clipping   – samples pinned at full scale
* sibilance  – harsh 5-8 kHz energy (Chinese "齿音")
* room       – reverberation / room tone
* silence    – proportion of the take that is silent

The class also exposes a machine-readable :pyattr:`AudioReport.metrics` dict so
:mod:`repair` can tune its filter chain, plus a human readable ``format_stars``
render used by the UI and the report file.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field, asdict
from typing import Dict, Optional

import numpy as np
import soundfile as sf

try:
    import pyloudnorm as pyln
    _HAVE_PYLN = True
except Exception:  # pragma: no cover - optional
    _HAVE_PYLN = False

from . import audio_engine as ae


# --------------------------------------------------------------------------- #
# Report container
# --------------------------------------------------------------------------- #
@dataclass
class AudioReport:
    # basic media info
    duration: float = 0.0
    sample_rate: int = 0
    channels: int = 0

    # loudness / level
    lufs: float = -70.0
    peak_dbfs: float = -70.0
    dynamic_range: float = 0.0        # dB (loud pct - quiet pct)

    # problem scores, 0 (none) .. 5 (severe)
    noise: int = 0
    hum: int = 0
    rumble: int = 0
    clipping: int = 0
    sibilance: int = 0
    room: int = 0
    silence: int = 0

    # continuous helpers used by repair (not shown as stars)
    metrics: Dict[str, float] = field(default_factory=dict)

    # ------------------------------------------------------------------ #
    def recommendation(self) -> str:
        """Short human recommendation string."""
        if self.clipping >= 3:
            return "检测到削波失真，建议使用 Podcast Repair（限幅+响度归一）。"
        if self.noise >= 3 or self.hum >= 3 or self.rumble >= 3:
            return "底噪/低频问题明显，适合使用 Podcast Repair。"
        if self.sibilance >= 4:
            return "齿音偏重，适合使用 Podcast Repair（含 De-esser）。"
        if self.room >= 3:
            return "房间混响偏多，Repair 可改善但无法完全消除，建议靠近麦克风重录。"
        return "整体尚可，Podcast Repair 可进一步提升人声清晰度与响度一致性。"

    # ------------------------------------------------------------------ #
    def to_dict(self) -> Dict:
        d = asdict(self)
        return d

    # ------------------------------------------------------------------ #
    def format_stars(self) -> str:
        """Return the star-rated 'Audio Report' block used in the UI / report."""
        def stars(n: int) -> str:
            n = max(0, min(5, int(n)))
            return "★" * n + "☆" * (5 - n)

        clip_txt = "None" if self.clipping == 0 else stars(self.clipping)
        lines = [
            "Audio Report",
            "============",
            f"Duration    : {self.duration:.1f}s",
            f"Sample Rate : {self.sample_rate} Hz",
            f"Channels    : {self.channels}",
            f"Loudness    : {self.lufs:.1f} LUFS",
            f"Peak        : {self.peak_dbfs:.1f} dBFS",
            f"Dynamic Rng : {self.dynamic_range:.1f} dB",
            "",
            f"Noise       : {stars(self.noise)}",
            f"Room        : {stars(self.room)}",
            f"Sibilance   : {stars(self.sibilance)}",
            f"Hum         : {stars(self.hum)}",
            f"Rumble      : {stars(self.rumble)}",
            f"Silence     : {stars(self.silence)}",
            f"Clipping    : {clip_txt}",
            "",
            f"Recommendation: {self.recommendation()}",
        ]
        return "\n".join(lines)


# --------------------------------------------------------------------------- #
# Core analysis
# --------------------------------------------------------------------------- #
def _load_mono(wav_path: str):
    """Load a wav as float32 mono in [-1, 1] plus its sample rate."""
    data, sr = sf.read(wav_path, always_2d=False)
    if data.ndim > 1:
        data = data.mean(axis=1)
    return data.astype(np.float64), sr


def _rms_frames(x: np.ndarray, sr: int, frame_ms: float = 50.0):
    """Return per-frame RMS (linear) for a hop-less block partition."""
    n = max(1, int(sr * frame_ms / 1000.0))
    if len(x) < n:
        return np.array([np.sqrt(np.mean(x ** 2) + 1e-12)])
    trimmed = x[: len(x) - (len(x) % n)]
    frames = trimmed.reshape(-1, n)
    return np.sqrt(np.mean(frames ** 2, axis=1) + 1e-12)


def _db(x: float) -> float:
    return 20.0 * math.log10(max(x, 1e-9))


def _band_energy(mag: np.ndarray, freqs: np.ndarray, lo: float, hi: float) -> float:
    idx = np.where((freqs >= lo) & (freqs < hi))[0]
    if idx.size == 0:
        return 0.0
    return float(np.mean(mag[idx] ** 2))


def _hum_spike(mag: np.ndarray, freqs: np.ndarray, center: float) -> float:
    """Ratio of a narrow mains peak to the *robust* local baseline.

    A real electrical hum shows up as a sharp spike sitting well above the
    surrounding spectrum.  We compare the peak magnitude within ±4 Hz of
    ``center`` to the median magnitude of the neighbourhood (±35 Hz, excluding
    the peak zone).  Using the median keeps a nearby strong voice harmonic from
    masking a genuine hum spike, and — crucially — keeps ordinary voiced
    content from being mistaken for hum.
    """
    peak_idx = np.where((freqs >= center - 4) & (freqs <= center + 4))[0]
    base_idx = np.where(
        (freqs >= center - 35) & (freqs <= center + 35)
        & ((freqs < center - 8) | (freqs > center + 8))
    )[0]
    if peak_idx.size == 0 or base_idx.size == 0:
        return 1.0
    peak = float(np.max(mag[peak_idx]))
    base = float(np.median(mag[base_idx]))
    if base <= 1e-9:
        return 1.0
    return peak / base


def _scale(value: float, lo: float, hi: float) -> int:
    """Map a continuous value in [lo, hi] to an integer 0..5 star score."""
    if hi <= lo:
        return 0
    t = (value - lo) / (hi - lo)
    t = max(0.0, min(1.0, t))
    return int(round(t * 5))


def analyze_wav(wav_path: str) -> AudioReport:
    """Analyse an already-extracted mono WAV and return an :class:`AudioReport`."""
    x, sr = _load_mono(wav_path)
    rep = AudioReport()
    rep.sample_rate = sr
    rep.channels = 1
    rep.duration = len(x) / float(sr) if sr else 0.0

    if x.size == 0:
        return rep

    # ---- Peak ---------------------------------------------------------- #
    peak = float(np.max(np.abs(x)))
    rep.peak_dbfs = _db(peak)

    # ---- Loudness (LUFS) ---------------------------------------------- #
    if _HAVE_PYLN and rep.duration >= 0.4:
        try:
            meter = pyln.Meter(sr)
            rep.lufs = float(meter.integrated_loudness(x))
        except Exception:
            rep.lufs = _db(np.sqrt(np.mean(x ** 2))) - 3.0
    else:
        # crude fallback: RMS in dBFS with a rough K-weight offset
        rep.lufs = _db(np.sqrt(np.mean(x ** 2))) - 3.0
    if not np.isfinite(rep.lufs):
        rep.lufs = -70.0

    # ---- Frame RMS statistics ----------------------------------------- #
    rms = _rms_frames(x, sr)
    rms_db = 20.0 * np.log10(rms + 1e-9)
    # Clamp to a realistic acoustic floor: hard digital silence (synthetic gaps
    # or edited pauses) would otherwise report an impossible 90 dB+ range.
    rms_db = np.maximum(rms_db, -70.0)
    p10 = float(np.percentile(rms_db, 10))   # noise-floor-ish
    p50 = float(np.percentile(rms_db, 50))
    p95 = float(np.percentile(rms_db, 95))   # speech peaks
    rep.dynamic_range = round(p95 - p10, 1)

    # speech vs. noise floor gap (dB). Small gap => noisy.
    speech_ref = p95
    noise_floor = p10
    snr_est = speech_ref - noise_floor
    rep.metrics["noise_floor_db"] = round(noise_floor, 1)
    rep.metrics["speech_ref_db"] = round(speech_ref, 1)
    rep.metrics["snr_est_db"] = round(snr_est, 1)

    # ---- Silence ratio ------------------------------------------------- #
    silence_thresh = speech_ref - 35.0
    silent_frames = float(np.mean(rms_db < silence_thresh))
    rep.metrics["silence_ratio"] = round(silent_frames, 3)
    rep.silence = _scale(silent_frames, 0.15, 0.75)

    # ---- Clipping ------------------------------------------------------ #
    clip_thresh = 0.985
    clip_ratio = float(np.mean(np.abs(x) >= clip_thresh))
    rep.metrics["clip_ratio"] = round(clip_ratio, 6)
    if clip_ratio <= 1e-5:
        rep.clipping = 0
    else:
        rep.clipping = _scale(clip_ratio, 1e-5, 5e-3)
        rep.clipping = max(1, rep.clipping)

    # ---- Spectral analysis for hum / rumble / sibilance / noise ------- #
    # Average magnitude spectrum over the whole file.
    nfft = 8192
    step = nfft
    if len(x) < nfft:
        pad = np.zeros(nfft)
        pad[: len(x)] = x
        window = pad * np.hanning(nfft)
        mag = np.abs(np.fft.rfft(window))
    else:
        acc = None
        count = 0
        win = np.hanning(nfft)
        for start in range(0, len(x) - nfft, step):
            seg = x[start:start + nfft] * win
            m = np.abs(np.fft.rfft(seg))
            acc = m if acc is None else acc + m
            count += 1
        mag = acc / max(1, count)
    freqs = np.fft.rfftfreq(nfft, 1.0 / sr)

    total_energy = float(np.mean(mag ** 2)) + 1e-12

    # Rumble: energy below 80 Hz vs. voice band 100-4000 Hz
    sub = _band_energy(mag, freqs, 20, 80)
    voice = _band_energy(mag, freqs, 120, 4000) + 1e-12
    rumble_ratio = sub / voice
    rep.metrics["rumble_ratio"] = round(rumble_ratio, 4)
    rep.rumble = _scale(rumble_ratio, 0.05, 1.2)

    # Hum: sharp mains spikes at 50/60 Hz and their first harmonics.
    hum_score = max(
        _hum_spike(mag, freqs, 50),
        _hum_spike(mag, freqs, 60),
        _hum_spike(mag, freqs, 100),
        _hum_spike(mag, freqs, 120),
    )
    rep.metrics["hum_ratio"] = round(hum_score, 4)
    # ratio ~1-3 is normal spectral texture; a real hum spikes 5x-30x the floor.
    rep.hum = _scale(hum_score, 3.0, 15.0) if hum_score > 3.5 else 0

    # Sibilance: 5-8 kHz energy vs. 1-4 kHz voice body
    sib = _band_energy(mag, freqs, 5000, 8000)
    body = _band_energy(mag, freqs, 1000, 4000) + 1e-12
    sib_ratio = sib / body
    rep.metrics["sibilance_ratio"] = round(sib_ratio, 4)
    rep.sibilance = _scale(sib_ratio, 0.08, 0.6)

    # Broadband noise: high-band (8-16k) energy sitting in the quiet frames is a
    # proxy for hiss.  Combine spectral hiss with the SNR gap.
    hiss = _band_energy(mag, freqs, 8000, min(16000, sr / 2 - 1))
    hiss_ratio = hiss / (body + 1e-12)
    # low SNR -> high noise stars; large hiss -> high noise stars
    noise_from_snr = _scale(30.0 - snr_est, 0.0, 25.0)   # snr 30->0 stars, 5->5
    noise_from_hiss = _scale(hiss_ratio, 0.02, 0.25)
    rep.noise = int(round((noise_from_snr * 0.6 + noise_from_hiss * 0.4)))
    rep.metrics["hiss_ratio"] = round(hiss_ratio, 4)

    # Room / reverb: estimate from the decay of the amplitude envelope.  A
    # reverberant room keeps energy lingering, raising the quiet-percentile
    # relative to the median even during pauses -> smaller (p50-p10) gap while
    # speech is present.  We use a normalised "reverberance" proxy.
    env_gap = p50 - p10
    # small gap between median and floor + moderate silence => reverberant tail
    reverb_proxy = max(0.0, (18.0 - env_gap)) / 18.0
    rep.metrics["reverb_proxy"] = round(reverb_proxy, 3)
    rep.room = _scale(reverb_proxy, 0.15, 0.9)

    return rep


def analyze_file(path: str, log: ae.Logger = ae._noop) -> AudioReport:
    """Full stage-1 entry point: probe, extract audio, analyse.

    Returns an :class:`AudioReport`.  Media-level fields (duration, sample rate,
    channels) are taken from the *original* file via ffprobe so they reflect the
    source rather than the resampled analysis copy.
    """
    info = ae.probe(path, log=log)
    log(f"Probed: {info.duration:.1f}s, {info.sample_rate} Hz, {info.channels}ch, "
        f"{'video' if info.has_video else 'audio-only'}")

    wav = ae.temp_path(suffix="_analyze.wav")
    try:
        ae.extract_wav(path, wav, sample_rate=48000, channels=1, log=log)
        rep = analyze_wav(wav)
        # override with true source media info
        rep.duration = info.duration or rep.duration
        rep.sample_rate = info.sample_rate or rep.sample_rate
        rep.channels = info.channels or rep.channels
        return rep
    finally:
        ae.cleanup([wav])
