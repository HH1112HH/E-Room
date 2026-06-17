import { useState, useEffect } from 'react';
import { fetchJson } from '../../lib/api';
import '../../styles/CreateRoomModal.css';
import {
  HiXMark, HiPlusCircle, HiLanguage, HiUserGroup,
  HiDocumentText, HiTag, HiAcademicCap
} from 'react-icons/hi2';

const ENGLISH_LEVELS = [
  { value: 'A1', label: 'A1', desc: 'Beginner' },
  { value: 'A2', label: 'A2', desc: 'Elementary' },
  { value: 'B1', label: 'B1', desc: 'Intermediate' },
  { value: 'B2', label: 'B2', desc: 'Upper-Int' },
  { value: 'C1', label: 'C1', desc: 'Advanced' },
  { value: 'C2', label: 'C2', desc: 'Proficient' },
];

const PARTICIPANT_OPTS = [2, 3, 4, 5, 6, 8, 10, 15];

const FALLBACK_TAGS = [
  'AI/ML', 'Technology', 'Python', 'Prompt Engineering',
  'LLM', 'Machine Learning', 'AI Ethics', 'AI Tools',
  'Culture', 'Science', 'Startup', 'Music',
];



export function CreateRoomModal({ onClose, onRoomCreated }) {
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [tagIds, setTagIds] = useState('');
  const [level, setLevel] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(5);
  const [popularTags, setPopularTags] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchJson('/tags/popular').then(t => {
      if (Array.isArray(t)) setPopularTags(t.slice(0, 15));
    }).catch(() => {});
  }, []);

  function addTag(tag) {
    const current = tagIds.split(',').map(t => t.trim()).filter(Boolean);
    if (!current.includes(tag)) {
      setTagIds(prev => prev ? `${prev}, ${tag}` : tag);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!topic.trim()) return;

    const tagList = tagIds
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    if (tagList.length === 0) {
      alert('Please enter at least one tag');
      return;
    }

    setSaving(true);
    try {
      const room = await fetchJson('/rooms', {
        method: 'POST',
        body: JSON.stringify({
          topic: topic.trim(),
          tag_ids: tagList,
          max_participants: maxParticipants,
          english_level: level || undefined,
          description: description.trim() || undefined,
          is_public: true,
        }),
      });
      if (onRoomCreated) onRoomCreated(room);
      onClose();
    } catch (err) {
      alert(err.message || 'Failed to create room');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div
        onClick={onClose}
        className="room-modal__overlay"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="room-modal__card"
        >

          <div className="room-modal__header">
            <div>
              <h3 className="room-modal__title">
                Create a Room
              </h3>
              <p className="room-modal__subtitle">
                Fill in the details to start a new English-speaking session
              </p>
            </div>
            <button
              onClick={onClose}
              className="room-modal__close-btn"
            >
              <HiXMark size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>

            <label className="room-modal__label">
              <HiTag size={14} className="room-modal__icon" />
              Room Topic *
            </label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. AI Job Interview Practice"
              autoFocus
              className="room-modal__input"
            />

            <label className="room-modal__label">
              <HiDocumentText size={14} className="room-modal__icon" />
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will you discuss? Any special rules or topics?"
              rows={3}
              className="room-modal__input room-modal__textarea"
            />

            <label className="room-modal__label">
              <HiAcademicCap size={14} className="room-modal__icon" />
              English Level
            </label>
            <div className="room-modal__btn-group">
              {ENGLISH_LEVELS.map((lvl) => (
                <button
                  key={lvl.value}
                  type="button"
                  onClick={() => setLevel(prev => prev === lvl.value ? '' : lvl.value)}
                  title={lvl.desc}
                  className={`room-modal__level-btn${level === lvl.value ? ' room-modal__level-btn--active' : ''}`}
                >
                  <span className="room-modal__level-btn-label">{lvl.label}</span>
                  <span className="room-modal__level-btn-desc">{lvl.desc}</span>
                </button>
              ))}
            </div>

            <label className="room-modal__label">
              <HiUserGroup size={14} className="room-modal__icon" />
              Max Participants
            </label>
            <div className="room-modal__btn-group">
              {PARTICIPANT_OPTS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setMaxParticipants(n)}
                  className={`room-modal__participant-btn${maxParticipants === n ? ' room-modal__participant-btn--active' : ''}`}
                >
                  {n}
                </button>
              ))}
            </div>

            <label className="room-modal__label">
              <HiTag size={14} className="room-modal__icon" />
              Tags * <span className="room-modal__tag-hint">(comma separated)</span>
            </label>
            <input
              value={tagIds}
              onChange={(e) => setTagIds(e.target.value)}
              placeholder="e.g. Business, Technology, Travel"
              className="room-modal__input"
            />
            <div className="room-modal__tag-list">
              {(popularTags.length > 0 ? popularTags : FALLBACK_TAGS).map((item) => {
                const tagName = typeof item === 'string' ? item : item.name;
                const isActive = tagIds.includes(tagName);
                return (
                  <button
                    key={tagName}
                    type="button"
                    onClick={() => addTag(tagName)}
                    className={`room-modal__tag-btn${isActive ? ' room-modal__tag-btn--active' : ''}`}
                  >
                    + {tagName}
                  </button>
                );
              })}
            </div>

            <div className="room-modal__footer">
              <button
                type="button"
                onClick={onClose}
                className="room-modal__cancel-btn"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !topic.trim()}
                className="room-modal__submit-btn"
              >
                <HiPlusCircle size={17} />
                {saving ? 'Creating...' : 'Create Room'}
              </button>
            </div>
          </form>
        </div>
      </div>
      
    </>
  );
}
