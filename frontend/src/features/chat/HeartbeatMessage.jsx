import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HiSparkles, HiLanguage } from 'react-icons/hi2';
import '../../styles/ChatWindow.css';
import './HeartbeatMessage.css';

const HEARTBEAT_EMOJIS = ['🤖', '💡', '🗣️', '🎯', '💬'];

export function HeartbeatMessage({ message }) {
  const { t } = useTranslation();
  const [emoji] = useState(() => HEARTBEAT_EMOJIS[Math.floor(Math.random() * HEARTBEAT_EMOJIS.length)]);
  const [showVi, setShowVi] = useState(false);

  if (!message) return null;

  return (
    <div className="heartbeat-message">
      <div className="d-flex align-items-start gap-2">
        <div className="heartbeat-message__avatar">
          {emoji}
        </div>
        <div className="heartbeat-message__content">
          <div className="heartbeat-message__label">
            {t('room.ai_coach')}
          </div>
          <div className="heartbeat-message__text">
            {showVi && message.vi ? message.vi : message.text}
          </div>
          {message.vi && (
            <button
              type="button"
              className="chat-window__translate-btn"
              onClick={() => setShowVi(v => !v)}
            >
              <HiLanguage size={13} />
              <span>{showVi ? t('room.show_original') : t('room.translate')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
