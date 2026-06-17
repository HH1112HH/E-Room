from __future__ import annotations

from uuid import UUID

from sqlmodel import Session, select

from app.log import db_log
from app.model import Message, MessageType
from app.service.base import CRUDRepository


class MessageService(CRUDRepository):
    def __init__(self, session: Session) -> None:
        self.session = session
        super().__init__(Message)

    def list_messages(self) -> list[dict]:
        return [message.model_dump(mode="json") for message in self.get_many(self.session)]

    def list_room_messages(self, room_id: UUID, skip: int = 0, limit: int = 200) -> list[Message]:
        statement = select(Message).where(Message.room_id == room_id).order_by(Message.created_at.desc()).offset(skip).limit(limit)
        result = list(self.session.exec(statement))
        result.reverse()
        db_log("messages", "SELECT", f"room_id={room_id} count={len(result)}")
        return result

    def create_transcript_message(self, room_id: UUID, user_id: UUID | None, content: str) -> Message:
        message = Message(
            room_id=room_id,
            user_id=user_id,
            content=content,
            message_type=MessageType.TRANSCRIPT,
        )
        self.session.add(message)
        self.session.commit()
        self.session.refresh(message)
        db_log("messages", "INSERT", f"type=TRANSCRIPT id={message.id} content={content[:100]}")
        return message

    def save(self, obj: Message) -> Message:
        self.session.add(obj)
        self.session.commit()
        self.session.refresh(obj)
        db_log("messages", "INSERT", f"type={obj.message_type} id={obj.id} content={str(obj.content or '')[:100]}")
        return obj

    def list_all(self, skip: int = 0, limit: int | None = None) -> list[Message]:
        return self.get_many(self.session, skip=skip, limit=limit)
