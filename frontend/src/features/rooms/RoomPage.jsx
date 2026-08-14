import { useEffect, useState, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LiveKitRoom, GridLayout, ParticipantTile, useLocalParticipant, useRemoteParticipants, useRoomContext, useTracks, AudioTrack } from '@livekit/components-react';
import '@livekit/components-styles';
import { Track } from 'livekit-client';
import { fetchJson, ApiClient, API_BASE_URL, getTokens } from '../../lib/api';
import { createAudioCapture } from '../../lib/audioCapture';
import { ChatWindow } from '../chat/ChatWindow';
import { useAuth } from '../../app/AuthContext';
import '../../styles/RoomPage.css';
import {
  HiArrowLeft, HiMicrophone, HiVideoCamera, HiVideoCameraSlash,
  HiMicrophone as HiMicOff, HiPhoneXMark, HiChatBubbleLeftRight,
  HiUserGroup, HiShieldExclamation, HiClock, HiCheckCircle, HiArrowRight,
  HiHandRaised, HiFaceSmile, HiComputerDesktop,
  HiUserPlus, HiUser, HiEllipsisVertical, HiCog6Tooth,
} from 'react-icons/hi2';

const SIZES = { topbar: 56, controls: 68 };
const COLOR = {
  danger: 'var(--color-danger)',
  muted: 'var(--color-text-muted)',
  accent: 'var(--color-accent)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
};
const EMOJIS = ['👋', '👍', '❤️', '😂', '🔥', '👏', '🎉', '💯', '✨', '🙌'];

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatParticipantName(name, identity, isLocal) {
  if (isLocal) return 'Bạn';
  if (name && !/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(name)) return name;
  if (name) return 'P' + name.replace(/-/g, '').slice(0, 5);
  if (identity && !/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(identity)) return identity;
  return 'Người tham gia';
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function hashColor(name) {
  const PALETTE = ['#ffffff','#e0e0e0','#ec4899','#f59e0b','#c0c0c0','#a0a0a0','#f43f5e','#d0d0d0'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function ControlBtn({ icon: Icon, active, onClick, label, danger, className = '' }) {
  return (
    <button
      className={`ctrl-btn ${danger ? 'ctrl-btn--danger' : ''} ${active ? 'ctrl-btn--active' : ''} ${className}`}
      onClick={onClick} aria-label={label} title={label}
    >
      <Icon size={20} />
    </button>
  );
}

function MeetControls({ onLeave, togglePanel, activePanel, handRaised, setHandRaised,
  showEmojiPicker, setShowEmojiPicker, sendEmoji, screenShareOn, setScreenShareOn, onMicToggle }) {
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  useEffect(() => {
    if (localParticipant) {
      setMicOn(localParticipant.isMicrophoneEnabled ?? true);
      setCamOn(localParticipant.isCameraEnabled ?? true);
      setScreenShareOn(localParticipant.isScreenShareEnabled ?? false);
    }
  }, [localParticipant]);

  const toggleMic = useCallback(async () => {
    if (!localParticipant) { setMicOn(p => { onMicToggle?.(!p); return !p; }); return; }
    try {
      const newState = !localParticipant.isMicrophoneEnabled;
      await localParticipant.setMicrophoneEnabled(newState);
      setMicOn(newState);
      onMicToggle?.(newState);
    } catch (e) { console.warn('toggleMic:', e); }
  }, [localParticipant, onMicToggle]);

  const toggleCam = useCallback(async () => {
    if (!localParticipant) { setCamOn(p => !p); return; }
    try {
      const newState = !localParticipant.isCameraEnabled;
      await localParticipant.setCameraEnabled(newState);
      setCamOn(newState);
    } catch (e) { console.warn('toggleCam:', e); }
  }, [localParticipant]);

  const toggleScreenShare = useCallback(async () => {
    if (!localParticipant) { setScreenShareOn(p => !p); return; }
    try {
      const newState = !localParticipant.isScreenShareEnabled;
      await localParticipant.setScreenShareEnabled(newState);
      setScreenShareOn(newState);
    } catch (e) { console.warn('toggleScreenShare:', e); }
  }, [localParticipant, setScreenShareOn]);

  const toggleHandRaise = useCallback(() => {
    setHandRaised(prev => {
      const newState = !prev;
      if (localParticipant) {
        try {
          const data = JSON.stringify({ type: 'hand_raise', state: newState });
          localParticipant.publishData(new TextEncoder().encode(data), { reliable: true });
        } catch {}
      }
      return newState;
    });
  }, [localParticipant, setHandRaised]);

  useEffect(() => {
    if (!room) return;
    const handler = (payload, participant) => {
      if (!participant || participant.identity === localParticipant?.identity) return;
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload));
        if (msg.type === 'hand_raise') {
          window.dispatchEvent(new CustomEvent('hand-raise-notif', {
            detail: { identity: participant.identity, name: participant.name || 'Người tham gia', state: msg.state, id: Date.now() + Math.random() }
          }));
        }
      } catch {}
    };
    room.on('dataReceived', handler);
    return () => room.off('dataReceived', handler);
  }, [room, localParticipant]);

  return (
    <footer className="meet-controls">
      <div className="meet-controls-center">
        <ControlBtn icon={HiComputerDesktop} active={screenShareOn}
          onClick={toggleScreenShare}
          label={screenShareOn ? 'Dừng chia sẻ' : 'Chia sẻ màn hình'}
        />
        <ControlBtn icon={micOn ? HiMicrophone : HiMicOff} active={micOn}
          onClick={toggleMic}
          label={micOn ? 'Tắt mic' : 'Bật mic'}
        />
        <ControlBtn icon={camOn ? HiVideoCamera : HiVideoCameraSlash} active={camOn}
          onClick={toggleCam}
          label={camOn ? 'Tắt cam' : 'Bật cam'}
        />
        <ControlBtn icon={HiHandRaised} active={handRaised}
          onClick={toggleHandRaise}
          label={handRaised ? 'Hạ tay' : 'Giơ tay'}
        />
        <div className="meet-controls__emoji-wrap">
          <ControlBtn icon={HiFaceSmile} active={showEmojiPicker}
            onClick={() => setShowEmojiPicker(prev => !prev)}
            label="Gửi cảm xúc"
          />
          {showEmojiPicker && (
            <div className="meet-controls__emoji-picker">
              {EMOJIS.map(emoji => (
                <button key={emoji} onClick={() => sendEmoji(emoji)} className="meet-controls__emoji-btn">{emoji}</button>
              ))}
            </div>
          )}
        </div>
        <button className="ctrl-hangup" onClick={onLeave} title="Rời cuộc gọi">
          <HiPhoneXMark size={24} color="#fff" />
        </button>
        <ControlBtn icon={HiChatBubbleLeftRight} active={activePanel === 'chat'}
          onClick={() => togglePanel('chat')}
          label={activePanel === 'chat' ? 'Ẩn trò chuyện' : 'Hiện trò chuyện'}
        />
      </div>
    </footer>
  );
}

