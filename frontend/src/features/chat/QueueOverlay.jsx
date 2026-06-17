import { useState, useEffect } from 'react';
import Spinner from 'react-bootstrap/Spinner';
import './QueueOverlay.css';

export function QueueOverlay({ visible, tags = [], onCancel }) {
  const [dots, setDots] = useState('');
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const dotInterval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    const timerInterval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => {
      clearInterval(dotInterval);
      clearInterval(timerInterval);
      setElapsed(0);
    };
  }, [visible]);

  if (!visible) return null;

  const remaining = Math.max(0, 30 - elapsed);
  const showFallback = elapsed > 25;

  return (
    <div className="queue-overlay">
      <div className="queue-overlay__inner">
        {/* Animated search icon */}
        <div className="queue-overlay__icon-ring">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          {/* Rotating ring */}
          <Spinner animation="border" variant="primary" size="sm" className="queue-overlay__spinner" />
        </div>

        <h4 className="fw-extrabold mb-2 queue-overlay__heading">
          Finding your match{dots}
        </h4>

        {tags.length > 0 && (
          <p className="mb-2 queue-overlay__tags-text">
            Looking for people interested in
            <span className="queue-overlay__tags-highlight">
              {' '}{tags.join(', ')}
            </span>
          </p>
        )}

        <p className="queue-overlay__wait-text">
          {showFallback
            ? 'No matches found yet. Expanding search...'
            : `Est. wait: ~${remaining}s`}
        </p>

        {/* Fallback options */}
        {showFallback && (
          <div className="queue-overlay__fallback">
            <p className="small mb-2 queue-overlay__fallback-heading">
              💡 Taking longer than expected
            </p>
            <div className="queue-overlay__fallback-actions">
              <span className="queue-overlay__badge-secondary">
                🔄 Expand tags
              </span>
              <span className="queue-overlay__badge-accent">
                🤖 Practice with AI
              </span>
            </div>
          </div>
        )}

        <button
          onClick={onCancel}
          className="queue-overlay__cancel-btn"
          onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
