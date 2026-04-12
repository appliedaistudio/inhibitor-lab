"""Backfill Broadcastify archives.

Downloads 30-minute MP3 archive segments, transcribes with Whisper,
and POSTs to the ingest API.

Processes most recent days first so you get recent data quickly.

Usage:
    python backfill_archives.py --days 30 --feed 4603
    python backfill_archives.py --day-list days.txt --feed 4603

Requires:
    - config.yaml with Broadcastify credentials
    - faster-whisper, requests, numpy, scipy
    - The FastAPI server running (for /api/ingest)
"""

from __future__ import annotations

import argparse
import datetime
import json
import os
import re
import subprocess
import tempfile
import time
import uuid
import wave

import numpy as np
import requests
import yaml
from faster_whisper import WhisperModel
from philly_pulse.preprocess import PIPELINE_VARIANTS, preprocess_audio

# ── Config ──────────────────────────────────────────────────────────

with open("config.yaml", "r", encoding="utf-8") as f:
    config = yaml.safe_load(f)

USERNAME = config["credentials"]["username"]
PASSWORD = config["credentials"]["password"]

MODEL_SIZE = config["tuning"].get("model_size", "base")
LANGUAGE = config["tuning"]["language"]
INITIAL_PROMPT = config["tuning"]["initial_prompt"]
BEAM_SIZE = config["tuning"].get("beam_size", 5)
NO_SPEECH_THRESHOLD = config["tuning"]["no_speech_threshold"]
FULL_BLOCK_PHRASES = config["post_generation_cleanup"]["full_block_phrases"]
CUTOFF_PHRASES = config["post_generation_cleanup"]["cutoff_phrases"]

PP_CFG = config.get("philly_pulse", {})
BRIDGE_URL = PP_CFG.get("bridge_url", "http://127.0.0.1:8765/api/ingest")

SAMPLE_RATE = 16000
AUDIO_CLIPS_FOLDER = "audio_clips/"
RAW_CLIPS_FOLDER = "audio_clips_raw/"
os.makedirs(AUDIO_CLIPS_FOLDER, exist_ok=True)
os.makedirs(RAW_CLIPS_FOLDER, exist_ok=True)

PROGRESS_DIR = "backfill_progress"
os.makedirs(PROGRESS_DIR, exist_ok=True)

DOWNLOAD_DELAY = 1.5
RETRY_DELAYS = [30, 60, 120]

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
]


# ── Progress tracking (per-feed, per-segment) ────────────────────

def _progress_path(feed_id: str) -> str:
    return os.path.join(PROGRESS_DIR, f"{feed_id}.json")


def load_progress(feed_id: str) -> dict:
    path = _progress_path(feed_id)
    if os.path.exists(path):
        with open(path, "r") as f:
            return json.load(f)
    return {}


def save_progress(feed_id: str, progress: dict):
    path = _progress_path(feed_id)
    with open(path, "w") as f:
        json.dump(progress, f, indent=2)


# ── Text cleanup ─────────────────────────────────────────────────

def cleanup_text(text: str, duration: float) -> str | None:
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


# ── Broadcastify session ─────────────────────────────────────────

def get_broadcastify_session() -> requests.Session:
    """Login to Broadcastify and return an authenticated session."""
    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    })

    login_url = "https://www.broadcastify.com/login/"
    session.get(login_url)

    login_data = {
        "username": USERNAME,
        "password": PASSWORD,
        "action": "auth",
        "redirect": "https://www.broadcastify.com",
    }
    resp = session.post(login_url, data=login_data, allow_redirects=True)
    resp.raise_for_status()

    if "bcfyuser1" not in session.cookies.get_dict():
        print("[WARN] Login may have failed — no auth cookie set")

    return session


# ── Broadcastify API with retry ──────────────────────────────────

