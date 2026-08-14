import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../components/ui/Card';
import { createRoomSocket } from '../../lib/websocket';

export function RoomSocketPreview() {
  const { t } = useTranslation();
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const socket = createRoomSocket('demo-room', (message) => {
      setEvents((current) => [message, ...current].slice(0, 5));
    });

    socket.addEventListener('open', () => {
      socket.send(JSON.stringify({ type: 'client_ready', source: 'frontend-preview' }));
    });

    return () => {
      socket.close();
    };
  }, []);

  return (
    <Card title={t('room.socket_preview_title')} subtitle={t('room.socket_preview_sub')}>
      {events.length === 0 ? <p>{t('room.waiting_events')}</p> : null}
      <ul className="simple-list">
        {events.map((event, index) => (
          <li key={`${event.type}-${index}`}>
            <strong>{event.type}</strong>
            <span>{event.roomId || 'system'}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
