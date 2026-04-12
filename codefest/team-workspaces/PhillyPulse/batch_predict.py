"""Batch-run LLM predictions on all raw extractions via the local API."""
import firebase_admin
from firebase_admin import credentials, firestore
import requests
import time

cred = credentials.Certificate(".secrets/firebase-service-account.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

API = "http://127.0.0.1:8765"
exts = list(db.collection("extractions").limit(5000).get())
raw = [doc for doc in exts if not doc.to_dict().get("llm_category") and doc.to_dict().get("llm_confidence", 0) == 0]

print(f"Batch-running predictions on {len(raw)} extractions...")
success = 0
relevant = 0
errors = 0

for i, doc in enumerate(raw):
    try:
        resp = requests.post(f"{API}/api/admin/predict", json={"extraction_id": doc.id}, timeout=30)
        data = resp.json()
        if resp.status_code == 200:
            success += 1
            if data.get("llm_relevant"):
                relevant += 1
        else:
            errors += 1
            if errors <= 3:
                print(f"  Error {resp.status_code}: {resp.text[:100]}")
    except Exception as e:
        errors += 1
        if errors <= 3:
            print(f"  Exception: {e}")

    if (i + 1) % 50 == 0:
        print(f"  [{i+1}/{len(raw)}] success={success} relevant={relevant} errors={errors}")

print(f"\nDone: {success}/{len(raw)} predicted, {relevant} relevant, {errors} errors")
