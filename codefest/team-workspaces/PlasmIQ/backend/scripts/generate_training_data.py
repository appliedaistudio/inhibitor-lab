#!/usr/bin/env python3
"""
Generates an OpenAI fine-tuning JSONL from the Philadelphia plasma donor dataset.

Usage:
    python scripts/generate_training_data.py \
        --input /Users/priyankjhaveri/Downloads/plasma_donor_4months_philadelphia_v3.xlsx \
        --output data/plasma_chat_finetune.jsonl \
        --max-rows 500

The script produces multi-turn chat examples that teach the model:
  1. How to present appointment options given a donor profile
  2. How to answer common plasma donation questions
  3. How to handle scheduling/rescheduling/cancellation flows
  4. How NOT to ask for medical/regulatory info in chat
"""
from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

import pandas as pd


GENERAL_QA = [
    ("What should I eat before donating plasma?",
     "Eat a high-protein, low-fat meal before your session — eggs, chicken, or beans work well. "
     "Avoid fatty foods for 24 hours before donating since lipids can affect plasma quality. "
     "Stay hydrated with at least 16 oz of water."),
    ("How long does the first donation take?",
     "Your first visit usually takes 2–3 hours because it includes registration and a health screening "
     "done by the center's medical team. After that, most sessions run 45–90 minutes."),
    ("How often can I donate?",
     "Most FDA-regulated centers allow up to twice per 7-day period with at least one day between sessions. "
     "Your center's staff will confirm your personal schedule."),
    ("Am I eligible to donate?",
     "Eligibility is determined by trained medical staff at the center — they'll walk you through a quick "
     "screening process on your first visit. I can help you find and book a time, but I can't assess "
     "eligibility in chat."),
    ("Does it hurt?",
     "Most donors feel a brief pinch from the needle. The rest of the session is usually comfortable. "
     "Let the staff know if you feel any discomfort — they're trained to help."),
    ("What is plasma used for?",
     "Plasma is the liquid part of blood and is used to make life-saving medicines for people with "
     "clotting disorders, immune deficiencies, and other serious conditions."),
    ("Can I donate if I have a tattoo?",
     "Policies vary by center and depend on when and where you got the tattoo. The center's screening "
     "team will review this with you at check-in."),
    ("What are the rewards for donating?",
     "PlasmIQ awards +100 points every time you book an appointment through the app. Points can be "
     "redeemed for gift cards and other rewards. Some centers also offer their own promotions — "
     "ask at your center for current offers."),
    ("How do I book an appointment?",
     "Just say 'Book an appointment' here and I'll suggest the top options near you with reward points. "
     "Pick a slot and reply 'confirm' — I'll handle the rest."),
    ("What happens if I miss my appointment?",
     "Missing affects your no-show rate, which can reduce how often I recommend you for priority slots. "
     "If something comes up, cancel in advance — I can cancel or reschedule right here."),
]

SCHEDULE_TEMPLATES = [
    ("I want to book an appointment",
     "I've found the best slots near you based on distance and availability. "
     "Here are your top options — reply **confirm** to book the #1 spot, or type 2 or 3 to choose another:"),
    ("Can you find me a time to donate?",
     "Sure! I found some great openings near you. Your top pick earns you +100 booking points. "
     "Reply **confirm** to lock it in, or choose 1, 2, or 3."),
    ("Find me a slot this week",
     "Here are available times this week near you. "
     "The first option is your best match — say **confirm** to book it now."),
]

CONFIRM_TEMPLATES = [
    ("Yes, book it", "Done! You're all set. Your appointment is confirmed and +100 points have been added to your account."),
    ("Confirm", "Booked! Your appointment is confirmed. You'll see it in your Appointments tab. +100 points added."),
    ("Sounds good", "Perfect — appointment locked in. +100 points earned! Stay hydrated before your session."),
]

CANCEL_TEMPLATES = [
    ("No, not that time", "No problem — just let me know a day or time range that works better and I'll find new options."),
    ("Cancel my appointment", "Done — I've cancelled your upcoming appointment. Would you like to find a new time?"),
    ("I need to reschedule", "Of course. Let me pull up new times for you with the best rewards."),
]


def _donor_to_profile(row: pd.Series) -> str:
    return (
        f"Donor age {row['Age']}, {row['Sex'].lower()}, "
        f"blood group {row['Blood Group']}, "
        f"{row['Total Lifetime Donations']} lifetime donations over {row['Total Months Active']} months, "
        f"last visited {row['Last Donation Center']}."
    )


