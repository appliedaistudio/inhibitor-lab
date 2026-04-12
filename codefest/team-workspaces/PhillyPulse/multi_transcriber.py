"""Multi-feed transcriber for PhillyPulse.

Streams ALL Philadelphia Broadcastify feeds simultaneously through a
SINGLE shared Whisper model. Each feed gets its own ffmpeg process and
VAD thread, but transcription segments are queued into one shared pool.

Usage:
    python multi_transcriber.py

Requires config.yaml with Broadcastify credentials.
"""

import subprocess
import numpy as np
from faster_whisper import WhisperModel
import datetime
import time
import sys
import queue
import threading
import select
import os
import gc
import re
from collections import Counter
import webrtcvad
import yaml

try:
    from philly_pulse.bridge import post_transcript as _pp_post
except Exception:
    _pp_post = None

try:
    from philly_pulse.preprocess import PIPELINE_VARIANTS, preprocess_audio
except Exception:
    PIPELINE_VARIANTS = []
    preprocess_audio = None


# ── Config ──────────────────────────────────────────────────────────

with open("config.yaml", "r", encoding="utf-8") as f:
    config = yaml.safe_load(f)

USERNAME = config["credentials"]["username"]
PASSWORD = config["credentials"]["password"]

VAD_AGGRESSIVENESS = config["vad_and_silence"]["vad_aggressiveness"]
MIN_SPEECH_SECONDS = config["vad_and_silence"]["min_speech_seconds"]
SILENCE_LIMIT = config["vad_and_silence"]["silence_limit"]

MODEL_SIZE = config["tuning"].get("model_size", "base")
LANGUAGE = config["tuning"]["language"]
INITIAL_PROMPT = config["tuning"]["initial_prompt"]
BEAM_SIZE = config["tuning"].get("beam_size", 5)
NO_SPEECH_THRESHOLD = config["tuning"]["no_speech_threshold"]
NORMALIZATION_PERCENTILE = config["tuning"]["normalization"]

FULL_BLOCK_PHRASES = config["post_generation_cleanup"]["full_block_phrases"]
CUTOFF_PHRASES = config["post_generation_cleanup"]["cutoff_phrases"]

PP_CFG = config.get("philly_pulse", {})
PP_ENABLED = PP_CFG.get("enabled", False) and _pp_post is not None
PP_BRIDGE_URL = PP_CFG.get("bridge_url", "http://127.0.0.1:8765/api/ingest")

# All Philadelphia-area public safety feeds
PHILLY_FEEDS = [
    {"feed_id": "4603",  "label": "PPD Citywide"},
    {"feed_id": "17310", "label": "PPD Central"},
    {"feed_id": "21297", "label": "PPD East"},
    {"feed_id": "45495", "label": "PPD Northeast"},
    {"feed_id": "18836", "label": "PPD Northwest"},
    {"feed_id": "15102", "label": "PPD South"},
    {"feed_id": "15195", "label": "PPD Southwest/West"},
    {"feed_id": "34250", "label": "PFD South Fire/Medics"},
    {"feed_id": "15747", "label": "PFD North Fire"},
    {"feed_id": "44308", "label": "SEPTA Transit Police"},
    {"feed_id": "13975", "label": "SEPTA Regional Rail"},
    {"feed_id": "13951", "label": "PA Turnpike Police East"},
    {"feed_id": "36323", "label": "Delaware Co Police Dispatch"},
    {"feed_id": "20795", "label": "Camden Co Fire/EMS Digital"},
]

# ── Constants ───────────────────────────────────────────────────────

SAMPLE_RATE = 16000
CHUNK_BYTES = 8192
GC_INTERVAL = 200
VAD_FRAME_MS = 30
VAD_FRAME_BYTES = int(SAMPLE_RATE * (VAD_FRAME_MS / 1000) * 2)

OUTPUT_FOLDER = "philly_transcripts/"
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

AUDIO_CLIPS_FOLDER = "audio_clips/"
os.makedirs(AUDIO_CLIPS_FOLDER, exist_ok=True)

RAW_CLIPS_FOLDER = "audio_clips_raw/"
os.makedirs(RAW_CLIPS_FOLDER, exist_ok=True)

# ── Shared transcription queue ──────────────────────────────────────

transcription_queue = queue.Queue()

# ── Load ONE Whisper model ──────────────────────────────────────────

print(f"Loading Whisper model '{MODEL_SIZE}' (shared across {len(PHILLY_FEEDS)} feeds)...")
model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8", cpu_threads=4)
print(f"Model loaded. Starting {len(PHILLY_FEEDS)} feed streams...")


def get_ffmpeg_stream(feed_id):
    url = f"http://{USERNAME}:{PASSWORD}@audio.broadcastify.com/{feed_id}.mp3"
    command = [
        "ffmpeg",
        "-reconnect", "1", "-reconnect_streamed", "1", "-reconnect_delay_max", "5",
        "-i", url,
        "-f", "s16le", "-acodec", "pcm_s16le",
        "-ar", str(SAMPLE_RATE), "-ac", "1",
        "-loglevel", "quiet", "-",
    ]
    return subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)


