from __future__ import annotations

from datetime import timedelta
from functools import lru_cache
from io import BytesIO
from typing import Optional

from minio import Minio
from minio.commonconfig import ENABLED
from minio.deleteobjects import DeleteObject
from minio.lifecycleconfig import Expiration, LifecycleConfig, Rule

from app.config import settings


@lru_cache(maxsize=1)
def get_minio_client() -> Minio:
    return Minio(
        settings.minio_endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        secure=settings.minio_secure,
    )


PREFIX_TTL = {
    "audio/user_voice/": 1,
    "audio/ai_voice/": 30,
    "evidence/": 30,
}


class MinioCRUD:
    def __init__(
        self,
        client: Optional[Minio] = None,
        bucket: str = "",
    ) -> None:
        self.client = client or get_minio_client()
        self.bucket = bucket or settings.minio_bucket

    def ensure_bucket(self) -> None:
        if not self.client.bucket_exists(self.bucket):
            self.client.make_bucket(self.bucket)
            self.apply_lifecycle()

    def apply_lifecycle(self) -> None:
        rules: list[Rule] = []
        for prefix, days in PREFIX_TTL.items():
            rules.append(
                Rule(
                    ENABLED,
                    rule_filter=None,
                    rule_id=f"expire-{prefix.strip('/')}-{days}d",
                    expiration=Expiration(days=days),
                )
            )
        if not rules:
            return
        config = LifecycleConfig(rules)
        self.client.set_bucket_lifecycle(self.bucket, config)

    def bucket_exists(self) -> bool:
        return self.client.bucket_exists(self.bucket)

    def put_object(
        self,
        object_name: str,
        data: bytes,
        content_type: str = "application/octet-stream",
        metadata: Optional[dict[str, str]] = None,
    ) -> str:
        result = self.client.put_object(
            self.bucket,
            object_name,
            BytesIO(data),
            length=len(data),
            content_type=content_type,
            metadata=metadata,
        )
        return result.etag

    def put_file(
        self,
        object_name: str,
        file_path: str,
        content_type: str = "application/octet-stream",
        metadata: Optional[dict[str, str]] = None,
    ) -> str:
        result = self.client.fput_object(
            self.bucket,
            object_name,
            file_path,
            content_type=content_type,
            metadata=metadata,
        )
        return result.etag

    def get_object(self, object_name: str) -> bytes:
        response = self.client.get_object(self.bucket, object_name)
        try:
            return response.read()
        finally:
            response.close()
            response.release_conn()

    def get_file(self, object_name: str, file_path: str) -> None:
        self.client.fget_object(self.bucket, object_name, file_path)

    def delete_object(self, object_name: str) -> None:
        self.client.remove_object(self.bucket, object_name)

    def delete_objects(self, object_names: list[str]) -> None:
        errors = self.client.remove_objects(
            self.bucket,
            [DeleteObject(name) for name in object_names],
        )
        for error in errors:
            raise RuntimeError(f"Failed to delete {error}")

    def list_objects(self, prefix: str = "", recursive: bool = True) -> list[str]:
        objects = self.client.list_objects(self.bucket, prefix=prefix, recursive=recursive)
        return [obj.object_name for obj in objects]

    def stat_object(self, object_name: str) -> dict:
        result = self.client.stat_object(self.bucket, object_name)
        return {
            "size": result.size,
            "etag": result.etag,
            "content_type": result.content_type,
            "last_modified": result.last_modified,
            "metadata": result.metadata,
        }

    def object_exists(self, object_name: str) -> bool:
        try:
            self.client.stat_object(self.bucket, object_name)
            return True
        except Exception:
            return False

    def presigned_get_url(self, object_name: str, expires_seconds: int = 3600) -> str:
        return self.client.presigned_get_object(self.bucket, object_name, expires=timedelta(seconds=expires_seconds))

    def presigned_put_url(self, object_name: str, expires_seconds: int = 3600) -> str:
        return self.client.presigned_put_object(self.bucket, object_name, expires=timedelta(seconds=expires_seconds))
