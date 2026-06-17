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
          <span>Loading note...</span>
        </div>
      </Container>
    );
  }

  if (error || !note) {
    return (
      <Container className="note-detail-page py-4">
        <div className="note-detail-page__error">
          <HiBookOpen size={48} />
          <h3>Note not found</h3>
          <p>{error?.message || 'This note may have been deleted.'}</p>
          <Link to="/notes"><Button variant="outline-primary" className="px-3">Back to notes</Button></Link>
        </div>
      </Container>
    );
  }

  return (
    <Container className="note-detail-page py-4">
      <Link to="/notes" className="note-detail-page__back">
        Back to notes
      </Link>

      <div className="note-detail-page__header">
        <h1>{note.title || 'Session Summary'}</h1>
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
          <HiPencil size={14} /> Edit
        </Button>
        <Button variant="outline-secondary" size="sm" className="note-detail-page__action-btn note-detail-page__action-btn--danger">
          <HiTrash size={14} /> Delete
        </Button>
        {note.session_id && (
          <Button as={Link} to={`/sessions/${note.session_id}`} variant="outline-primary" size="sm" className="note-detail-page__action-btn">
            <HiLink size={14} /> Open source session
          </Button>
        )}
      </div>

      <div className="note-detail-page__content-wrapper">
        <div className="note-detail-page__content-header">
          <span>Note content</span>
          <button className="note-detail-page__copy-btn" onClick={handleCopyContent}>
            <HiClipboardDocument size={14} /> Copy
          </button>
        </div>
        {note.content && (
          <div className="note-detail-page__content">{note.content}</div>
        )}
      </div>

      <div className="note-detail-page__info">
        <h2>Note info</h2>
        <div className="note-detail-page__info-grid">
          <div className="note-detail-page__info-item">
            <span className="note-detail-page__info-label">Created</span>
            <span className="note-detail-page__info-value">{formatDate(note.created_at)}</span>
          </div>
          {note.session_topic && (
            <div className="note-detail-page__info-item">
              <span className="note-detail-page__info-label">Session topic</span>
              <span className="note-detail-page__info-value">{note.session_topic}</span>
            </div>
          )}
          {note.tags && note.tags.length > 0 && (
            <div className="note-detail-page__info-item">
              <span className="note-detail-page__info-label">Tags</span>
              <span className="note-detail-page__info-value">{note.tags.join(', ')}</span>
            </div>
          )}
        </div>
      </div>

      {note.session_topic && (
        <div className="note-detail-page__context">
          <h2>Session context</h2>
          <p><span>Topic:</span> {note.session_topic}</p>
          <p><span>Created:</span> {formatDate(note.created_at)}</p>
        </div>
      )}

      <div className="note-detail-page__cta">
        <Link to="/notes">Back to notes</Link>
      </div>
    </Container>
  );
}
