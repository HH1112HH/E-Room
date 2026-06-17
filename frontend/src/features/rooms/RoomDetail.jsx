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

export function RoomDetail({ room, onBack }) {
  const loader = useCallback(() => fetchJson(`/rooms/${room.id}`), [room.id]);
  const { data, isLoading, error } = useAsyncResource(loader, room);

  const detail = data || room;

  return (
    <div className="room-detail-grid">
      <div className="devtools-room-back">
        <button className="outline" onClick={onBack}>&larr; Back</button>
        <div className="room-detail-header">
          <h3>{detail.topic || detail.livekit_room_name}</h3>
          {statusPill(detail.status)}
        </div>
      </div>

      {error ? <p className="empty-state empty-state-error">Failed to load room detail</p> : null}

      <div className="two-col">
        <Card title="Participants" subtitle={`${detail.current_participants || 0}/${detail.max_participants}`}>
          {isLoading ? <p className="empty-state">Loading...</p> : null}
          {detail.participants && detail.participants.length > 0 ? (
            <ul className="list-simple">
              {detail.participants.map((pid, i) => (
                <li key={pid || i}>
                  <strong>{pid}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">No participants yet</p>
          )}
        </Card>

        <Card title="Messages" subtitle="Latest room messages">
          {isLoading ? <p className="empty-state">Loading...</p> : null}
          {detail.messages && detail.messages.length > 0 ? (
            <ul className="list-simple">
              {detail.messages.map((msg, i) => (
                <li key={msg.id || i}>
                  <strong>{msg.content}</strong>
                  <span>{msg.type}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">No messages yet</p>
          )}
        </Card>
      </div>

      <div className="three-col">
        <div className="stat">
          <span>Agent level</span>
          <strong>{detail.agent_level || 'basic'}</strong>
        </div>
        <div className="stat">
          <span>English level</span>
          <strong>{detail.english_level || 'any'}</strong>
        </div>
        <div className="stat">
          <span>Visibility</span>
          <strong>{detail.is_public ? 'public' : 'private'}</strong>
        </div>
      </div>

      <div className="form-row">
        <input placeholder="Send a message..." className="devtools-input-flex" />
        <button>Send</button>
      </div>
    </div>
  );
}
