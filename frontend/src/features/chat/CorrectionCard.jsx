import { useState } from 'react';
import { HiSpeakerWave, HiCheckCircle, HiXCircle } from 'react-icons/hi2';
import './CorrectionCard.css';

export function CorrectionCard({ correction, onTTS }) {
  const [showExplanation, setShowExplanation] = useState(false);

  if (!correction) return null;

  return (
    <div className="correction-card">
      <div className="d-flex align-items-start gap-2">
        <div className="correction-card__avatar">
          <HiCheckCircle size={14} className="correction-card__icon" />
        </div>
        <div className="correction-card__content">
          {/* Original */}
          <div className="correction-card__original">
            <span className="correction-card__original-text">
              {correction.original}
            </span>
          </div>
          {/* Corrected */}
          <div className="correction-card__corrected">
            {correction.corrected}
            {correction.severity === 'major' && (
              <span className="correction-card__severity">
                QUAN TRỌNG
              </span>
            )}
          </div>
          {/* Type badge */}
          <div className="correction-card__type-row">
            <span className="correction-card__type-badge">
              {correction.type}
            </span>
          </div>
          {/* Explanation toggle */}
          <div
            onClick={() => setShowExplanation(!showExplanation)}
            className="correction-card__explanation"
          >
            {showExplanation ? correction.explanation : 'Tại sao? Chạm để mở rộng'}
          </div>
          {/* TTS button */}
          {onTTS && (
            <button
              onClick={() => onTTS(correction.corrected)}
              className="correction-card__tts-btn"
              onMouseOver={(e) => { e.currentTarget.style.background = 'var(--color-bg-hover)'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <HiSpeakerWave size={14} /> Nghe phát âm chuẩn
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
