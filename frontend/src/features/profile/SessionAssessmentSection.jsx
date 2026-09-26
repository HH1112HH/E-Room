import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { HiAcademicCap, HiChatBubbleLeftRight, HiClock } from 'react-icons/hi2';
import { fetchJson } from '../../lib/api';

function formatShortDateTime(iso) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}, ${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
}

function formatDuration(seconds) {
  if (seconds == null) return 'ongoing';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

/**
 * Mục Assessment (riêng với Session): chọn session rồi sang trang
 * /assessment/:sessionId để chấm điểm + nhận xét AI.
 * Không nhúng SessionScoringView ở đây để 2 trang không chung chạm.
 */
export function SessionAssessmentSection() {
  const mineQuery = useQuery({
    queryKey: ['sessions', 'mine'],
    queryFn: () => fetchJson('/sessions/mine').then((r) => r?.sessions ?? []),
    retry: false,
  });
  const sessions = useMemo(
    () => (Array.isArray(mineQuery.data) ? mineQuery.data : []),
    [mineQuery.data],
  );

  return (
    <div className="portal-stack">
      <section className="pf-hero">
        <div className="pf-hero__body">
          <div className="pf-hero__hello">English assessment</div>
          <div className="pf-hero__title">Replay what you said, level up how you say it.</div>
          <div className="pf-hero__sub">
            Chọn 1 session để chấm điểm phát âm từng câu, xem nhận xét AI và nghe lại mẫu đọc đúng.
          </div>
        </div>
        <HiAcademicCap size={40} aria-hidden="true" />
      </section>

      {mineQuery.isLoading ? (
        <section className="portal-panel"><div className="portal-skeleton"><span /><span /></div></section>
      ) : mineQuery.isError ? (
        <section className="portal-panel">
          <div className="er-alert er-alert--err">
            Could not load sessions. <button type="button" onClick={() => mineQuery.refetch()} className="portal-linkbtn">Try again</button>
          </div>
        </section>
      ) : sessions.length === 0 ? (
        <section className="portal-panel">
          <div className="portal-empty">Chưa có session nào — vào phòng nói vài câu rồi quay lại.</div>
        </section>
      ) : (
        <section className="portal-panel">
          <div className="portal-panel__head">
            <h2>Sessions to assess <span className="portal-count">{sessions.length}</span></h2>
          </div>
          <div className="pf-events">
            {sessions.map(({ session, room, message_count }) => (
              <article key={session.id} className="pf-event">
                <div className="pf-event__body">
                  <div className="pf-room__title">
                    <strong>{room?.name || `Room ${session.room_id}`}</strong>
                    {!session.left_at && <span className="portal-badge is-live">ONGOING</span>}
                  </div>
                  <div className="pf-room__meta">
                    <span><HiClock size={13} /> {formatDuration(session.duration_seconds)}</span>
                    <span><HiChatBubbleLeftRight size={13} /> {message_count ?? 0} lines</span>
                    <span>{session.joined_at ? formatShortDateTime(session.joined_at) : '—'}</span>
                  </div>
                </div>
                <Link
                  className="er-btn portal-mini-btn pf-event__go"
                  style={{ textDecoration: 'none' }}
                  to={`/assessment/${session.id}`}
                >
                  Assess
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
