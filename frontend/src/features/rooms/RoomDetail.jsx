import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../components/ui/Card';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { fetchJson } from '../../lib/api';
import '../../styles/DevTools.css';

function statusPill(status, t) {
  if (status === 'ACTIVE') return <span className="pill pill-active">{t('room.status_active')}</span>;
  if (status === 'MATCHING') return <span className="pill pill-matching">{t('room.status_matching')}</span>;
  return <span className="pill pill-end">{status?.toLowerCase()}</span>;
}

export function RoomDetail({ room, onBack }) {
  const { t } = useTranslation();
  const loader = useCallback(() => fetchJson(`/rooms/${room.id}`), [room.id]);
  const { data, isLoading, error } = useAsyncResource(loader, room);

  const detail = data || room;

  return (
    <div className="room-detail-grid">
      <div className="devtools-room-back">
        <button className="outline" onClick={onBack}>&larr; {t('common.back')}</button>
        <div className="room-detail-header">
          <h3>{detail.topic || detail.livekit_room_name}</h3>
          {statusPill(detail.status, t)}
        </div>
      </div>

      {error ? <p className="empty-state empty-state-error">{t('learning.could_not_load')}</p> : null}

      <div className="two-col">
        <Card title={t('room.participants')} subtitle={`${detail.current_participants || 0}/${detail.max_participants}`}>
          {isLoading ? <p className="empty-state">{t('common.loading')}</p> : null}
          {detail.participants && detail.participants.length > 0 ? (
            <ul className="list-simple">
              {detail.participants.map((pid, i) => (
                <li key={pid || i}>
                  <strong>{pid}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">{t('room.no_participants')}</p>
          )}
        </Card>

        <Card title={t('room.messages')} subtitle={t('room.messages_sub')}>
          {isLoading ? <p className="empty-state">{t('common.loading')}</p> : null}
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
            <p className="empty-state">{t('room.no_messages')}</p>
          )}
        </Card>
      </div>

      <div className="three-col">
        <div className="stat">
          <span>{t('room.agent_level')}</span>
          <strong>{detail.agent_level || 'basic'}</strong>
        </div>
        <div className="stat">
          <span>{t('learning.create_room_level')}</span>
          <strong>{detail.english_level || 'any'}</strong>
        </div>
        <div className="stat">
          <span>{t('room.visibility')}</span>
          <strong>{detail.is_public ? t('room.public') : t('room.private')}</strong>
        </div>
      </div>

      <div className="form-row">
        <input placeholder={t('room.message_ph')} className="devtools-input-flex" />
        <button>{t('room.send')}</button>
      </div>
    </div>
  );
}