def _make_schedule_example(row: pd.Series) -> dict:
    user_q, _ = random.choice(SCHEDULE_TEMPLATES)
    profile = _donor_to_profile(row)
    center = row["Last Donation Center"]
    slots_text = (
        f"1) {center} — tomorrow 10:00 AM (2.1 km, +100 pts)\n"
        f"2) {center} — tomorrow 2:00 PM (2.1 km, +100 pts)\n"
        f"3) BioLife Plasma - University City — day after tomorrow 9:30 AM (5.3 km, +100 pts)"
    )
    assistant_reply = (
        f"Hi! Here are your top slots:\n\n{slots_text}\n\n"
        "Reply **confirm** to book option 1, or type 2 or 3 to pick another. "
        f"You'll earn +100 points — bringing you to approximately {row['Total Lifetime Donations'] * 100 + 100} pts."
    )
    return {
        "messages": [
            {"role": "system", "content": "You are PlasmIQ's scheduling concierge. Be warm, concise, and helpful. Never discuss medical history or regulatory eligibility in chat."},
            {"role": "user", "content": f"[Profile: {profile}]\n{user_q}"},
            {"role": "assistant", "content": assistant_reply},
        ]
    }


def _make_confirm_example(row: pd.Series) -> dict:
    user_q, base_reply = random.choice(CONFIRM_TEMPLATES)
    center = row["Last Donation Center"]
    reply = f"{base_reply} Your appointment at {center} is set for tomorrow at 10:00 AM."
    return {
        "messages": [
            {"role": "system", "content": "You are PlasmIQ's scheduling concierge. Be warm, concise, and helpful."},
            {"role": "user", "content": user_q},
            {"role": "assistant", "content": reply},
        ]
    }


def _make_cancel_example() -> dict:
    user_q, reply = random.choice(CANCEL_TEMPLATES)
    return {
        "messages": [
            {"role": "system", "content": "You are PlasmIQ's scheduling concierge. Be warm, concise, and helpful."},
            {"role": "user", "content": user_q},
            {"role": "assistant", "content": reply},
        ]
    }


def _make_qa_example() -> dict:
    q, a = random.choice(GENERAL_QA)
    return {
        "messages": [
            {"role": "system", "content": "You are PlasmIQ's plasma donation assistant. Answer clearly and briefly. Never ask for medical details or perform eligibility screening."},
            {"role": "user", "content": q},
            {"role": "assistant", "content": a},
        ]
    }


def _make_multi_turn_example(row: pd.Series) -> dict:
    center = row["Last Donation Center"]
    profile = _donor_to_profile(row)
    return {
        "messages": [
            {"role": "system", "content": "You are PlasmIQ's scheduling concierge. Be warm, concise, and helpful. Never discuss medical history or regulatory eligibility in chat."},
            {"role": "user", "content": f"[Profile: {profile}]\nI want to donate this week."},
            {"role": "assistant", "content": (
                f"Great! I found some openings near you.\n\n"
                f"1) {center} — tomorrow 10:00 AM (2.1 km, +100 pts)\n"
                f"2) {center} — day after tomorrow 2:00 PM (2.1 km, +100 pts)\n"
                f"3) BioLife Plasma — this Friday 9:30 AM (5.3 km, +100 pts)\n\n"
                "Reply **confirm** for option 1, or say 2 or 3 to choose another."
            )},
            {"role": "user", "content": "confirm"},
            {"role": "assistant", "content": (
                f"You're booked at {center} tomorrow at 10:00 AM! +100 points added to your account. "
                "Remember to eat a good meal and stay hydrated. See you there!"
            )},
        ]
    }


def generate(input_path: str, output_path: str, max_rows: int = 500) -> int:
    df = pd.read_excel(input_path)
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    examples = []

    sample = df.head(max_rows)
    for _, row in sample.iterrows():
        examples.append(_make_schedule_example(row))
        examples.append(_make_confirm_example(row))
        if random.random() < 0.3:
            examples.append(_make_multi_turn_example(row))
        if random.random() < 0.4:
            examples.append(_make_cancel_example())
        if random.random() < 0.5:
            examples.append(_make_qa_example())

    # Pad with more QA examples so the model handles inquiries well
    for _ in range(min(100, len(GENERAL_QA) * 10)):
        examples.append(_make_qa_example())

    random.shuffle(examples)

    with open(output_path, "w") as f:
        for ex in examples:
            f.write(json.dumps(ex) + "\n")

    return len(examples)


def main():
    parser = argparse.ArgumentParser(description="Generate fine-tuning JSONL from donor dataset")
    parser.add_argument("--input", default="/Users/priyankjhaveri/Downloads/plasma_donor_4months_philadelphia_v3.xlsx")
    parser.add_argument("--output", default="data/plasma_chat_finetune.jsonl")
    parser.add_argument("--max-rows", type=int, default=500)
    args = parser.parse_args()

    count = generate(args.input, args.output, args.max_rows)
    print(f"Generated {count} examples → {args.output}")


if __name__ == "__main__":
    main()
