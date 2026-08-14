import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Container from 'react-bootstrap/Container';
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';
import { fetchJson } from '../../lib/api';
import { formatDate, formatDateTime } from '../../lib/formatters';
import { HiArrowLeft, HiClock, HiBookOpen, HiTag, HiPencil, HiTrash, HiClipboardDocument, HiLink } from 'react-icons/hi2';
import '../../styles/NoteDetailPage.css';

export function NoteDetailPage() {
  const { noteId } = useParams();
  const { t } = useTranslation();

  const handleCopyContent = () => {
    if (note?.content) {
      navigator.clipboard.writeText(note.content);
    }
  };

  const { data: note, isLoading, error } = useQuery({
    queryKey: ['note', noteId],
    queryFn: () => fetchJson(`/notes/${noteId}`),
  });

  if (isLoading) {
    return (
      <Container className="note-detail-page py-4">
        <div className="note-detail-page__loading">
          <Spinner animation="border" variant="primary" />
          <span>Đang tải ghi chú...</span>
        </div>
      </Container>
    );
  }

  if (error || !note) {
    return (
      <Container className="note-detail-page py-4">
        <div className="note-detail-page__error">
          <HiBookOpen size={48} />
          <h3>Không tìm thấy ghi chú</h3>
          <p>{error?.message || 'Ghi chú này có thể đã bị xóa.'}</p>
          <Link to="/notes"><Button variant="outline-primary" className="px-3">Quay lại ghi chú</Button></Link>
        </div>
      </Container>
    );
  }

  return (
    <Container className="note-detail-page py-4">
      <Link to="/notes" className="note-detail-page__back">
        Quay lại ghi chú
      </Link>

      <div className="note-detail-page__header">
        <h1>{note.title || 'Tóm tắt buổi học'}</h1>
        <div className="note-detail-page__meta">
          <span>{formatDateTime(note.created_at)}</span>
          {note.session_topic && <><span className="note-detail-page__meta-sep"> &middot; </span><span>{note.session_topic}</span></>}
        </div>
        {note.tags && note.tags.length > 0 && (
          <div className="note-detail-page__tags">
            {note.tags.map((tag) => (
              <span key={tag} className="note-detail-page__tag">{tag}</span>
            ))}
          </div>
        )}
      </div>

      <div className="note-detail-page__actions">
        <Button variant="outline-secondary" size="sm" className="note-detail-page__action-btn">
          <HiPencil size={14} /> Chỉnh sửa
        </Button>
        <Button variant="outline-secondary" size="sm" className="note-detail-page__action-btn note-detail-page__action-btn--danger">
          <HiTrash size={14} /> Xóa
        </Button>
        {note.session_id && (
          <Button as={Link} to={`/sessions/${note.session_id}`} variant="outline-primary" size="sm" className="note-detail-page__action-btn">
            <HiLink size={14} /> Mở buổi học gốc
          </Button>
        )}
      </div>

      <div className="note-detail-page__content-wrapper">
        <div className="note-detail-page__content-header">
          <span>Nội dung ghi chú</span>
          <button className="note-detail-page__copy-btn" onClick={handleCopyContent}>
            <HiClipboardDocument size={14} /> Sao chép
          </button>
        </div>
        {note.content && (
          <div className="note-detail-page__content">{note.content}</div>
        )}
      </div>

      <div className="note-detail-page__info">
        <h2>Thông tin ghi chú</h2>
        <div className="note-detail-page__info-grid">
          <div className="note-detail-page__info-item">
            <span className="note-detail-page__info-label">Ngày tạo</span>
            <span className="note-detail-page__info-value">{formatDate(note.created_at)}</span>
          </div>
          {note.session_topic && (
            <div className="note-detail-page__info-item">
              <span className="note-detail-page__info-label">Chủ đề buổi học</span>
              <span className="note-detail-page__info-value">{note.session_topic}</span>
            </div>
          )}
          {note.tags && note.tags.length > 0 && (
            <div className="note-detail-page__info-item">
              <span className="note-detail-page__info-label">Thẻ</span>
              <span className="note-detail-page__info-value">{note.tags.join(', ')}</span>
            </div>
          )}
        </div>
      </div>

      {note.session_topic && (
        <div className="note-detail-page__context">
          <h2>Ngữ cảnh buổi học</h2>
          <p><span>Chủ đề:</span> {note.session_topic}</p>
          <p><span>Ngày tạo:</span> {formatDate(note.created_at)}</p>
        </div>
      )}

      <div className="note-detail-page__cta">
        <Link to="/notes">Quay lại ghi chú</Link>
      </div>
    </Container>
  );
}
