import asyncio
import time
import uuid
from pathlib import Path
from typing import Any
from app.logger import EventLogger
from app.vision import analyze_frame

try:
    from djitellopy import Tello
    import cv2
    _HAS_TELLO = True
except ImportError:
    _HAS_TELLO = False


class DroneController:
    """Thin wrapper around djitellopy for the Building Health Scan feature.

    Flight plan (tuned for indoor cardboard prop demo — safe and boring):
        takeoff → up 30cm → forward 80cm → yaw 360 capturing frames → land

    Each captured frame is sent to the vision model. Detections are compiled
    into an evidence package that the agent then passes through Inhibitor
    before the user sees any claim.

    If no drone is physically connected, falls back to a simulated scan so
    the whole pipeline can be developed and demoed without hardware.
    """

    def __init__(self, logger: EventLogger):
        self.logger = logger
        self.tello: Any = None
        self.connected = False

    def connect(self) -> bool:
        if not _HAS_TELLO:
            self.logger.log_event("drone.simulated", reason="djitellopy not installed")
            return False
        try:
            self.tello = Tello()
            self.tello.connect()
            self.tello.streamon()
            self.connected = True
            battery = self.tello.get_battery()
            self.logger.log_event("drone.connected", battery=battery)
            return True
        except Exception as e:
            self.logger.log_event("drone.connect_failed", error=str(e))
            return False

    async def scan_building(
        self,
        address: str | None = None,
        session_id: str | None = None,
    ) -> dict:
        session_id = session_id or str(uuid.uuid4())
        scan_id = f"scan-{int(time.time())}"

        if not self.connected:
            self.connect()

        if not self.connected:
            return await self._simulated_scan(address, session_id, scan_id)

        self.logger.log_event("scan.start", session_id=session_id, scan_id=scan_id, address=address)
        frames: list[Any] = []
        try:
            self.tello.takeoff()
            await asyncio.sleep(1)
            self.tello.move_up(30)
            await asyncio.sleep(0.5)
            self.tello.move_forward(80)
            await asyncio.sleep(0.5)
            reader = self.tello.get_frame_read()
            for angle in (0, 90, 180, 270):
                self.tello.rotate_clockwise(90 if angle > 0 else 0)
                await asyncio.sleep(0.8)
                frame = reader.frame
                if frame is not None:
                    frames.append(frame.copy())
            self.tello.land()
        except Exception as e:
            self.logger.log_event("scan.error", session_id=session_id, error=str(e))
            try:
                self.tello.emergency()
            except Exception:
                pass
            raise

        findings = []
        for i, frame in enumerate(frames):
            path = Path(f"backend/logs/evidence/{scan_id}-{i}.jpg")
            path.parent.mkdir(parents=True, exist_ok=True)
            cv2.imwrite(str(path), frame)
            detections = await analyze_frame(path)
            findings.extend(detections)

        evidence = {
            "session_id": session_id,
            "scan_id": scan_id,
            "address": address,
            "ts": time.time(),
            "frame_count": len(frames),
            "findings": findings,
        }
        self.logger.log_event("scan.complete", session_id=session_id, scan_id=scan_id, finding_count=len(findings))
        return evidence

    async def _simulated_scan(self, address, session_id, scan_id) -> dict:
        """Fallback for dev when no drone is plugged in."""
        self.logger.log_event("scan.simulated", session_id=session_id, scan_id=scan_id)
        await asyncio.sleep(2)
        return {
            "session_id": session_id,
            "scan_id": scan_id,
            "address": address or "123 Example St, Philadelphia",
            "ts": time.time(),
            "frame_count": 0,
            "simulated": True,
            "findings": [
                {
                    "category": "structural",
                    "claim": "Fire escape appears structurally compromised.",
                    "confidence": 0.78,
                    "timestamp": time.time(),
                    "frame": "simulated",
                },
                {
                    "category": "exterior",
                    "claim": "Visible water damage along upper wall.",
                    "confidence": 0.65,
                    "timestamp": time.time(),
                    "frame": "simulated",
                },
            ],
        }
