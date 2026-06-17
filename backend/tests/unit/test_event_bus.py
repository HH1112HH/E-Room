from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from app.infrastructure.event_bus import EventBus


class TestEventBus:
    @pytest.fixture
    def bus(self):
        bus = EventBus()
        bus.connected = True
        bus.crud = MagicMock()
        bus.subscriber = MagicMock()
        return bus

    def test_publish(self, bus):
        bus.crud.publish.return_value = 1
        result = bus.publish("channel", {"msg": "hello"})
        assert result == 1

    def test_subscribe(self, bus):
        handler = MagicMock()
        bus.subscribe("channel", handler)
        assert "channel" in bus.callbacks
        assert handler in bus.callbacks["channel"]

    def test_unsubscribe(self, bus):
        handler = MagicMock()
        bus.subscribe("channel", handler)
        bus.unsubscribe("channel", handler)
        assert handler not in bus.callbacks["channel"]

    def test_publish_returns_zero_when_not_connected(self):
        bus = EventBus()
        result = bus.publish("channel", {"msg": "hello"})
        assert result == 0


class TestEventBusLifecycle:
    @pytest.fixture
    def bus(self):
        bus = EventBus()
        bus.connected = True
        bus.crud = MagicMock()
        bus.subscriber = MagicMock()
        return bus

    @pytest.mark.asyncio
    async def test_start_subscribes_to_channels(self, bus):
        handler = MagicMock()
        bus.subscribe("ch1", handler)
        bus.subscribe("ch2", handler)
        await bus.start()
        bus.subscriber.subscribe.assert_any_call("ch1")
        bus.subscriber.subscribe.assert_any_call("ch2")
        assert bus.listener_task is not None
        await bus.stop()

    @pytest.mark.asyncio
    async def test_stop_cancels_listener_task(self, bus):
        handler = MagicMock()
        bus.subscribe("ch1", handler)
        await bus.start()
        await bus.stop()
        assert bus.listener_task is None or bus.listener_task.cancelled()
        bus.subscriber.close.assert_called_once()

    @pytest.mark.asyncio
    async def test_start_skips_when_no_callbacks(self):
        bus = EventBus()
        await bus.start()
        assert bus.listener_task is None
