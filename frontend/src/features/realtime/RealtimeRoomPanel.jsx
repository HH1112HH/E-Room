import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../components/ui/Card';
import { createRoomSocket } from '../../lib/websocket';
import '../../styles/DevTools.css';

export function RealtimeRoomPanel() {
  const { t } = useTranslation();
  const [roomId, setRoomId] = useState('demo-room');
  const [events, setEvents] = useState([]);

  useEffect(() => {
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
