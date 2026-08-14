import { useEffect, useState, useRef } from 'react';
import { HiSpeakerWave, HiPlay, HiPause } from 'react-icons/hi2';
import './TTSPlayer.css';

export function TTSPlayer({ text, onPlay, audioUrl }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);

  function togglePlay() {
    if (audioUrl) {
      if (playing) {
        audioRef.current?.pause();
      } else {
        audioRef.current?.play();
      }
      setPlaying(!playing);
      return;
    }

    onPlay?.(text);
    setPlaying(true);

    setTimeout(() => setPlaying(false), 3000);
  }

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  }, [audioUrl]);

  return (
    <button
      onClick={togglePlay}
      className="tts-player-btn"
      style={{
        background: playing ? 'var(--color-accent-muted)' : 'var(--color-bg-surface)',
        color: playing ? 'var(--color-accent)' : 'var(--color-text-secondary)',
      }}
      onMouseOver={(e) => { e.currentTarget.style.background = 'var(--color-bg-hover)'; }}
      onMouseOut={(e) => { e.currentTarget.style.background = playing ? 'var(--color-accent-muted)' : 'var(--color-bg-surface)'; }}
    >
      {playing ? <HiPause size={16} /> : <HiSpeakerWave size={16} />}
      {playing ? 'Đang phát...' : 'Nghe thử'}
    </button>
  );
}