function ParticipantTracker({ onUpdate }) {
  const remoteParticipants = useRemoteParticipants();
  const { localParticipant } = useLocalParticipant();
  const callbackRef = useRef(onUpdate);
  callbackRef.current = onUpdate;
  useEffect(() => {
    const all = [];
    if (localParticipant) {
      all.push({
        identity: localParticipant.identity || 'local',
        name: formatParticipantName(localParticipant.name, localParticipant.identity, true),
        isLocal: true, micOn: localParticipant.isMicrophoneEnabled,
        camOn: localParticipant.isCameraEnabled, screenOn: localParticipant.isScreenShareEnabled,
      });
    }
    (remoteParticipants || []).forEach(p => {
      all.push({
        identity: p.identity || 'unknown',
        name: formatParticipantName(p.name, p.identity, false),
        isLocal: false, micOn: p.isMicrophoneEnabled,
        camOn: p.isCameraEnabled, screenOn: p.isScreenShareEnabled,
      });
    });
    callbackRef.current(all);
  }, [localParticipant, remoteParticipants]);
  return null;
}

function EmojiFly({ emojis }) {
  return (
    <>
      {emojis.map(e => (
        <div key={e.id} style={{
          position: 'absolute', top: e.y, left: e.x,
          fontSize: '2.5rem', pointerEvents: 'none', zIndex: 100,
          animation: 'emojiFloat 2s ease-out forwards',
        }}>{e.emoji}</div>
      ))}
      
    </>
  );
}

