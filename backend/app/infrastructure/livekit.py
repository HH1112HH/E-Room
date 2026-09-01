from __future__ import annotations

import asyncio
import json
import time

import jwt

from app.config import settings
from app.log import get_logger

logger = get_logger(__name__)


class LiveKitService:
    ALGORITHM = "HS256"
    TOKEN_TTL_SECONDS = 3600

    def __init__(self) -> None:
        self.api_key = settings.livekit_api_key
        self.api_secret = settings.livekit_api_secret
        self.server_url = settings.livekit_url

    # ------------------------------------------------------------------
    # Token helpers (existing)
    # ------------------------------------------------------------------
    def generate_token(
        self,
        room_name: str,
        participant_identity: str,
        participant_name: str = "",
        can_publish: bool = True,
        can_subscribe: bool = True,
        metadata: dict | None = None,
    ) -> str:
        now = int(time.time())
        claims = {
            "exp": now + self.TOKEN_TTL_SECONDS,
            "iat": now,
            "iss": self.api_key,
            "sub": participant_identity,
            "nbf": now,
            "video": {
                "room": room_name,
                "roomJoin": True,
                "canPublish": can_publish,
                "canSubscribe": can_subscribe,
                "canPublishData": True,
            },
        }
        if participant_name:
            claims["name"] = participant_name
        if metadata:
            claims["metadata"] = json.dumps(metadata)

        return jwt.encode(claims, self.api_secret, algorithm=self.ALGORITHM)

    def generate_admin_token(self, room_name: str) -> str:
        now = int(time.time())
        claims = {
            "exp": now + self.TOKEN_TTL_SECONDS,
            "iat": now,
            "iss": self.api_key,
            "sub": f"admin_{room_name}",
            "nbf": now,
            "video": {
                "room": room_name,
                "roomJoin": True,
                "roomAdmin": True,
                "canPublish": True,
                "canSubscribe": True,
                "canPublishData": True,
            },
        }
        return jwt.encode(claims, self.api_secret, algorithm=self.ALGORITHM)

    def verify_webhook_token(self, token: str) -> dict | None:
        try:
            return jwt.decode(token, self.api_secret, algorithms=[self.ALGORITHM])
        except jwt.PyJWTError:
            return None

    # ------------------------------------------------------------------
    # WebRTC helpers — broadcast via LiveKit Server API (HTTP)
    # ------------------------------------------------------------------
    def _http_base(self) -> str:
        url = self.server_url or "ws://localhost:7880"
        # ws://host:7880 -> http://host:7880 ; wss:// -> https://
        if url.startswith("ws://"):
            return "http://" + url[len("ws://") :]
        if url.startswith("wss://"):
            return "https://" + url[len("wss://") :]
        return url

    def _auth_header_for_room(self, room_name: str) -> str:
        token = self.generate_admin_token(room_name)
        return f"Bearer {token}"

    async def publish_data(
        self,
        room_name: str,
        payload: dict,
        topic: str | None = None,
        reliable: bool = True,
    ) -> bool:
        """Publish JSON payload to all participants via LiveKit Data Channel.

        Uses LiveKit RoomService.SendData RPC (Twirp). Falls back gracefully if
        LiveKit is unreachable — caller should also broadcast via legacy
        WebSocket/Redis fallback.
        """
        if not self.api_key or not self.api_secret:
            logger.debug("LiveKit publish_data skipped: missing api_key/secret")
            return False
        try:
            import httpx

            data_bytes = json.dumps(payload, default=str).encode("utf-8")
            # LiveKit SendData expects binary payload; we wrap JSON as utf-8
            body = {
                "room": room_name,
                "data": data_bytes.hex(),  # placeholder — real SDK uses base64/protobuf
            }
            # We use the JSON-over-HTTP approach compatible with livekit-server
            # Twirp endpoint: POST /twirp/livekit.RoomService/SendData
            # Payload is protobuf JSON; for simplicity we POST raw bytes via
            # httpx and rely on server to accept JSON data field.
            # If server does not support hex, we fall back to local broadcast.
            url = f"{self._http_base()}/twirp/livekit.RoomService/SendData"
            headers = {
                "Authorization": self._auth_header_for_room(room_name),
                "Content-Type": "application/json",
            }
            # Correct Twirp JSON payload — data is base64
            import base64

            json_payload = {
                "room": room_name,
                "data": base64.b64encode(data_bytes).decode(),
                "kind": 1 if reliable else 0,
            }
            if topic:
                json_payload["topic"] = topic

            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.post(url, json=json_payload, headers=headers)
                if resp.status_code in (200, 204):
                    logger.info("LiveKit publish_data ok", extra={"room": room_name, "type": payload.get("type")})
                    return True
                # 404/501 means server API not enabled — not fatal
                logger.debug(
                    "LiveKit publish_data fallback",
                    extra={"room": room_name, "status": resp.status_code, "body": resp.text[:200]},
                )
                return False
        except Exception as e:
            logger.debug("LiveKit publish_data error (fallback to WS)", extra={"room": room_name, "error": str(e)})
            return False

    def publish_data_sync(
        self,
        room_name: str,
        payload: dict,
        topic: str | None = None,
    ) -> bool:
        """Sync wrapper for non-async callers — spawns async task if loop running."""
        try:
            loop = asyncio.get_running_loop()
            if loop.is_running():
                # fire-and-forget
                loop.create_task(self.publish_data(room_name, payload, topic=topic))
                return True
        except RuntimeError:
            pass
        # fallback: try sync httpx
        try:
            import base64
            import httpx

            if not self.api_key or not self.api_secret:
                return False
            data_bytes = json.dumps(payload, default=str).encode("utf-8")
            url = f"{self._http_base()}/twirp/livekit.RoomService/SendData"
            headers = {
                "Authorization": self._auth_header_for_room(room_name),
                "Content-Type": "application/json",
            }
            json_payload = {
                "room": room_name,
                "data": base64.b64encode(data_bytes).decode(),
                "kind": 1,
            }
            if topic:
                json_payload["topic"] = topic
            with httpx.Client(timeout=3.0) as client:
                resp = client.post(url, json=json_payload, headers=headers)
                return resp.status_code in (200, 204)
        except Exception:
            return False
        return False