def fetch_archive_links(session: requests.Session, feed_id: str, day: str) -> list[dict]:
    """Fetch archive segments for a feed on a given day, with retry on 429."""
    api_url = f"https://www.broadcastify.com/archives/api/archives.php?feedId={feed_id}&date={day}"

    for attempt in range(1 + len(RETRY_DELAYS)):
        try:
            resp = session.get(api_url, timeout=30)
            if resp.status_code == 429:
                if attempt < len(RETRY_DELAYS):
                    wait = RETRY_DELAYS[attempt]
                    print(f"  [429 rate-limited on archive list] Waiting {wait}s (attempt {attempt+1})...")
                    time.sleep(wait)
                    continue
                print(f"  [429] Giving up on archive list after {len(RETRY_DELAYS)} retries")
                return []
            if resp.status_code != 200:
                return []
            data = resp.json()
        except Exception as e:
            print(f"  [ARCHIVE LIST ERROR] {e}")
            if attempt < len(RETRY_DELAYS):
                time.sleep(RETRY_DELAYS[attempt])
                continue
            return []
        break

    archives = []
    for item in data.get("archives", []):
        aid = item.get("id", "")
        dl_url = f"https://www.broadcastify.com/archives/download/{aid}"
        time_label = item.get("start", "00:00")
        archives.append({
            "url": dl_url,
            "time_label": time_label,
            "startTs": item.get("startTs", 0),
            "id": aid,
        })

    return archives


def download_mp3(session: requests.Session, url: str, dest_path: str) -> bool:
    """Download an archive MP3 with retry on 429."""
    for attempt in range(1 + len(RETRY_DELAYS)):
        try:
            resp = session.get(url, stream=True, timeout=120)
            if resp.status_code == 429:
                if attempt < len(RETRY_DELAYS):
                    wait = RETRY_DELAYS[attempt]
                    print(f"[429] Waiting {wait}s...", end=" ", flush=True)
                    time.sleep(wait)
                    continue
                print("[429] Giving up after retries")
                return False
            resp.raise_for_status()
            with open(dest_path, "wb") as f:
                for chunk in resp.iter_content(chunk_size=8192):
                    f.write(chunk)
            return True
        except requests.exceptions.HTTPError as e:
            if "429" in str(e) and attempt < len(RETRY_DELAYS):
                wait = RETRY_DELAYS[attempt]
                print(f"[429] Waiting {wait}s...", end=" ", flush=True)
                time.sleep(wait)
                continue
            print(f"[DL ERROR] {e}")
            return False
        except Exception as e:
            print(f"[DL ERROR] {e}")
            return False
    return False


# ── Audio conversion ─────────────────────────────────────────────

def mp3_to_pcm(mp3_path: str) -> np.ndarray | None:
    """Convert MP3 to 16kHz mono float32 PCM using ffmpeg."""
    try:
        result = subprocess.run(
            [
                "ffmpeg", "-i", mp3_path,
                "-f", "s16le", "-acodec", "pcm_s16le",
                "-ar", str(SAMPLE_RATE), "-ac", "1",
                "-loglevel", "quiet", "-",
            ],
            capture_output=True,
            timeout=300,
        )
        if result.returncode != 0:
            return None
        pcm_data = np.frombuffer(result.stdout, dtype=np.int16).astype(np.float32) / 32768.0
        return pcm_data if len(pcm_data) > SAMPLE_RATE else None
    except Exception as e:
        print(f"    [FFMPEG ERROR] {e}")
        return None


