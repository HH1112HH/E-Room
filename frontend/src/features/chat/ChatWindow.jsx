import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import { useChatState } from './useChatState';
import { HiPaperAirplane, HiSpeakerWave, HiLanguage } from 'react-icons/hi2';
import '../../styles/ChatWindow.css';

function getItemTime(item) {
  return new Date(item.time || item.createdAt || item.timestamp || item.created_at || Date.now()).getTime();
}

function ChatBubble({ item, isMine, onTTS }) {
  const { t } = useTranslation();
  const [showVi, setShowVi] = useState(false);
  const text = item.text || item.content || '';
  const hasTTS = item.ttsAudioBase64 || item.ttsAudioKey;
  const hasTranslation = !!item.vi;

  return (
    <div className="chat-window__bubble">
      <ReactMarkdown>{showVi && item.vi ? item.vi : text}</ReactMarkdown>
      {(hasTranslation || hasTTS) && (
        <div className="chat-window__bubble-actions">
          {hasTranslation && (
            <button
              type="button"
              className="chat-window__translate-btn"
              onClick={() => setShowVi(v => !v)}
              title={showVi ? t('room.show_original') : t('room.translate')}
            >
              <HiLanguage size={13} />
              <span>{showVi ? t('room.show_original') : t('room.translate')}</span>
            </button>
          )}
          {hasTTS && (
            <button
              type="button"
              className="chat-window__tts-btn"
              onClick={onTTS}
              title={t('room.listen_pronunciation')}
            >
              <HiSpeakerWave size={14} />
              <span className="chat-window__tts-label">{t('room.play')}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function ChatWindow({ roomId, visible, onToggle, wsSocket }) {
  const { t } = useTranslation();
  const {
    transcripts, chatMessages,
    loadingHistory, input, setInput, inputRef, bottomRef,
    handleSend, currentUserId,
  } = useChatState(roomId, wsSocket, visible);

  const feedItems = useMemo(() => {
    const chat = chatMessages.map((message) => ({ type: 'chat', item: message, time: getItemTime(message) }));
    const speech = transcripts.map((message) => ({ type: 'speech', item: message, time: getItemTime(message) }));

    return [...chat, ...speech].sort((a, b) => a.time - b.time);
  }, [chatMessages, transcripts]);

  return (
    <aside className={`chat-window ${visible ? '' : 'chat-window--hidden'}`} aria-label={t('room.chat_panel_label')}>
      <div className="chat-window__feed">
        {loadingHistory ? (
          <div className="chat-window__empty">{t('room.loading_chat')}</div>
        ) : feedItems.length === 0 ? (
          <div className="chat-window__empty">
            <strong>{t('room.chat_start')}</strong>
            <span>{t('room.chat_start_desc')}</span>
          </div>
        ) : (
          feedItems.map(({ type, item }, index) => {
            if (type === 'speech') {
              const isMySpeech = item.userId && item.userId === currentUserId;
              return (
                <div className={`chat-window__message ${isMySpeech ? 'is-mine' : ''}`} key={item.id || `speech-${index}`}>
                  <span className="chat-window__sender">{isMySpeech ? t('room.you') : (item.speaker || t('room.user'))}</span>
                  <div className="chat-window__bubble"><ReactMarkdown>{item.text || item.content || ''}</ReactMarkdown></div>
                </div>
              );
            }

            const isMine = item.senderId === currentUserId;
            const hasTTS = item.ttsAudioBase64;
            return (
              <div className={`chat-window__message ${isMine ? 'is-mine' : ''} ${hasTTS ? 'chat-window__message--has-tts' : ''}`} key={item.id || `chat-${index}`}>
                <span className="chat-window__sender">{isMine ? t('room.you') : (item.senderId === 'assistant' ? t('room.assistant') : item.sender)}</span>
                <ChatBubble
                  item={item}
                  isMine={isMine}
                  onTTS={() => {
                    if (item.ttsAudioBase64) {
                      new Audio(`data:audio/wav;base64,${item.ttsAudioBase64}`).play();
                    } else if (item.ttsAudioKey) {
                      fetch(`/api/v1/audio/${item.ttsAudioKey}`)
                        .then(r => r.blob())
                        .then(blob => { new Audio(URL.createObjectURL(blob)).play(); });
                    }
                  }}
                />
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form className="chat-window__composer" onSubmit={handleSend}>
        <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
          placeholder={t('room.chat_placeholder')}
          aria-label={t('room.chat_placeholder')}
        />
        <button type="submit" disabled={!input.trim()} aria-label={t('room.send_message')}>
          <HiPaperAirplane size={15} />
        </button>
      </form>
    </aside>
  );
}
