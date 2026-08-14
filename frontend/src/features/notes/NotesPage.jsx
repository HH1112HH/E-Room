import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Container from 'react-bootstrap/Container';
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';
import { fetchJson } from '../../lib/api';
import { queryClient } from '../../lib/queryClient';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import { UpgradePrompt } from '../subscription/UpgradePrompt';
import { formatDate } from '../../lib/formatters';
import { HiDocumentText, HiTrash, HiClock, HiBookOpen, HiArrowRight, HiMagnifyingGlass, HiSparkles } from 'react-icons/hi2';
import '../../styles/NotesPage.css';

export function NotesPage() {
  const { t } = useTranslation();
  const { tier, features } = useSubscriptionStore();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [search, setSearch] = useState('');

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['notes'],
    queryFn: () => fetchJson('/notes'),
    enabled: tier === 'pro_plus',
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => fetchJson(`/notes/${id}`, { method: 'DELETE' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notes'] }); setDeleting(null); },
  });

  const filtered = notes.filter((note) => {
    const query = search.toLowerCase();
    return !search
      || (note.title || '').toLowerCase().includes(query)
      || (note.content || '').toLowerCase().includes(query)
      || (note.tags || []).join(' ').toLowerCase().includes(query);
  });

  if (!features.notes) {
    return (
      <>
        <Container className="notes-page py-4 text-center">
          <div className="notes-page__upgrade">
            <HiSparkles size={24} />
            <h3>Ghi chú buổi học là tính năng Pro+</h3>
            <p>Nâng cấp để mở khóa tóm tắt buổi học do AI tạo, sửa lỗi và ghi chú học tập cá nhân hóa.</p>
            <Button variant="primary" className="px-3" onClick={() => setShowUpgrade(true)}>Nâng cấp lên Pro+</Button>
          </div>
        </Container>
        <UpgradePrompt feature="Ghi chú buổi học" visible={showUpgrade} onClose={() => setShowUpgrade(false)} />
      </>
    );
  }

  return (
    <Container className="notes-page py-4">
      <div className="notes-page__header">
        <h1>Ghi chú</h1>
        <p>Tóm tắt buổi học, các lỗi chính và nhắc nhở từ mọi phòng bạn đã tham gia.</p>
      </div>

      <div className="notes-page__search-wrap">
        <HiMagnifyingGlass size={15} className="notes-page__search-icon" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm ghi chú theo tiêu đề, nội dung hoặc thẻ..."
          className="notes-page__search"
        />
      </div>

      {isLoading ? (
        <div className="notes-page__loading">
          <Spinner animation="border" variant="primary" />
          <span>Đang tải ghi chú...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="notes-page__empty">
          <HiDocumentText size={24} />
          <h3>{search ? 'Không tìm thấy ghi chú phù hợp' : 'Chưa có ghi chú nào'}</h3>
          <p>{search ? 'Hãy thử từ khóa tìm kiếm khác.' : 'Sau buổi học Pro+, ghi chú của bạn sẽ tự động xuất hiện tại đây.'}</p>
          {!search && <Button as={Link} to="/learning" variant="outline-primary" className="px-3">Bắt đầu buổi học</Button>}
        </div>
      ) : (
        <div className="notes-page__list">
          {filtered.map((note) => (
            <div key={note.id} className="notes-page__row">
              <div className="notes-page__row-top">
                <h2 className="notes-page__row-title">{note.title || 'Tóm tắt buổi học'}</h2>
                <button
                  onClick={() => { setDeleting(note.id); deleteMutation.mutate(note.id); }}
                  disabled={deleting === note.id}
                  className="notes-page__delete"
                >
                  Xóa
                </button>
              </div>
              <div className="notes-page__row-meta">
                <span>{formatDate(note.created_at)}</span>
                {note.session_topic && <><span className="notes-page__meta-sep"> &middot; </span><span>{note.session_topic}</span></>}
              </div>
              <div className="notes-page__row-preview">
                {(note.content || '').slice(0, 250)}{(note.content || '').length > 250 ? '...' : ''}
              </div>
              {(note.content || '').length > 250 && (
                <Link to={`/notes/${note.id}`} className="notes-page__read-more">Đọc ghi chú đầy đủ</Link>
              )}
              {note.tags && note.tags.length > 0 && (
                <div className="notes-page__tags">
                  {note.tags.map((tag) => (
                    <span key={tag} className="notes-page__tag">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Container>
  );
}