def cleanup_text(text, duration):
    """Apply hallucination filters and cleanup (simplified from radiotranscriber.py)."""
    original = text

    if re.fullmatch(r'[.\s]+', text):
        return None
    stripped = re.sub(r'[\W_]+', '', text).upper()
    if stripped and re.fullmatch(r'(BANG)+', stripped):
        return None

    if duration < 10.0:
        beep_patterns = ["BEEE", "BEEEE", "EEEE", "BEEP", "AAAA", "AAAAA"]
        upper = text.upper()
        if any(p in upper for p in beep_patterns) and len(text) > 10:
            return None

    if re.search(r'([A-Z])\1{10,}', text.upper()):
        return None

    if duration > 0 and len(text.split()) / duration > 8.0:
        return None

    lower = text.lower()
    for phrase in FULL_BLOCK_PHRASES:
        if phrase.lower() in lower:
            return None

    for phrase in CUTOFF_PHRASES:
        idx = lower.find(phrase.lower())
        if idx != -1:
            text = text[:idx].strip()
            break

    return text if text.strip() else None


# ── Transcription workers (2 threads to handle bursts) ──────────────

def _save_wav(path, audio_float32):
    """Save float32 audio array as 16-bit WAV."""
    import wave as _wave
    pcm = (audio_float32 * 32767).astype(np.int16)
    with _wave.open(path, "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(pcm.tobytes())


def _transcribe_variant(variant_audio, worker_id, variant_name):
    """Run Whisper on a single variant's preprocessed audio. Returns (text, whisper_meta) or None."""
    duration = len(variant_audio) / SAMPLE_RATE
    try:
        segments, _info = model.transcribe(
            variant_audio,
            language=LANGUAGE,
            initial_prompt=INITIAL_PROMPT,
            condition_on_previous_text=False,
            temperature=0.0,
            beam_size=BEAM_SIZE,
            patience=1.5,
            suppress_blank=True,
            no_speech_threshold=NO_SPEECH_THRESHOLD,
        )
        segments = list(segments)
        text = " ".join(s.text for s in segments).strip()

        no_speech_prob = max((s.no_speech_prob for s in segments), default=0)
        if no_speech_prob > NO_SPEECH_THRESHOLD:
            return None

        text = cleanup_text(text, duration)
        if not text:
            return None

        whisper_meta = {
            "no_speech_prob": round(no_speech_prob, 4),
            "duration_s": round(duration, 2),
        }
        return text, whisper_meta
    except Exception as e:
        print(f"   [Worker-{worker_id}] Variant '{variant_name}' transcribe error: {e}")
        return None


def transcriber_worker(worker_id):
    print(f"   [Worker-{worker_id}] Transcriber thread started")
    while True:
        try:
            item = transcription_queue.get()
            if item[3] is None:
                break

            feed_id, feed_label, timestamp, raw_pcm = item

            if not PP_ENABLED:
                transcription_queue.task_done()
                continue

            import uuid as _uuid

            # Save raw clip (FFmpeg-only decode) once, shared across variants
            raw_clip_id = _uuid.uuid4().hex[:12]
            try:
                _save_wav(os.path.join(RAW_CLIPS_FOLDER, f"{raw_clip_id}.wav"), raw_pcm)
            except Exception as e:
                print(f"   [Worker-{worker_id}] Raw clip save error: {e}")
                raw_clip_id = None

            variants_list = []
            standard_text = None

            for vcfg in (PIPELINE_VARIANTS if PIPELINE_VARIANTS else []):
                processed, meta = preprocess_audio(raw_pcm, vcfg)

                result = _transcribe_variant(processed, worker_id, vcfg.name)
                if result is None:
                    continue

                text, whisper_meta = result

                clip_id = _uuid.uuid4().hex[:12]
                try:
                    _save_wav(os.path.join(AUDIO_CLIPS_FOLDER, f"{clip_id}.wav"), processed)
                except Exception as e:
                    print(f"   [Worker-{worker_id}] Variant '{vcfg.name}' clip save error: {e}")
                    clip_id = None

                variants_list.append({
                    "name": vcfg.name,
                    "audio_clip": clip_id,
                    "transcript": text,
                    "preprocess_meta": meta,
                    "whisper_meta": whisper_meta,
                })

                if vcfg.name == "standard":
                    standard_text = text

            if not variants_list:
                transcription_queue.task_done()
                continue

            if standard_text is None:
                standard_text = variants_list[0]["transcript"]

            output = f"[{timestamp}] [{feed_label}] {len(variants_list)} variants — {standard_text[:80]}"
            print(output)

            log_date = datetime.date.today()
            log_file = os.path.join(OUTPUT_FOLDER, f"philly_multi_{log_date}.log")
            with open(log_file, "a", encoding="utf-8") as f:
                f.write(output + "\n")

            _pp_post(
                PP_BRIDGE_URL, standard_text, timestamp,
                feed_id=feed_id,
                raw_audio_clip=raw_clip_id,
                variants=variants_list,
            )

            transcription_queue.task_done()
        except Exception as e:
            print(f"   [Worker-{worker_id}] Error: {e}")


# ── Per-feed audio capture thread ───────────────────────────────────

def feed_capture_thread(feed_id, feed_label):
    """Captures raw audio from one Broadcastify feed.

    Uses a lightweight VAD pass to detect speech boundaries, then queues
    the *raw* PCM (post-ffmpeg only — no high-pass, no normalization) for
    the transcriber workers to preprocess via all pipeline variants.
    """
    print(f"   [{feed_label}] Connecting to feed {feed_id}...")

    vad = webrtcvad.Vad(VAD_AGGRESSIVENESS)

    ffmpeg = get_ffmpeg_stream(feed_id)
    silence_limit_chunks = int(SILENCE_LIMIT * SAMPLE_RATE * 2 / CHUNK_BYTES)

    audio_buffer = []
    is_recording = False
    silence_counter = 0
    reconnect_count = 0

    print(f"   [{feed_label}] Stream connected")

    while True:
        try:
            ready, _, _ = select.select([ffmpeg.stdout], [], [], 1.0)
            if not ready:
                if ffmpeg.poll() is not None:
                    reconnect_count += 1
                    if reconnect_count > 20:
                        print(f"   [{feed_label}] Too many reconnects, giving up")
                        return
                    print(f"   [{feed_label}] ffmpeg died, reconnecting ({reconnect_count})...")
                    ffmpeg.kill()
                    time.sleep(2)
                    ffmpeg = get_ffmpeg_stream(feed_id)
                continue

            raw_bytes = ffmpeg.stdout.read(CHUNK_BYTES)
            if not raw_bytes:
                print(f"   [{feed_label}] EOF, reconnecting...")
                ffmpeg.kill()
                time.sleep(2)
                ffmpeg = get_ffmpeg_stream(feed_id)
                continue

            reconnect_count = 0
            audio_chunk = np.frombuffer(raw_bytes, dtype=np.int16).astype(np.float32) / 32768.0

            # Lightweight VAD just for boundary detection
            audio_int16 = (audio_chunk * 32767).astype(np.int16)
            is_speech = False
            for i in range(0, len(audio_int16), VAD_FRAME_BYTES // 2):
                frame = audio_int16[i : i + VAD_FRAME_BYTES // 2].tobytes()
                if len(frame) == VAD_FRAME_BYTES:
                    if vad.is_speech(frame, SAMPLE_RATE):
                        is_speech = True
                        break

            if is_speech:
                if not is_recording:
                    is_recording = True
                audio_buffer.append(audio_chunk)
                silence_counter = 0
            elif is_recording:
                audio_buffer.append(audio_chunk)
                silence_counter += 1

                if silence_counter >= silence_limit_chunks:
                    raw_pcm = np.concatenate(audio_buffer).astype(np.float32)
                    duration = len(raw_pcm) / SAMPLE_RATE

                    if duration >= MIN_SPEECH_SECONDS:
                        ts = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
                        transcription_queue.put((feed_id, feed_label, ts, raw_pcm.copy()))

                    audio_buffer = []
                    is_recording = False
                    silence_counter = 0

        except Exception as e:
            print(f"   [{feed_label}] Capture error: {e}")
            time.sleep(1)


# ── Main ────────────────────────────────────────────────────────────

def main():
    num_workers = min(3, max(1, os.cpu_count() or 2))
    print(f"Starting {num_workers} transcription workers + {len(PHILLY_FEEDS)} feed threads")

    if PP_ENABLED:
        print(f"PhillyPulse bridge enabled → {PP_BRIDGE_URL}")

    workers = []
    for i in range(num_workers):
        w = threading.Thread(target=transcriber_worker, args=(i,), daemon=True)
        w.start()
        workers.append(w)

    feed_threads = []
    for feed in PHILLY_FEEDS:
        t = threading.Thread(
            target=feed_capture_thread,
            args=(feed["feed_id"], feed["label"]),
            daemon=True,
        )
        t.start()
        feed_threads.append(t)
        time.sleep(0.5)  # stagger connections to avoid burst

    print(f"\n{'='*60}")
    print(f"  PhillyPulse Multi-Feed Transcriber")
    print(f"  {len(PHILLY_FEEDS)} feeds → {num_workers} Whisper workers → 1 ingest endpoint")
    print(f"  Queue depth shown every 30s. Press Ctrl+C to stop.")
    print(f"{'='*60}\n")

    try:
        chunk_count = 0
        while True:
            time.sleep(30)
            chunk_count += 1
            alive = sum(1 for t in feed_threads if t.is_alive())
            qsize = transcription_queue.qsize()
            print(
                f"   [Status] feeds={alive}/{len(PHILLY_FEEDS)} "
                f"queue={qsize} "
                f"uptime={chunk_count * 30 // 60}m"
            )
            if chunk_count % 10 == 0:
                gc.collect()
    except KeyboardInterrupt:
        print("\nShutting down...")
        for _ in workers:
            transcription_queue.put(("", "", "", None))  # sentinel
        for w in workers:
            w.join(timeout=5)
        print("Done.")


if __name__ == "__main__":
    main()
