import { useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { fetchJson } from '../../lib/api';
import '../../styles/DevTools.css';

function statusPill(status) {
  if (status === 'ACTIVE') return <span className="pill pill-active">đang hoạt động</span>;
  if (status === 'MATCHING') return <span className="pill pill-matching">đang ghép cặp</span>;
  return <span className="pill pill-end">{status?.toLowerCase()}</span>;
}

export function RoomDetail({ room, onBack }) {
  const loader = useCallback(() => fetchJson(`/rooms/${room.id}`), [room.id]);
  const { data, isLoading, error } = useAsyncResource(loader, room);

  const detail = data || room;

  return (
    <div className="room-detail-grid">
      <div className="devtools-room-back">
        <button className="outline" onClick={onBack}>&larr; Quay lại</button>
        <div className="room-detail-header">
          <h3>{detail.topic || detail.livekit_room_name}</h3>
          {statusPill(detail.status)}
        </div>
      </div>

      {error ? <p className="empty-state empty-state-error">Không thể tải chi tiết phòng</p> : null}

      <div className="two-col">
        <Card title="Người tham gia" subtitle={`${detail.current_participants || 0}/${detail.max_participants}`}>
          {isLoading ? <p className="empty-state">Đang tải...</p> : null}
          {detail.participants && detail.participants.length > 0 ? (
            <ul className="list-simple">
              {detail.participants.map((pid, i) => (
                <li key={pid || i}>
                  <strong>{pid}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">Chưa có người tham gia</p>
          )}
        </Card>

        <Card title="Tin nhắn" subtitle="Tin nhắn mới nhất trong phòng">
          {isLoading ? <p className="empty-state">Đang tải...</p> : null}
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
            <p className="empty-state">Chưa có tin nhắn</p>
          )}
        </Card>
      </div>

      <div className="three-col">
        <div className="stat">
          <span>Trình độ AI</span>
          <strong>{detail.agent_level || 'basic'}</strong>
        </div>
        <div className="stat">
          <span>Trình độ tiếng Anh</span>
          <strong>{detail.english_level || 'any'}</strong>
        </div>
        <div className="stat">
          <span>Chế độ hiển thị</span>
          <strong>{detail.is_public ? 'công khai' : 'riêng tư'}</strong>
        </div>
      </div>

      <div className="form-row">
        <input placeholder="Gửi tin nhắn..." className="devtools-input-flex" />
        <button>Gửi</button>
      </div>
    </div>
  );
}
