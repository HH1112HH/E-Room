import { useEffect, useRef } from 'react';
import './ChatTranscript.css';

export function ChatTranscript({ messages = [], loading }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (loading) {
    return <div className="text-muted text-center py-4 chat-transcript-loading">Loading transcript...</div>;
  }

  if (messages.length === 0) {
    return (
      <div className="text-center py-5 chat-transcript-empty">
        <div className="chat-transcript-empty-emoji">🎙️</div>
        <div className="chat-transcript-empty-title">No speech yet</div>
        <div className="chat-transcript-empty-desc">Start speaking — transcript appears here instantly</div>
      </div>
    );
  }

  return (
    <div className="chat-transcript-list">
      {messages.map((msg, i) => (
        <div key={msg.id || i} className="chat-transcript-row" style={{
          opacity: msg.status === 'interim' ? 0.7 : 1,
        }}>
          <span className="fw-bold chat-transcript-speaker" style={{
            color: msg.speakerColor || 'var(--color-accent)',
          }}>
            {msg.speaker || 'You'}
          </span>
          <span className="chat-transcript-text" style={{
            color: msg.status === 'interim' ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
            fontStyle: msg.status === 'interim' ? 'italic' : 'normal',
          }}>
            {msg.text}
            {msg.status === 'interim' && <span className="blink chat-transcript-cursor">▌</span>}
          </span>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
