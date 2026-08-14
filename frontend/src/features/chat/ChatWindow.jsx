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
    <aside className={`chat-window ${visible ? '' : 'chat-window--hidden'}`} aria-label="Bảng trò chuyện phòng">
      <div className="chat-window__feed">
        {loadingHistory ? (
          <div className="chat-window__empty">Đang tải cuộc trò chuyện...</div>
        ) : feedItems.length === 0 ? (
          <div className="chat-window__empty">
            <strong>Bắt đầu cuộc trò chuyện trong phòng</strong>
            <span>Tin nhắn, lời nói trực tiếp và phản hồi sẽ xuất hiện trong cùng một dòng thời gian.</span>
          </div>
        ) : (
          feedItems.map(({ type, item }, index) => {
            if (type === 'speech') {
              const isMySpeech = item.userId && item.userId === currentUserId;
              return (
                <div className={`chat-window__message ${isMySpeech ? 'is-mine' : ''}`} key={item.id || `speech-${index}`}>
                  <span className="chat-window__sender">{isMySpeech ? 'Bạn' : (item.speaker || 'Người dùng')}</span>
                  <div className="chat-window__bubble"><ReactMarkdown>{item.text || item.content || ''}</ReactMarkdown></div>
                </div>
              );
            }

            const isMine = item.senderId === currentUserId;
            const hasTTS = item.ttsAudioBase64;
            return (
              <div className={`chat-window__message ${isMine ? 'is-mine' : ''} ${hasTTS ? 'chat-window__message--has-tts' : ''}`} key={item.id || `chat-${index}`}>
                <span className="chat-window__sender">{isMine ? 'Bạn' : (item.senderId === 'assistant' ? 'Trợ lý' : item.sender)}</span>
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
                    title="Nghe phát âm chuẩn"
                  >
                    <HiSpeakerWave size={14} />
                    <span className="chat-window__tts-label">Phát</span>
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
          placeholder="Nhắn tin cho phòng..."
          aria-label="Nhắn tin cho phòng"
        />
        <button type="submit" disabled={!input.trim()} aria-label="Gửi tin nhắn">
          <HiPaperAirplane size={15} />
        </button>
      </form>
    </aside>
  );
}
