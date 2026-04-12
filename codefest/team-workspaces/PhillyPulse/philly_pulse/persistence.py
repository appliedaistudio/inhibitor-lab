"""Select SQLite or Firestore backend via PHILLY_PULSE_STORE and credentials."""

from __future__ import annotations

import os
from pathlib import Path


def _should_use_firestore() -> bool:
    mode = os.environ.get("PHILLY_PULSE_STORE", "auto").lower()
    if mode in ("firestore", "true", "1", "yes"):
        return True
    if mode in ("sqlite", "false", "0", "no"):
        return False
    cred_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    json_str = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
    if json_str:
        return True
    if cred_path and Path(cred_path).is_file():
        return True
    return False


if _should_use_firestore():
    from .firestore_store import (
        delete_incident,
        get_conn,
        get_extraction,
        get_incident,
        incident_count,
        inhibitor_stats,
        insert_extraction,
        insert_incident,
        list_incidents,
        seed_from_json,
        update_extraction,
        update_incident,
    )
else:
    from .store import (
        get_conn,
        get_extraction,
        get_incident,
        incident_count,
        inhibitor_stats,
        insert_extraction,
        insert_incident,
        list_incidents,
        seed_from_json,
        update_extraction,
    )

    def update_incident(incident_id, updates):  # type: ignore[misc]
        raise NotImplementedError("update_incident not supported in SQLite mode")

    def delete_incident(incident_id):  # type: ignore[misc]
        raise NotImplementedError("delete_incident not supported in SQLite mode")
