import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../components/ui/Card';
import { createRoomSocket } from '../../lib/websocket';
import { LiveKitChannel } from '../../lib/webrtc';
import '../../styles/DevTools.css';

export function RealtimeRoomPanel() {
  const { t } = useTranslation();
  const [roomId, setRoomId] = useState('demo-room');
  const [events, setEvents] = useState([]);
  const USE_WEBRTC = import.meta.env.VITE_USE_WEBRTC !== 'false';

  useEffect(() => {
    if (USE_WEBRTC) {
      // WebRTC demo: REST polling for room events (no WS needed)
      // For dev preview we just push synthetic event; real events come via LiveKit DataChannel in RoomPage
      const token = localStorage.getItem('e-room-access-token') || '';
      const ch = new LiveKitChannel(null, roomId, token, {
        onEvent: (type, msg) => setEvents((cur) => [msg, ...cur].slice(0, 8)),
      });
      // trigger heartbeat-like probe via REST
      ch.send({ type: 'heartbeat_probe', roomId });
      return () => ch.close();
    }
    const socket = createRoomSocket(roomId, (message) => {
      setEvents((current) => [message, ...current].slice(0, 8));
    });

    socket.addEventListener('open', () => {
      socket.send(JSON.stringify({ type: 'heartbeat_probe', roomId }));
    });

    return () => { socket.close(); };
  }, [roomId]);

  return (
    <Card title={t('room.realtime_title')} subtitle={t('room.realtime_sub')}>
      <div className="form-row devtools-mb12">
        <input value={roomId} onChange={(event) => setRoomId(event.target.value)} placeholder={t('room.room_id_ph')} />
      </div>
      {events.length === 0 ? <p className="empty-state">{t('room.waiting_events')}</p> : null}
      <ul className="list-simple">
        {events.map((event, index) => (
          <li key={`${event.type}-${index}`}>
            <strong>{event.type}</strong>
            <span>{event.roomId || roomId}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