function SelfPreview() {
  const [expanded, setExpanded] = useState(false);
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }]);
  const localTrack = tracks.find(track => track?.participant?.isLocal);

  return (
    <div className={`self-preview ${expanded ? 'is-expanded' : ''}`}>
      <div className="self-preview-badge">Bạn</div>
      <button className="self-preview-expand" onClick={() => setExpanded(prev => !prev)}>
        {expanded ? 'Thu nhỏ' : 'Mở rộng'}
      </button>
      <div className="self-preview-feed">
        {localTrack ? <ParticipantTile trackRef={localTrack} /> : (
          <div className="self-avatar">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
          </div>
        )}
      </div>
    </div>
  );
}

function RemoteAudioRenderer() {
  const remoteParticipants = useRemoteParticipants();
  return (
    <>
      {remoteParticipants?.map(p => (
        <AudioTrack key={p.identity} trackRef={{ participant: p, source: Track.Source.Microphone }} />
      ))}
    </>
  );
}

function WaitingForOthers() {
  return (
    <div className="waiting-card">
      <div className="waiting-icon"><HiUserGroup size={40} color={COLOR.muted} /></div>
      <h3 className="waiting-title">Đang chờ người khác tham gia</h3>
      <p className="waiting-sub">Chia sẻ liên kết phòng để mời người tham gia. Phòng này đang hoạt động.</p>
      
    </div>
  );
}

function getTrackKey(trackRef) {
  return `${trackRef?.participant?.identity || 'unknown'}:${trackRef?.source || 'camera'}`;
}

function VideoArea({ isSharing, isHandRaised }) {
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ]);
  const roomTracks = tracks.filter(track => !track?.participant?.isLocal || track?.source === Track.Source.ScreenShare);
  const screenTracks = roomTracks.filter(track => track?.source === Track.Source.ScreenShare);
  const cameraTracks = roomTracks.filter(track => track?.source !== Track.Source.ScreenShare);
  const orderedTracks = [...screenTracks, ...cameraTracks];
  const [pinnedKey, setPinnedKey] = useState(null);
  const pinnedTrack = orderedTracks.find(track => getTrackKey(track) === pinnedKey) || screenTracks[0];
  const sideTracks = pinnedTrack ? orderedTracks.filter(track => getTrackKey(track) !== getTrackKey(pinnedTrack)) : orderedTracks;

  function renderTile(track, pinned = false) {
    const key = getTrackKey(track);
    return (
      <div className={`meet-video-tile ${pinned ? 'is-pinned' : ''}`} key={key}>
        <ParticipantTile trackRef={track} />
      </div>
    );
  }

  return (
    <div className="room-page__video-inner">
      {pinnedTrack ? (
        <div className="meet-focus-layout">
          <div className="meet-focus-main">
            {renderTile(pinnedTrack, true)}
            <button className="meet-focus-clear" onClick={() => setPinnedKey(null)}>Quay lại lưới</button>
          </div>
          <div className="meet-focus-strip">
            {sideTracks.length > 0 ? sideTracks.map(track => renderTile(track)) : (!isSharing && <WaitingForOthers />)}
          </div>
        </div>
      ) : (
        <div className="meet-adaptive-grid">
          {orderedTracks.length > 0 ? orderedTracks.map(track => renderTile(track)) : (!isSharing && <WaitingForOthers />)}
        </div>
      )}
      {isSharing && (
        <div className="meet-room-notice meet-room-notice--share">
          <HiComputerDesktop size={16} /> Đang chia sẻ màn hình
        </div>
      )}
      {isHandRaised && (
        <div className="meet-room-notice meet-room-notice--hand">
          <HiHandRaised size={16} /> Đã giơ tay
        </div>
      )}
    </div>
  );
}

function ConnectingGate() {
  return (
    <div className="room-page__connecting-wrap">
      <div className="room-page__connecting-spinner" />
      <p className="room-page__connecting-text">Đang kết nối phòng...</p>
      
    </div>
  );
}

function getFriends() { try { return JSON.parse(localStorage.getItem('eroom-friends')||'[]'); } catch { return []; } }
function addFriend(identity, name) { const f=getFriends(); if(!f.find(x=>x.id===identity)){f.push({id:identity,name,addedAt:Date.now()});localStorage.setItem('eroom-friends',JSON.stringify(f));} }
function removeFriend(identity) { const f=getFriends().filter(x=>x.id!==identity); localStorage.setItem('eroom-friends',JSON.stringify(f)); }
function isFriend(identity) { return getFriends().some(x=>x.id===identity); }

