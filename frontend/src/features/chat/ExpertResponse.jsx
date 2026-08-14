import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HiSparkles, HiLanguage } from 'react-icons/hi2';
import '../../styles/ChatWindow.css';
import './ExpertResponse.css';

export function ExpertResponse({ response }) {
  const { t } = useTranslation();
  const [showVi, setShowVi] = useState(false);
  if (!response) return null;

  return (
    <div className="expert-response">
      <div className="d-flex align-items-start gap-2">
        <div className="expert-response__avatar">
          <HiSparkles size={14} color="#fff" />
        </div>
        <div className="expert-response__content">
          <div className="expert-response__label">
            🧠 {t('sessions.expert_answers')}
          </div>
          <div className="expert-response__text">
            {showVi && response.vi ? response.vi : response.text}
          </div>
          {response.vi && (
            <button
              type="button"
              className="chat-window__translate-btn"
              onClick={() => setShowVi(v => !v)}
            >
              <HiLanguage size={13} />
              <span>{showVi ? t('room.show_original') : t('room.translate')}</span>
            </button>
          )}
          {response.sources && response.sources.length > 0 && (
            <div className="expert-response__sources">
              {response.sources.map((src, i) => (
                <span key={i} className="expert-response__source">
                  🔗 {src.title || src}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
