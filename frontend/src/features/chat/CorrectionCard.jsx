import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HiSpeakerWave, HiCheckCircle, HiXCircle, HiStar } from 'react-icons/hi2';
import './CorrectionCard.css';

export function CorrectionCard({ correction, onTTS }) {
  const { t } = useTranslation();
  const [showDetails, setShowDetails] = useState(false);

  if (!correction) return null;

  const errors = correction.errors || [];
  const score = correction.score || 0;
  const hasErrors = errors.length > 0;

  return (
    <div className="correction-card">
      <div className="d-flex align-items-start gap-2">
        <div className="correction-card__avatar">
          <HiCheckCircle size={14} className="correction-card__icon" />
        </div>
        <div className="correction-card__content">
          {/* Score badge */}
          <div className="correction-card__score-row">
            <HiStar size={14} className="correction-card__score-icon" />
            <span className="correction-card__score">{score}/10</span>
          </div>

          {/* Original */}
          <div className="correction-card__original">
            <span className="correction-card__original-text">
              {correction.original}
            </span>
          </div>

          {/* Corrected */}
          <div className="correction-card__corrected">
            {correction.corrected}
          </div>

          {/* Errors list */}
          {hasErrors && (
            <div className="correction-card__errors">
              {errors.map((err, i) => (
                <div key={i} className="correction-card__error-item">
                  <span className="correction-card__error-original">
                    <HiXCircle size={12} /> {err.original}
                  </span>
                  <span className="correction-card__error-corrected">
                    → {err.corrected}
                  </span>
                  {err.explanation && (
                    <div className="correction-card__error-explanation">
                      {err.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pronunciation feedback toggle */}
          {correction.pronunciation_feedback && (
            <div
              onClick={() => setShowDetails(!showDetails)}
              className="correction-card__explanation"
            >
              {showDetails ? correction.pronunciation_feedback : t('room.why_tap')}
            </div>
          )}

          {/* TTS button */}
          {onTTS && (
            <button
              onClick={() => onTTS(correction.corrected)}
              className="correction-card__tts-btn"
              onMouseOver={(e) => { e.currentTarget.style.background = 'var(--color-bg-hover)'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <HiSpeakerWave size={14} /> {t('room.listen_pronunciation')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
