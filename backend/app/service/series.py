from __future__ import annotations

from app.model import LeaderboardEntry, RoomSeries, TopicRoom, TopicRoomRegistration
from app.service.base import CRUDRepository


class RoomSeriesService(CRUDRepository):
    def __init__(self, session) -> None:
        self.session = session
        super().__init__(RoomSeries)

    def list_all(self, skip: int = 0, limit: int | None = None) -> list[RoomSeries]:
        return self.get_many(self.session, skip=skip, limit=limit)

    def list_series_by_tag(self, tag_id: str, skip: int = 0, limit: int | None = None) -> list[RoomSeries]:
        return self.get_many(self.session, tag_id=tag_id, skip=skip, limit=limit)

    def get_by_id(self, id) -> RoomSeries | None:
        return self.get_one(self.session, id=id)


class TopicRoomService(CRUDRepository):
    def __init__(self, session) -> None:
        self.session = session
        super().__init__(TopicRoom)

    def list_all(self, skip: int = 0, limit: int | None = None) -> list[TopicRoom]:
        return self.get_many(self.session, skip=skip, limit=limit)

    def list_upcoming_rooms(self, tag_id: str | None = None, skip: int = 0, limit: int | None = None) -> list[TopicRoom]:
        if tag_id is None:
            return self.get_many(self.session, skip=skip, limit=limit)
        return self.get_many(self.session, tag_id=tag_id, skip=skip, limit=limit)

    def get_by_id(self, id) -> TopicRoom | None:
        return self.get_one(self.session, id=id)


class TopicRoomRegistrationService(CRUDRepository):
    def __init__(self, session) -> None:
        self.session = session
        super().__init__(TopicRoomRegistration)

    def list_all(self, skip: int = 0, limit: int | None = None) -> list[TopicRoomRegistration]:
        return self.get_many(self.session, skip=skip, limit=limit)

    def list_registrations(self, topic_room_id: str, skip: int = 0, limit: int | None = None) -> list[TopicRoomRegistration]:
        return self.get_many(self.session, topic_room_id=topic_room_id, skip=skip, limit=limit)


class LeaderboardService(CRUDRepository):
    def __init__(self, session) -> None:
        self.session = session
        super().__init__(LeaderboardEntry)

    def list_all(self, skip: int = 0, limit: int | None = None) -> list[LeaderboardEntry]:
        return self.get_many(self.session, skip=skip, limit=limit)

    def list_by_tag(self, tag_id: str, skip: int = 0, limit: int | None = None) -> list[LeaderboardEntry]:
        return self.get_many(self.session, tag_id=tag_id, skip=skip, limit=limit)
