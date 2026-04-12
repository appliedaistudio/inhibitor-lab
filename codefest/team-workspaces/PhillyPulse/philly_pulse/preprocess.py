"""Parameterized audio preprocessing pipeline with named variants.

Each variant defines a set of preprocessing steps (high-pass filter,
VAD, normalization) applied to raw PCM audio before Whisper transcription.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import numpy as np

SAMPLE_RATE = 16000


@dataclass
class VariantConfig:
    name: str
    highpass_hz: int  # 0 = skip high-pass filter
    vad_aggressiveness: Optional[int]  # None = skip VAD (keep all audio)
    norm_percentile: Optional[int]  # None = skip normalization


PIPELINE_VARIANTS: list[VariantConfig] = [
    VariantConfig(name="aggressive", highpass_hz=100, vad_aggressiveness=3, norm_percentile=99),
]


def preprocess_audio(
    raw_pcm: np.ndarray,
    cfg: VariantConfig,
    silence_limit_s: float = 3.0,
    min_speech_s: float = 1.5,
) -> tuple[np.ndarray, dict]:
    """Apply preprocessing steps defined by *cfg* to raw float32 PCM.

    Returns (processed_audio, meta_dict).
    """
    import scipy.signal as signal

    audio = raw_pcm.copy().astype(np.float32)
    meta: dict = {
        "highpass_hz": cfg.highpass_hz,
        "vad_aggressiveness": cfg.vad_aggressiveness,
        "norm_percentile": cfg.norm_percentile,
        "norm_level": 0.0,
        "vad_duration_s": round(len(audio) / SAMPLE_RATE, 2),
    }

    # High-pass filter
    if cfg.highpass_hz > 0:
        sos = signal.butter(5, cfg.highpass_hz / (SAMPLE_RATE / 2), btype="high", output="sos")
        audio = signal.sosfilt(sos, audio).astype(np.float32)

    # VAD segmentation
    if cfg.vad_aggressiveness is not None:
        audio = _vad_segment(audio, cfg.vad_aggressiveness, silence_limit_s, min_speech_s)
        meta["vad_duration_s"] = round(len(audio) / SAMPLE_RATE, 2)

    # Normalization
    if cfg.norm_percentile is not None and len(audio) > 0:
        pval = float(np.percentile(np.abs(audio), cfg.norm_percentile))
        meta["norm_level"] = round(pval, 6)
        if pval > 0:
            audio = np.clip(audio / pval, -1.0, 1.0).astype(np.float32)

    return audio, meta


def _vad_segment(
    audio: np.ndarray,
    aggressiveness: int,
    silence_limit_s: float,
    min_speech_s: float,
) -> np.ndarray:
    """Run WebRTC VAD and return only speech segments concatenated."""
    import webrtcvad

    vad = webrtcvad.Vad(aggressiveness)
    frame_ms = 30
    frame_samples = int(SAMPLE_RATE * frame_ms / 1000)
    frame_bytes = frame_samples * 2  # int16

    audio_int16 = (audio * 32767).astype(np.int16)
    chunk_size = 4096
    silence_limit_chunks = int(silence_limit_s * SAMPLE_RATE * 2 / (chunk_size * 2))

    segments: list[np.ndarray] = []
    buf: list[np.ndarray] = []
    is_recording = False
    silence_counter = 0

    for start in range(0, len(audio_int16), chunk_size):
        chunk_i16 = audio_int16[start : start + chunk_size]
        chunk_f32 = audio[start : start + chunk_size]

        is_speech = False
        for fi in range(0, len(chunk_i16), frame_samples):
            frame = chunk_i16[fi : fi + frame_samples].tobytes()
            if len(frame) == frame_bytes:
                if vad.is_speech(frame, SAMPLE_RATE):
                    is_speech = True
                    break

        if is_speech:
            if not is_recording:
                is_recording = True
            buf.append(chunk_f32)
            silence_counter = 0
        elif is_recording:
            buf.append(chunk_f32)
            silence_counter += 1
            if silence_counter >= silence_limit_chunks:
                seg = np.concatenate(buf).astype(np.float32)
                if len(seg) / SAMPLE_RATE >= min_speech_s:
                    segments.append(seg)
                buf = []
                is_recording = False
                silence_counter = 0

    if buf and is_recording:
        seg = np.concatenate(buf).astype(np.float32)
        if len(seg) / SAMPLE_RATE >= min_speech_s:
            segments.append(seg)

    if not segments:
        return audio  # fallback: return original if VAD found nothing

    return np.concatenate(segments).astype(np.float32)
