import { useEffect, useState } from 'react';
import { HiSparkles } from 'react-icons/hi2';
import './HeartbeatMessage.css';

const HEARTBEAT_EMOJIS = ['🤖', '💡', '🗣️', '🎯', '💬'];

export function HeartbeatMessage({ message }) {
  const [emoji] = useState(() => HEARTBEAT_EMOJIS[Math.floor(Math.random() * HEARTBEAT_EMOJIS.length)]);

  if (!message) return null;

  return (
    <div className="heartbeat-message">
      <div className="d-flex align-items-start gap-2">
        <div className="heartbeat-message__avatar">
          {emoji}
        </div>
        <div className="heartbeat-message__content">
          <div className="heartbeat-message__label">
            AI Coach
          </div>
          <div className="heartbeat-message__text">
            {message.text}
          </div>
        </div>
      </div>
    </div>
  );
}
