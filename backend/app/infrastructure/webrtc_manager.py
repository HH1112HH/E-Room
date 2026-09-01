"""WebRTC Manager — abstraction over LiveKit DataChannel + legacy WebSocket fallback.

This module is the core of the WebSocket -> WebRTC migration.
It provides:
- Unified broadcast (LiveKit publish_data + WebSocket room_connections + Redis)
- Audio buffer handling for both transports
- Signaling helpers (offer/answer/ICE relay via Redis / in-memory)

Frontend should prefer LiveKit DataChannel (Room.publishData / room.on('dataReceived')).
Backend pushes via LiveKit Server API (livekit.publish_data) with fallback to
WebSocket so older clients still receive events during migration.
"""

from __future__ import annotations

import asyncio
import json
from typing import Any

from app.log import get_logger

logger = get_logger(__name__)


class WebRTCManager:
    def __init__(self) -> None:
        # In-memory signaling store: room_id -> {user_id: {offer, answer, candidates}}
        self._signals: dict[str, dict[str, Any]] = {}

    # ------------------------------------------------------------------
    # Broadcast — primary primitive for server -> clients
    # ------------------------------------------------------------------
    async def broadcast(
        self,
        room_id: str,
        payload: dict[str, Any],
        livekit_room_name: str | None = None,
        topic: str | None = None,
        exclude_ws: Any | None = None,
    ) -> int:
        """Broadcast JSON payload to a room via all transports.

        1) LiveKit DataChannel (WebRTC) via Server API
        2) Legacy WebSocket room_connections (fallback)
        3) Redis PubSub (for horizontal scaling, if available)
        Returns number of local WebSocket clients notified (for metrics).
        """
        # Lazy imports to avoid circular deps
        delivered = 0
        # 1) LiveKit WebRTC publish (if we know livekit_room_name)
        if livekit_room_name:
            try:
                from app.infrastructure.livekit import LiveKitService

                svc = LiveKitService()
                # fire-and-forget async publish; also try sync fallback internally
                await svc.publish_data(livekit_room_name, payload, topic=topic)
            except Exception as e:
                logger.debug("webrtc broadcast livekit publish failed", extra={"room_id": room_id, "error": str(e)})

        # 2) Legacy WebSocket fallback — ensures old clients still get events
        try:
            from app.api.routers.websocket import room_connections

            conns = list(room_connections.get(room_id, set()))
            for ws in conns:
                if ws is exclude_ws:
                    continue
                try:
                    # schedule send without awaiting to avoid blocking broadcast
                    asyncio.create_task(ws.send_text(json.dumps(payload, default=str)))
                    delivered += 1
                except Exception:
                    pass
        except Exception:
            pass

        # 3) Redis publish for cross-instance sync (optional)
        try:
            from app.infrastructure.redis_client import get_redis_client

            client = get_redis_client()
            # Publish to a webrtc-specific channel; consumers can relay to LiveKit
            channel = f"webrtc:room:{room_id}"
            client.publish(channel, json.dumps(payload, default=str))
        except Exception:
            pass

        logger.debug(
            "webrtc broadcast",
            extra={"room_id": room_id, "type": payload.get("type"), "ws_delivered": delivered, "livekit_room": livekit_room_name},
        )
        return delivered

    def broadcast_sync(
        self,
        room_id: str,
        payload: dict[str, Any],
        livekit_room_name: str | None = None,
        topic: str | None = None,
    ) -> int:
        """Sync wrapper — creates task if event loop running."""
        try:
            loop = asyncio.get_running_loop()
            if loop.is_running():
                loop.create_task(self.broadcast(room_id, payload, livekit_room_name, topic))
                return 0
        except RuntimeError:
            pass
        # No loop — try to run directly (e.g., sync context)
        try:
            asyncio.run(self.broadcast(room_id, payload, livekit_room_name, topic))
        except Exception:
            pass
        return 0

    # ------------------------------------------------------------------
    # Signaling — store & relay SDP / ICE
    # ------------------------------------------------------------------
    def store_offer(self, room_id: str, user_id: str, sdp: str, sdp_type: str = "offer") -> None:
        self._signals.setdefault(room_id, {})[f"{user_id}:{sdp_type}"] = sdp
        logger.info("webrtc signal stored", extra={"room_id": room_id, "user_id": user_id, "type": sdp_type})

    def get_offer(self, room_id: str, user_id: str) -> str | None:
        return self._signals.get(room_id, {}).get(f"{user_id}:offer")

    def store_ice(self, room_id: str, user_id: str, candidate: dict) -> None:
        lst = self._signals.setdefault(room_id, {}).setdefault(f"{user_id}:ice", [])
        lst.append(candidate)

    def get_ice(self, room_id: str, user_id: str) -> list[dict]:
        return self._signals.get(room_id, {}).get(f"{user_id}:ice", [])

    def clear_room(self, room_id: str) -> None:
        self._signals.pop(room_id, None)


webrtc_manager = WebRTCManager()
