import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { useChatState } from './useChatState';
import { HiPaperAirplane, HiSpeakerWave } from 'react-icons/hi2';
import '../../styles/ChatWindow.css';

function getItemTime(item) {
  return new Date(item.time || item.createdAt || item.timestamp || item.created_at || Date.now()).getTime();
}

export function ChatWindow({ roomId, visible, onToggle, wsSocket }) {
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
    <aside className={`chat-window ${visible ? '' : 'chat-window--hidden'}`} aria-label="Room conversation panel">
      <div className="chat-window__feed">
        {loadingHistory ? (
          <div className="chat-window__empty">Loading conversation...</div>
        ) : feedItems.length === 0 ? (
          <div className="chat-window__empty">
            <strong>Start the room conversation</strong>
            <span>Messages, live speech and feedback will appear in one timeline.</span>
          </div>
        ) : (
          feedItems.map(({ type, item }, index) => {
            if (type === 'speech') {
              return (
                <div className="chat-window__message is-mine" key={item.id || `speech-${index}`}>
                  <span className="chat-window__sender">You</span>
                  <div className="chat-window__bubble"><ReactMarkdown>{item.text || item.content || ''}</ReactMarkdown></div>
                </div>
              );
            }

            const isMine = item.senderId === currentUserId;
            const hasTTS = item.ttsAudioBase64;
            return (
              <div className={`chat-window__message ${isMine ? 'is-mine' : ''} ${hasTTS ? 'chat-window__message--has-tts' : ''}`} key={item.id || `chat-${index}`}>
                <span className="chat-window__sender">{isMine ? 'You' : (item.senderId === 'assistant' ? 'assistant' : item.sender)}</span>
                <div className="chat-window__bubble"><ReactMarkdown>{item.text || ''}</ReactMarkdown></div>
                {hasTTS ? (
                  <button
                    className="chat-window__tts-btn"
                    onClick={() => {
                      if (item.ttsAudioBase64) {
                        new Audio(`data:audio/wav;base64,${item.ttsAudioBase64}`).play();
                      } else if (item.ttsAudioKey) {
                        fetch(`/api/v1/audio/${item.ttsAudioKey}`)
                          .then(r => r.blob())
                          .then(blob => { new Audio(URL.createObjectURL(blob)).play(); });
                      }
                    }}
                    title="Listen to correct pronunciation"
                  >
                    <HiSpeakerWave size={14} />
                    <span className="chat-window__tts-label">Play</span>
                  </button>
                ) : null}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form className="chat-window__composer" onSubmit={handleSend}>
        <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
          placeholder="Message the room..."
          aria-label="Message the room"
        />
        <button type="submit" disabled={!input.trim()} aria-label="Send message">
          <HiPaperAirplane size={15} />
        </button>
      </form>
    </aside>
  );
}