def _save_wav(path: str, audio_f32: np.ndarray):
    pcm = (audio_f32 * 32767).astype(np.int16)
    with wave.open(path, "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(pcm.tobytes())


# ── Transcription + ingest ───────────────────────────────────────

def transcribe_and_post(
    model: WhisperModel,
    audio_data: np.ndarray,
    feed_id: str,
    feed_label: str,
    archive_timestamp: str,
):
    """Run preprocessing, transcribe, and POST to ingest."""
    chunk_seconds = 60
    chunk_samples = chunk_seconds * SAMPLE_RATE
    chunks = []
    if len(audio_data) > chunk_samples * 2:
        for i in range(0, len(audio_data), chunk_samples):
            chunk = audio_data[i : i + chunk_samples]
            if len(chunk) > SAMPLE_RATE:
                chunks.append(chunk)
    else:
        chunks = [audio_data]

    transcribed = 0
    for ci, chunk in enumerate(chunks):
        try:
            raw_clip_id = uuid.uuid4().hex[:12]
            try:
                _save_wav(os.path.join(RAW_CLIPS_FOLDER, f"{raw_clip_id}.wav"), chunk)
            except Exception as e:
                print(f"    [RAW CLIP ERROR] {e}")
                raw_clip_id = None

            variants_list = []
            standard_text = None

            for vcfg in PIPELINE_VARIANTS:
                processed, meta = preprocess_audio(chunk, vcfg)
                duration = len(processed) / SAMPLE_RATE

                try:
                    segments, _info = model.transcribe(
                        processed,
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
                        continue

                    text = cleanup_text(text, duration)
                    if not text:
                        continue

                    clip_id = uuid.uuid4().hex[:12]
                    try:
                        _save_wav(os.path.join(AUDIO_CLIPS_FOLDER, f"{clip_id}.wav"), processed)
                    except Exception as e:
                        print(f"    [CLIP ERROR {vcfg.name}] {e}")
                        clip_id = None

                    variants_list.append({
                        "name": vcfg.name,
                        "audio_clip": clip_id,
                        "transcript": text,
                        "preprocess_meta": meta,
                        "whisper_meta": {
                            "no_speech_prob": round(no_speech_prob, 4),
                            "duration_s": round(duration, 2),
                        },
                    })

                    if vcfg.name == "aggressive":
                        standard_text = text

                except Exception as e:
                    print(f"    [VARIANT {vcfg.name} ERROR chunk {ci}] {e}")

            if not variants_list:
                continue

            if standard_text is None:
                standard_text = variants_list[0]["transcript"]

            payload: dict = {
                "text": standard_text,
                "timestamp": archive_timestamp,
                "feed_id": feed_id,
                "raw_audio_clip": raw_clip_id,
                "variants": variants_list,
            }

            try:
                resp = requests.post(BRIDGE_URL, json=payload, timeout=30)
                if resp.status_code == 200:
                    transcribed += 1
                else:
                    print(f"    [INGEST {resp.status_code}] {resp.text[:100]}")
            except Exception as e:
                print(f"    [INGEST ERROR] {e}")

        except Exception as e:
            print(f"    [CHUNK ERROR {ci}] {e}")

    return transcribed


# ── Day list helpers ─────────────────────────────────────────────

def load_day_list(path: str) -> list[str]:
    """Read a file of YYYY-MM-DD dates, one per line."""
    with open(path, "r") as f:
        return [line.strip() for line in f if line.strip() and not line.startswith("#")]


def generate_days_range(days: int) -> list[str]:
    """Generate a contiguous list of the last N days (most recent first)."""
    today = datetime.date.today()
    return [(today - datetime.timedelta(days=d)).isoformat() for d in range(1, days + 1)]


# ── Main ─────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Backfill Broadcastify archives")
    parser.add_argument("--days", type=int, default=None, help="How many days back to go")
    parser.add_argument("--day-list", type=str, default=None, help="File with specific dates to process (one YYYY-MM-DD per line)")
    parser.add_argument("--feed", type=str, default=None, help="Single feed ID to process")
    parser.add_argument("--skip-existing", action="store_true", default=True, help="Skip already-processed feed+day combos")
    args = parser.parse_args()

    if args.day_list:
        day_strings = load_day_list(args.day_list)
        print(f"Loaded {len(day_strings)} dates from {args.day_list}")
    elif args.days:
        day_strings = generate_days_range(args.days)
    else:
        day_strings = generate_days_range(180)

    feeds = PHILLY_FEEDS
    if args.feed:
        feeds = [f for f in feeds if f["feed_id"] == args.feed]
        if not feeds:
            print(f"Unknown feed ID: {args.feed}")
            return

    print(f"=== PhillyPulse Archive Backfill ===")
    print(f"Feeds: {len(feeds)}, Days: {len(day_strings)}, Bridge: {BRIDGE_URL}")
    print(f"Loading Whisper model '{MODEL_SIZE}'...")

    try:
        import ctranslate2
        cuda_ok = "float16" in ctranslate2.get_supported_compute_types("cuda")
    except Exception:
        cuda_ok = False

    if cuda_ok:
        model = WhisperModel(MODEL_SIZE, device="cuda", compute_type="float16")
        print("  (GPU mode: CUDA float16)")
    else:
        model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8", cpu_threads=4)
        print("  (CPU mode: int8)")
    print("Model loaded.")

    print("Logging into Broadcastify...")
    session = get_broadcastify_session()
    print("Logged in.")

    total_transcribed = 0
    total_archives = 0

    for feed in feeds:
        feed_id = feed["feed_id"]
        feed_label = feed["label"]
        progress = load_progress(feed_id)

        for day_str in day_strings:
            if args.skip_existing and progress.get(day_str):
                continue

            print(f"\n[{day_str}] [{feed_label}] Fetching archives...")
            archives = fetch_archive_links(session, feed_id, day_str)

            if not archives:
                print(f"  No archives available.")
                progress[day_str] = "no_archives"
                save_progress(feed_id, progress)
                continue

            # Track per-segment progress for mid-day resume
            day_progress = progress.get(day_str, {})
            if isinstance(day_progress, str):
                # Already fully done from a previous run format
                continue
            done_segments: set = set(day_progress.get("done_segments", []))

            print(f"  Found {len(archives)} segments ({len(done_segments)} already done).")
            day_transcribed = 0

            for ai, archive in enumerate(archives):
                seg_id = archive.get("id", str(ai))
                if seg_id in done_segments:
                    continue

                archive_url = archive["url"]
                time_label = archive["time_label"]
                start_ts = archive.get("startTs", 0)
                if start_ts:
                    archive_ts = datetime.datetime.fromtimestamp(start_ts, tz=datetime.timezone.utc).isoformat()
                elif re.match(r'\d{2}:\d{2}', time_label):
                    archive_ts = f"{day_str}T{time_label}"
                else:
                    archive_ts = f"{day_str}T00:00:00"

                with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
                    tmp_path = tmp.name

                try:
                    print(f"  [{ai+1}/{len(archives)}] Downloading {time_label}...", end=" ", flush=True)
                    if not download_mp3(session, archive_url, tmp_path):
                        continue

                    audio = mp3_to_pcm(tmp_path)
                    if audio is None:
                        print("(empty/error)")
                        continue

                    duration_min = len(audio) / SAMPLE_RATE / 60
                    print(f"({duration_min:.1f}min)", end=" ", flush=True)

                    count = transcribe_and_post(model, audio, feed_id, feed_label, archive_ts)
                    day_transcribed += count
                    total_transcribed += count
                    total_archives += 1
                    print(f"-> {count} transcripts")

                    done_segments.add(seg_id)
                    progress[day_str] = {"done_segments": list(done_segments), "transcripts": day_transcribed}
                    save_progress(feed_id, progress)

                finally:
                    if os.path.exists(tmp_path):
                        os.unlink(tmp_path)

                time.sleep(DOWNLOAD_DELAY)

            progress[day_str] = f"done_{day_transcribed}"
            save_progress(feed_id, progress)
            print(f"  --- Day {day_str} [{feed_label}]: {day_transcribed} transcripts ---")

        print(f"\n=== Feed {feed_label} complete ===")

    print(f"\n=== Backfill complete ===")
    print(f"Total: {total_transcribed} transcripts from {total_archives} archive segments")


if __name__ == "__main__":
    main()