function ParticipantsPanel({ participants, onClose }) {
  const friends = getFriends();
  return (
    <aside className="room-page__panel">
      <header className="room-page__panel-header">
        <div className="room-page__panel-header-left">
          <span className="room-page__panel-header-icon"><HiUserGroup size={16} /></span>
          <h3 className="room-page__panel-header-title">Người tham gia</h3>
          <span className="room-page__panel-header-count">{participants?.length ?? 0}</span>
        </div>
        <button onClick={onClose} aria-label="Đóng" className="room-page__panel-close-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
      </header>
      <div className="room-page__panel-body">
        {participants.map((p, i) => {
          const alreadyFriend = isFriend(p.identity);
          return (
            <div key={p.identity || i} className="room-page__panel-row">
              <div className="room-page__panel-avatar" style={{ background: hashColor(p.name) }}>
                {getInitials(p.name)}
                <div className="room-page__panel-dot" style={{ background: p.camOn ? 'var(--color-success)' : 'var(--color-text-muted)' }} />
              </div>
              <div className="room-page__panel-row-name-wrap">
                <div className="room-page__panel-row-name">
                  {p.name}
                  {p.isLocal && <span className="room-page__panel-you-badge">Bạn</span>}
                </div>
                <div className="room-page__panel-status-row">
                  <span className="room-page__panel-status-item" style={{ color: p.micOn ? 'var(--color-success)' : 'var(--color-danger)' }}>
                    <span className="room-page__panel-status-dot" style={{ background: p.micOn ? 'var(--color-success)' : 'var(--color-danger)' }} />
                    {p.micOn ? 'Mic bật' : 'Đã tắt tiếng'}
                  </span>
                  <span className="room-page__panel-status-item" style={{ color: p.camOn ? 'var(--color-success)' : 'var(--color-danger)' }}>
                    <span className="room-page__panel-status-dot" style={{ background: p.camOn ? 'var(--color-success)' : 'var(--color-danger)' }} />
                    {p.camOn ? 'Cam bật' : 'Cam tắt'}
                  </span>
                </div>
              </div>
              {!p.isLocal && (
                alreadyFriend ? (
                  <button onClick={() => removeFriend(p.identity)} className="room-page__panel-btn-friend"><HiUser size={11} /> Bạn bè</button>
                ) : (
                  <button onClick={() => addFriend(p.identity, p.name)} className="room-page__panel-btn-add"><HiUserPlus size={11} /> Thêm bạn</button>
                ))}
            </div>
          );
        })}
      </div>
      {friends.length > 0 && (
        <div className="room-page__panel-friends-section">
          <div className="room-page__panel-friends-title">Bạn bè ({friends.length})</div>
          <div className="room-page__panel-friends-row">
            {friends.map(f => (
              <span key={f.id} className="room-page__panel-friend-tag">
                <div className="room-page__panel-friend-avatar" style={{ background: hashColor(f.name) }}>{getInitials(f.name)}</div>
                {f.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}

const ENGLISH_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const AGENT_LEVELS = [
  { value: 'basic', label: 'Cơ bản', desc: 'Phản hồi phát âm cơ bản' },
  { value: 'advanced', label: 'Nâng cao', desc: 'Mẹo ngữ pháp + chọn từ' },
  { value: 'full', label: 'Đầy đủ', desc: 'Huấn luyện viên hội thoại AI toàn diện' },
];
const DURATIONS = [
  { value: 300, label: '5 phút' },
  { value: 600, label: '10 phút' },
  { value: 900, label: '15 phút' },
  { value: 1200, label: '20 phút' },
  { value: 1800, label: '30 phút' },
  { value: 2700, label: '45 phút' },
  { value: 3600, label: '60 phút' },
];

function ToggleSwitch({ label, value, onChange }) {
  return (
    <div className="room-settings__toggle-row" onClick={() => onChange(!value)}>
      <span className="room-settings__toggle-label">{label}</span>
      <div className={`room-settings__toggle ${value ? 'active' : ''}`}>
        <div className="room-settings__toggle-knob" />
      </div>
    </div>
  );
}

function RoomSettings({ roomId, current, onClose, onSave, api }) {
  const [topic, setTopic] = useState(current.topic || '');
  const [englishLevel, setEnglishLevel] = useState(current.english_level || '');
  const [agentLevel, setAgentLevel] = useState(current.agent_level || 'basic');
  const [maxParticipants, setMaxParticipants] = useState(current.max_participants || 5);
  const [duration, setDuration] = useState(current.session_duration_seconds || 900);
  const [enableHeartbeat, setEnableHeartbeat] = useState(current.enable_heartbeat !== false);
  const [enableCorrection, setEnableCorrection] = useState(current.enable_pronunciation_correction !== false);
  const [enableVoice, setEnableVoice] = useState(current.enable_voice_recognition !== false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveError('');
    try {
      await api.patch(`/rooms/${roomId}`, {
        topic: topic || undefined,
        english_level: englishLevel || undefined,
        agent_level: agentLevel,
        max_participants: maxParticipants,
        session_duration_seconds: duration,
        enable_heartbeat: enableHeartbeat,
        enable_pronunciation_correction: enableCorrection,
        enable_voice_recognition: enableVoice,
      });
      if (onSave) await onSave();
      onClose();
    } catch (err) {
      setSaveError(err?.message || 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  }, [roomId, topic, englishLevel, agentLevel, maxParticipants, duration, enableHeartbeat, enableCorrection, enableVoice, api, onSave, onClose]);

  return (
    <aside className="room-page__panel">
      <header className="room-page__panel-header">
        <div className="room-page__panel-header-left">
          <span className="room-page__panel-header-icon"><HiCog6Tooth size={16} /></span>
          <h3 className="room-page__panel-header-title">Cài đặt phòng</h3>
        </div>
        <button onClick={onClose} aria-label="Đóng" className="room-page__panel-close-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
      </header>
      <div className="room-page__panel-body room-settings__body">
        <div className="room-settings__group">
          <label className="room-settings__label">Chủ đề</label>
          <input className="room-settings__input" value={topic} onChange={e => setTopic(e.target.value)} placeholder="Chủ đề thảo luận" />
        </div>
        <div className="room-settings__group">
          <label className="room-settings__label">Trình độ tiếng Anh</label>
          <div className="room-settings__chips">
            <button className={`room-settings__chip ${!englishLevel ? 'active' : ''}`} onClick={() => setEnglishLevel('')}>Bất kỳ</button>
            {ENGLISH_LEVELS.map(lv => (
              <button key={lv} className={`room-settings__chip ${englishLevel === lv ? 'active' : ''}`} onClick={() => setEnglishLevel(lv)}>{lv}</button>
            ))}
          </div>
        </div>
        <div className="room-settings__group">
          <label className="room-settings__label">Trình độ AI</label>
          <div className="room-settings__agent-options">
            {AGENT_LEVELS.map(al => (
              <button key={al.value} className={`room-settings__agent-card ${agentLevel === al.value ? 'active' : ''}`} onClick={() => setAgentLevel(al.value)}>
                <div className="room-settings__agent-name">{al.label}</div>
                <div className="room-settings__agent-desc">{al.desc}</div>
              </button>
            ))}
          </div>
        </div>
        <div className="room-settings__group">
          <label className="room-settings__label">Tối đa người tham gia: {maxParticipants}</label>
          <div className="room-settings__chips">
            {[2, 3, 4, 5].map(n => (
              <button key={n} className={`room-settings__chip ${maxParticipants === n ? 'active' : ''}`} onClick={() => setMaxParticipants(n)}>{n}</button>
            ))}
          </div>
        </div>
        <div className="room-settings__group">
          <label className="room-settings__label">Thời lượng buổi học</label>
          <div className="room-settings__chips">
            {DURATIONS.map(d => (
              <button key={d.value} className={`room-settings__chip ${duration === d.value ? 'active' : ''}`} onClick={() => setDuration(d.value)}>{d.label}</button>
            ))}
          </div>
        </div>
        <div className="room-settings__divider" />
        <div className="room-settings__group">
          <label className="room-settings__label">Tính năng</label>
          <ToggleSwitch label="Câu hỏi gợi ý" value={enableHeartbeat} onChange={setEnableHeartbeat} />
          <ToggleSwitch label="Sửa lỗi phát âm" value={enableCorrection} onChange={setEnableCorrection} />
          <ToggleSwitch label="Nhận diện giọng nói" value={enableVoice} onChange={setEnableVoice} />
        </div>
      </div>
      {saveError && <div className="room-settings__error">{saveError}</div>}
      <div className="room-page__panel-footer room-settings__footer">
        <button className="room-settings__btn room-settings__btn--cancel" onClick={onClose}>Hủy</button>
        <button className="room-settings__btn room-settings__btn--save" onClick={handleSave} disabled={saving}>
          {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
        </button>
      </div>
    </aside>
  );
}


export function RoomPage() {
  const api = new ApiClient();
  const { roomId } = useParams();
  const navigate = useNavigate();
  const hasLeftRef = useRef(false);
  const [token, setToken] = useState('');
  const [livekitUrl, setLivekitUrl] = useState('');
  const [roomName, setRoomName] = useState('');
  const [roomData, setRoomData] = useState(null);
  const [error, setError] = useState('');
  const [phase, setPhase] = useState('loading');
  const [activePanel, setActivePanel] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [screenShareOn, setScreenShareOn] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [savedElapsed, setSavedElapsed] = useState(0);
  const [participantsList, setParticipantsList] = useState([]);
  const [floatingEmojis, setFloatingEmojis] = useState([]);
  const [handRaiseNotifs, setHandRaiseNotifs] = useState([]);
  const wsRef = useRef(null);
  const [wsSocket, setWsSocket] = useState(null);
  const audioWsRef = useRef(null);
  const audioCaptureRef = useRef(null);
  const micEnabledRef = useRef(true);
  const [wsParticipants, setWsParticipants] = useState(0);
  const [retrySignal, setRetrySignal] = useState(0);
  const joinedRef = useRef(false);

  const handleDisconnected = useCallback(() => {
    if (!hasLeftRef.current) {

      setError('Mất kết nối phòng. Vui lòng thử lại.');
      setPhase('error');
    } else {
      setPhase('left');
    }
  }, []);

  const handleRetry = useCallback(() => {
    setPhase('loading');
    setRetrySignal(s => s + 1);
  }, []);
  const refreshRoomData = useCallback(async () => {
    try {
      const data = await fetchJson(`/rooms/${roomId}`);
      setRoomData(data);
      setRoomName(data?.topic || data?.name || data?.room_name || 'Phòng');
    } catch {}
  }, [roomId]);

  const handleLeave = useCallback(() => {
    hasLeftRef.current = true;
    api.post(`/rooms/${roomId}/leave`, {}).catch(() => {});
    setPhase('left');
  }, [roomId]);
  const goBack = useCallback(() => { navigate('/learning'); }, [navigate]);

  useEffect(() => {
    return () => {
      if (hasLeftRef.current) return;
      api.post(`/rooms/${roomId}/leave`, {}).catch(() => {});
    };
  }, [roomId]);

  useEffect(() => {
    if (phase !== 'connected') return;
    const iv = setInterval(() => setElapsed(prev => prev + 1), 1000);
    return () => clearInterval(iv);
  }, [phase]);

  useEffect(() => {
    if (floatingEmojis.length === 0) return;
    const timeout = setTimeout(() => {
      setFloatingEmojis(prev => prev.filter(e => Date.now() - e.id < 2000));
    }, 2000);
    return () => clearTimeout(timeout);
  }, [floatingEmojis]);

  useEffect(() => {
    const handler = (e) => {
      setHandRaiseNotifs(prev => {
        const exists = prev.some(n => n.identity === e.detail.identity);
        if (exists) return prev;
        return [...prev, { ...e.detail }].slice(-3);
      });
    };
    window.addEventListener('hand-raise-notif', handler);
    return () => window.removeEventListener('hand-raise-notif', handler);
  }, []);

  useEffect(() => {
    if (handRaiseNotifs.length === 0) return;
    const timeout = setTimeout(() => {
      setHandRaiseNotifs(prev => prev.filter(n => Date.now() - n.id < 6000));
    }, 6000);
    return () => clearTimeout(timeout);
  }, [handRaiseNotifs]);

  useEffect(() => {
    let cancelled = false;
    async function joinAndGetToken() {
      try {
        const roomData = await fetchJson(`/rooms/${roomId}`);
        if (cancelled) return;
        setRoomName(roomData?.topic || roomData?.name || roomData?.room_name || 'Phòng');
        setRoomData(roomData);
        if (!joinedRef.current) {
          await api.post(`/rooms/${roomId}/join`, {});
          joinedRef.current = true;
        }
        if (cancelled) return;
        const tokenResult = await api.post(`/rooms/${roomId}/token`);
        if (cancelled) return;

        const backendUrl = tokenResult.livekit_url || '';
        const host = `${window.location.hostname}:7880`;
        const lkUrl = backendUrl
          .replace(/localhost/, window.location.hostname)
          .replace(/ws:\/\/livekit:/, `ws://${host}`)
          .replace(/ws:\/\/lk:/, `ws://${host}`)
        const finalUrl = lkUrl || `ws://${host}`;
        setToken(tokenResult.livekit_token);
        setLivekitUrl(finalUrl);
        setPhase('connected');
      } catch (err) {
        if (!cancelled) { setError(err.message); setPhase('error'); }
      }
    }
    joinAndGetToken();
    return () => { cancelled = true; };
  }, [roomId, retrySignal]);

  useEffect(() => {
    if (phase === 'left' && elapsed > 0) setSavedElapsed(elapsed);
  }, [phase, elapsed]);

  useEffect(() => {
    if (phase !== 'connected') return;
    const authToken = getTokens()?.access || '';
    const loc = window.location;
    const wsBase = import.meta.env.VITE_WS_BASE_URL || `${loc.protocol === 'https:' ? 'wss:' : 'ws:'}//${loc.host}`;

    const wsUrl = `${wsBase}/ws/rooms/${roomId}?token=${authToken}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    setWsSocket(ws);

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'system') {
          if (data.event === 'user_joined' || data.event === 'user_left') {
            setWsParticipants(data.participant_count || 0);
          }
        } else if (data.type === 'presence') {
          setWsParticipants(data.connections || 0);
        }
      } catch {}
    };

    return () => {
      ws.close();
      wsRef.current = null;
      setWsSocket(null);
    };
  }, [phase, roomId]);

  useEffect(() => {
    if (phase !== 'connected') {
      if (audioCaptureRef.current) {
        audioCaptureRef.current.stop();
        audioCaptureRef.current = null;
      }
      return;
    }
    const authToken = getTokens()?.access || '';
    if (!authToken) return;
    const capture = createAudioCapture(roomId, authToken, audioWsRef, undefined, { enabled: micEnabledRef.current });
    audioCaptureRef.current = capture;
    capture.start();
    return () => {
      capture.stop();
      audioCaptureRef.current = null;
    };
  }, [phase, roomId]);

  const handleMicToggle = useCallback((enabled) => {
    micEnabledRef.current = enabled;
    audioCaptureRef.current?.setEnabled(enabled);
  }, []);

  const handleParticipantUpdate = useCallback((list) => {
    setParticipantsList(prev => {
      if (!Array.isArray(list)) return prev;
      if (prev.length !== list.length) return list;
      const same = prev.every((p, i) =>
        p.identity === list[i]?.identity &&
        p.micOn === list[i]?.micOn && p.camOn === list[i]?.camOn && p.screenOn === list[i]?.screenOn
      );
      return same ? prev : list;
    });
  }, []);

  function togglePanel(panel) { setActivePanel(prev => prev === panel ? null : panel); }
  function openParticipants() { setActivePanel(prev => prev === 'participants' ? null : 'participants'); }

  function sendEmoji(emoji) {
    setShowEmojiPicker(false);
    const id = Date.now();
    setFloatingEmojis(prev => [...prev, { id, emoji, x: 30 + Math.random() * 40 + '%', y: 30 + Math.random() * 30 + '%' }]);
  }

  if (phase === 'loading') {
    return (
      <div className="room-page__loading-wrap">
        <ConnectingGate />
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="room-page__error-wrap">
        <HiShieldExclamation size={48} color={COLOR.danger} />
        <h2 className="room-page__error-title">Không thể vào phòng</h2>
        <p className="room-page__error-message">{error}</p>
        <div className="room-page__error-actions">
          <button className="room-btn-sec" onClick={handleRetry}>Thử lại</button>
          <button className="room-btn-pri" onClick={goBack}>Quay lại Luyện tập</button>
        </div>
        
      </div>
    );
  }

  if (phase === 'left') {
    return (
      <div className="room-page__left-wrap">
        <div className="room-page__left-card">
          <div className="room-page__left-icon-wrap">
            <HiCheckCircle size={36} color={COLOR.success} />
          </div>
          <h2 className="room-page__left-title">Bạn đã rời phòng</h2>
          <p className="room-page__left-message">
            Cảm ơn bạn đã tham gia <strong>{roomName || 'buổi học'}</strong>!
          </p>
          <div className="room-page__left-stats">
            <div className="room-page__left-stat">
              <div className="room-page__left-stat-value">{formatTime(savedElapsed || elapsed)}</div>
              <div className="room-page__left-stat-label">Thời lượng</div>
            </div>
            <div className="room-page__left-stat">
              <div className="room-page__left-stat-value">{participantsList.length || 1}</div>
              <div className="room-page__left-stat-label">Người tham gia</div>
            </div>
          </div>
          <button onClick={goBack} className="room-page__left-return-btn">Quay lại Luyện tập <HiArrowRight size={16} /></button>
        </div>
        
      </div>
    );
  }

  const showSidebar = activePanel === 'chat' || activePanel === 'participants' || activePanel === 'settings';
  const participantCount = participantsList.length || 1;

  return (
    <div className="meet-root">

      <header className="meet-topbar">
        <div className="meet-topbar-left">
          <button className="meet-back" onClick={goBack} title="Quay lại"><HiArrowLeft size={20} /></button>
          <div className="meet-room-info">
            <h1 className="meet-room-name">{roomName || 'Phòng'}</h1>
            <div className="meet-room-meta">
              <span className="meet-badge-live">● TRỰC TIẾP</span>
              <span className="meet-timer"><HiClock size={13} />{formatTime(elapsed)}</span>
            </div>
          </div>
        </div>
        <div className="meet-topbar-right">
          {handRaised && (
            <span className="room-page__hand-raised-badge">✋ Đã giơ tay</span>
          )}
          <button className={`meet-participant-count ${activePanel==='participants'?'active':''}`} onClick={openParticipants} title="Xem người tham gia"
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 99, background: activePanel==='participants'?'rgba(255,255,255,0.14)':'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', fontSize: 12, color: '#ffffff', fontFamily: 'inherit', transition: 'all 0.15s' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
            <span>{participantCount}</span>
          </button>
          <button className={`meet-chat-toggle ${activePanel==='settings'?'active':''}`} onClick={()=>togglePanel('settings')} title="Cài đặt phòng" style={{ marginRight: 4 }}>
            <HiCog6Tooth size={18} />
          </button>
          <button className={`meet-chat-toggle ${activePanel==='chat'?'active':''}`} onClick={()=>togglePanel('chat')} title={activePanel==='chat'?'Ẩn trò chuyện':'Hiện trò chuyện'}>
            <HiChatBubbleLeftRight size={18} />
          </button>
        </div>
      </header>

      <div className="meet-main">
        <div className={`meet-video ${showSidebar ? 'with-chat' : 'full'}`}>
          <LiveKitRoom token={token} serverUrl={livekitUrl} video={true} audio={true} onDisconnected={handleDisconnected}
            className="room-page__livekit" data-lk-theme="default">
            <RemoteAudioRenderer />
            <MeetControls onLeave={handleLeave} togglePanel={togglePanel} activePanel={activePanel}
              handRaised={handRaised} setHandRaised={setHandRaised}
              showEmojiPicker={showEmojiPicker} setShowEmojiPicker={setShowEmojiPicker}
              sendEmoji={sendEmoji} screenShareOn={screenShareOn} setScreenShareOn={setScreenShareOn}
              onMicToggle={handleMicToggle} />
            <ParticipantTracker onUpdate={handleParticipantUpdate} />
            <EmojiFly emojis={floatingEmojis} />
            <VideoArea isSharing={screenShareOn} isHandRaised={handRaised} />
            <SelfPreview />
          </LiveKitRoom>
        </div>

        <ChatWindow
          roomId={roomId}
          visible={activePanel === 'chat'}
          onToggle={() => setActivePanel(null)}
          wsSocket={wsSocket}
        />
        {activePanel === 'participants' && (
          <aside className="meet-chat-panel"><ParticipantsPanel participants={participantsList} onClose={() => setActivePanel(null)} /></aside>
        )}
        {activePanel === 'settings' && roomData && (
          <aside className="meet-chat-panel">
            <RoomSettings roomId={roomId} current={roomData} onClose={() => setActivePanel(null)} onSave={refreshRoomData} api={api} />
          </aside>
        )}
      </div>

      {handRaiseNotifs.map((n, i) => (
        <div key={n.id} style={{
          position: 'fixed', top: SIZES.topbar + 16 + (i * 52), right: 20,
          padding: '10px 16px', borderRadius: 12, zIndex: 200,
          background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)',
          color: 'var(--color-warning)', fontSize: 13, fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: 8,
          animation: 'slideIn 0.3s ease both, fadeOut 0.3s ease 5s forwards',
          pointerEvents: 'none',
        }}>
          ✋ {n.name || 'Ai đó'} đã giơ tay!
        </div>
      ))}

      
    </div>
  );
}
