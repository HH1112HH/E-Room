import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchJson } from '../../lib/api';
import { useAuth } from '../../app/AuthContext';

export function useChatState(roomId, wsSocket, visible) {
  const { user } = useAuth();
  const currentUser = user?.display_name || 'You';
  const currentUserId = user?.id || 'me';

  const [transcripts, setTranscripts] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [input, setInput] = useState('');

  const wsRef = useRef(wsSocket);
  const inputRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => { wsRef.current = wsSocket; }, [wsSocket]);

  // WebSocket listeners
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws) return;

    const isRaw = typeof ws.addEventListener === 'function';
    const listeners = [];

    function on(wsEvent, callback) {
      if (isRaw) {
        const handler = (e) => {
          try {
            const msg = JSON.parse(e.data);
            if (msg.type === wsEvent) callback(msg);
          } catch {}
        };
        ws.addEventListener('message', handler);
        listeners.push(() => ws.removeEventListener('message', handler));
      } else {
        const unsub = ws.on(wsEvent, callback);
        listeners.push(unsub);
      }
    }

    on('transcript', (data) => {
      setTranscripts((prev) => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        const ts = new Date(data.created_at || Date.now());
        const speaker = data.display_name || data.speaker || data.user_id;
        const userId = data.user_id;
        if (data.status === 'interim' && lastIdx >= 0 && updated[lastIdx].status === 'interim') {
          updated[lastIdx] = { ...updated[lastIdx], text: data.text };
        } else if (data.status === 'interim') {
          updated.push({ id: Date.now(), speaker, userId, text: data.text, status: 'interim', speakerColor: data.speaker_color, time: ts });
        } else if (lastIdx >= 0 && updated[lastIdx].status === 'interim' && updated[lastIdx].speaker === speaker) {
          updated[lastIdx] = { ...updated[lastIdx], text: data.text, status: 'final', time: ts };
        } else {
          updated.push({ id: Date.now(), speaker, userId, text: data.text, status: 'final', speakerColor: data.speaker_color, time: ts });
        }
        return updated.slice(-200);
      });
    });

    on('chat_message', (data) => {
      const userId = data.user_id || data.sender_id;
      const text = data.content || data.text || data.question || '';
      const ttsBase64 = data.tts_audio_base64 || '';
      const ttsKey = data.tts_audio_key || '';
      setChatMessages((prev) => {
        const isDuplicate = prev.some(m =>
          m.senderId === userId && m.text === text &&
          (Date.now() - m.time.getTime()) < 3000
        );
        if (isDuplicate) return prev;
        const msg = {
          id: data.id || data.question_id || Date.now(),
          senderId: userId || 'guest',
          sender: data.display_name || 'User',
          text: text,
          time: new Date(data.timestamp || Date.now()),
        };
        if (ttsBase64) msg.ttsAudioBase64 = ttsBase64;
        if (ttsKey) msg.ttsAudioKey = ttsKey;
        if (ttsBase64) {
          try {
            const audio = new Audio(`data:audio/wav;base64,${ttsBase64}`);
            audio.play();
          } catch (err) {
            console.warn('TTS playback failed:', err);
          }
        }
        return [...prev, msg];
      });
    });

    return () => listeners.forEach((fn) => fn?.());
  }, [wsSocket]);

  // Load chat history
  useEffect(() => {
    if (!roomId) return;
    setLoadingHistory(true);
    fetchJson(`/messages/rooms/${roomId}`)
      .then((msgs) => {
        if (Array.isArray(msgs)) {
          const chats = [];
          const speech = [];
          for (const m of msgs) {
            if (m.message_type === 'ai_expert' || m.message_type === 'ai_heartbeat') {
              const p = m.payload || {};
              const item = { id: m.id, senderId: 'assistant', sender: 'assistant', text: m.content, time: new Date(m.created_at) };
              if (p.tts_audio_base64) item.ttsAudioBase64 = p.tts_audio_base64;
              if (p.tts_audio_key) item.ttsAudioKey = p.tts_audio_key;
              chats.push(item);
            } else if (m.message_type === 'ai_correction') {
              continue;
            } else if (m.message_type === 'transcript') {
              speech.push({ id: m.id, speaker: m.payload?.display_name || 'You', userId: m.user_id, text: m.content, status: 'final', time: new Date(m.created_at) });
            } else {
              chats.push({
                id: m.id || Date.now() + Math.random(),
                senderId: m.user_id || 'guest',
                sender: m.payload?.display_name || m.display_name || m.user_id?.slice(0, 8) || 'User',
                text: m.content || m.text,
                time: new Date(m.created_at || Date.now()),
              });
            }
          }
          setChatMessages(chats);
          setTranscripts(speech);
        }
      })
      .catch((err) => console.error('[ChatHistory] Failed to load:', err))
      .finally(() => setLoadingHistory(false));
  }, [roomId, visible]);

  useEffect(() => {
    if (visible) setTimeout(() => inputRef.current?.focus(), 150);
  }, [visible]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, transcripts]);

  const handleSend = useCallback((e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text) return;

    setChatMessages((prev) => [...prev, {
      id: Date.now(), senderId: currentUserId, sender: currentUser, text, time: new Date(),
    }]);

    const ws = wsRef.current;
    if (ws && typeof ws.send === 'function') {
      const isRaw = typeof ws.addEventListener === 'function';
      const payload = { type: 'chat', text, room_id: roomId, display_name: currentUser, timestamp: new Date().toISOString() };
      if (isRaw) {
        ws.send(JSON.stringify(payload));
      } else {
        ws.send(payload);
      }
    }
    setInput('');
  }, [input, currentUserId, currentUser, roomId]);

  const handleTTS = useCallback((text) => {
    const ws = wsRef.current;
    if (ws && typeof ws.send === 'function') {
      const isRaw = typeof ws.addEventListener === 'function';
      if (isRaw) {
        ws.send(JSON.stringify({ type: 'request_tts', text, room_id: roomId }));
      } else {
        ws.send({ type: 'request_tts', text, room_id: roomId });
      }
    }
  }, [roomId]);

  return {
    transcripts, chatMessages,
    loadingHistory, input, setInput, inputRef, bottomRef,
    handleSend, handleTTS, currentUser, currentUserId,
  };
}
