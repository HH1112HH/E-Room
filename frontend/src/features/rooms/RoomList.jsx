import { useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { fetchJson } from '../../lib/api';
import '../../styles/DevTools.css';

function statusPill(status) {
  if (status === 'ACTIVE') return <span className="pill pill-active">active</span>;
  if (status === 'MATCHING') return <span className="pill pill-matching">matching</span>;
  return <span className="pill pill-end">{status?.toLowerCase()}</span>;
}

export function RoomList({ onSelectRoom }) {
  const loader = useCallback(() => fetchJson('/rooms'), []);
  const { data, isLoading, error } = useAsyncResource(loader, []);

  return (
    <Card title="Rooms" subtitle="Active and matching rooms" action={
      data.length > 0 ? <span className="pill pill-active">{data.length} total</span> : null
    }>
      {isLoading ? <p className="empty-state">Loading rooms...</p> : null}
      {error ? <p className="empty-state empty-state-error">{error}</p> : null}
      {!isLoading && !error && data.length === 0 ? (
        <p className="empty-state">No rooms yet. Create one to get started.</p>
      ) : null}
      <ul className="list-simple">
        {data.map((room) => (
          <li
            key={room.id}
            onClick={() => onSelectRoom && onSelectRoom(room)}
            style={{ cursor: onSelectRoom ? 'pointer' : 'default' }}
          >
            <div>
              <strong>{room.topic || room.livekit_room_name}</strong>
              <div className="room-list-tags">
                {room.tags?.map((t) => (
                  <span key={t} className="tag-chip tag-chip-sm">{t}</span>
                ))}
              </div>
            </div>
            <div className="room-list-meta">
              <span className="room-list-count">{room.current_participants}/{room.max_participants}</span>
              {statusPill(room.status)}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
