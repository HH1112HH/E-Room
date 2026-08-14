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
          <span>{t('notes.loading')}</span>
        </div>
      </Container>
    );
  }

  if (error || !note) {
    return (
      <Container className="note-detail-page py-4">
        <div className="note-detail-page__error">
          <HiBookOpen size={48} />
          <h3>{t('notes.not_found')}</h3>
          <p>{error?.message || t('notes.deleted')}</p>
          <Link to="/notes"><Button variant="outline-primary" className="px-3">{t('notes.back_to_notes')}</Button></Link>
        </div>
      </Container>
    );
  }

  return (
    <Container className="note-detail-page py-4">
      <Link to="/notes" className="note-detail-page__back">
        {t('notes.back_to_notes')}
      </Link>

      <div className="note-detail-page__header">
        <h1>{note.title || t('notes.session_summary')}</h1>
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
          <HiPencil size={14} /> {t('notes.edit')}
        </Button>
        <Button variant="outline-secondary" size="sm" className="note-detail-page__action-btn note-detail-page__action-btn--danger">
          <HiTrash size={14} /> {t('common.delete')}
        </Button>
        {note.session_id && (
          <Button as={Link} to={`/sessions/${note.session_id}`} variant="outline-primary" size="sm" className="note-detail-page__action-btn">
            <HiLink size={14} /> {t('notes.open_session')}
          </Button>
        )}
      </div>

      <div className="note-detail-page__content-wrapper">
        <div className="note-detail-page__content-header">
          <span>{t('notes.note_content')}</span>
          <button className="note-detail-page__copy-btn" onClick={handleCopyContent}>
            <HiClipboardDocument size={14} /> {t('notes.copy')}
          </button>
        </div>
        {note.content && (
          <div className="note-detail-page__content">{note.content}</div>
        )}
      </div>

      <div className="note-detail-page__info">
        <h2>{t('notes.info')}</h2>
        <div className="note-detail-page__info-grid">
          <div className="note-detail-page__info-item">
            <span className="note-detail-page__info-label">{t('notes.created_at')}</span>
            <span className="note-detail-page__info-value">{formatDate(note.created_at)}</span>
          </div>
          {note.session_topic && (
            <div className="note-detail-page__info-item">
              <span className="note-detail-page__info-label">{t('notes.session_topic')}</span>
              <span className="note-detail-page__info-value">{note.session_topic}</span>
            </div>
          )}
          {note.tags && note.tags.length > 0 && (
            <div className="note-detail-page__info-item">
              <span className="note-detail-page__info-label">{t('notes.tags')}</span>
              <span className="note-detail-page__info-value">{note.tags.join(', ')}</span>
            </div>
          )}
        </div>
      </div>

      {note.session_topic && (
        <div className="note-detail-page__context">
          <h2>{t('notes.session_context')}</h2>
          <p><span>{t('notes.session_topic')}:</span> {note.session_topic}</p>
          <p><span>{t('notes.created_at')}:</span> {formatDate(note.created_at)}</p>
        </div>
      )}

      <div className="note-detail-page__cta">
        <Link to="/notes">{t('notes.back_to_notes')}</Link>
      </div>
    </Container>
  );
}
