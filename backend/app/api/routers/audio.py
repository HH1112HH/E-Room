from __future__ import annotations

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from app.infrastructure.minio import MinioCRUD

router = APIRouter()


@router.get("/audio/{object_name:path}")
async def get_audio(object_name: str):
    try:
        crud = MinioCRUD()
        data = crud.get_object(object_name)
        return Response(content=data, media_type="audio/wav")
    except Exception:
        raise HTTPException(status_code=404, detail="Audio not found")
