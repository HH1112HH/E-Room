from __future__ import annotations

import json
import time

import jwt

from app.config import settings


class LiveKitService:
    ALGORITHM = "HS256"
    TOKEN_TTL_SECONDS = 3600

    def __init__(self) -> None:
        self.api_key = settings.livekit_api_key
        self.api_secret = settings.livekit_api_secret
        self.server_url = settings.livekit_url

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
