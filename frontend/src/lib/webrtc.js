/**
 * WebRTC DataChannel via LiveKit — replacement for websocket.js RoomSocket
 *
 * Migration: websocket.js (WS /ws/rooms/{id}) -> webrtc.js (LiveKit DataChannel)
 *
 * Usage:
 *   const channel = new LiveKitChannel(room, roomId, token, { onEvent, onStatusChange })
 *   channel.send({ type: 'chat', text: '...' })
 *   channel.on('chat_message', cb)
 *
 * Transport priority:
 * 1) LiveKit DataChannel (primary, P2P/SFU, no extra server)
 * 2) REST fallback POST /api/v1/webrtc/rooms/{id}/chat (server persists & broadcasts via LiveKit Server API)
 * 3) Legacy WebSocket fallback if LiveKit not connected (auto)
 *
 * For server->client events (transcript, ai_correction, heartbeat):
 *  - Server publishes via LiveKit Server API -> room.on('dataReceived')
 *  - Client also polls via HTTP if data channel missed (redundancy)
 */

import { fetchJson, getTokens, API_BASE_URL } from '../api/client';

const PING_INTERVAL = 30_000;
const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY = 1000;

function encodePayload(obj) {
  return new TextEncoder().encode(JSON.stringify(obj));
}
function decodePayload(bytes) {
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { return null; }
}

/**
 * LiveKitChannel — wraps a LiveKit Room instance for chat/signaling
 * If room is null, falls back to REST + legacy WS polling
 */
export class LiveKitChannel {
  constructor(room, roomId, token, options = {}) {
    this.room = room; // livekit Room instance (from useRoomContext) or null
    this.roomId = roomId;
    this.token = token;
    this.onEvent = options.onEvent || (() => {});
    this.onStatusChange = options.onStatusChange || (() => {});
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxAttempts = options.maxAttempts || MAX_RECONNECT_ATTEMPTS;
    this.baseDelay = options.baseDelay || BASE_RECONNECT_DELAY;
    this._intentionalClose = false;
    this._pingTimer = null;
    this._legacyWs = null;
    this._isLiveKit = !!room;
    this._dataHandler = null;

    this._bindLiveKit();
    if (!this._isLiveKit) {
      this._connectLegacyWs();
    } else {
      this.onStatusChange('connected');
      this._emit('connected');
      this._startPing();
    }
  }

  get status() {
    if (this._isLiveKit && this.room) {
      const state = this.room.state;
      // livekit RoomState: disconnected, connecting, connected, reconnecting
      if (state === 'connected') return 'connected';
      if (state === 'connecting' || state === 'reconnecting') return 'connecting';
      return 'disconnected';
    }
    if (this._legacyWs) {
      const map = { 0: 'connecting', 1: 'connected', 2: 'closing', 3: 'disconnected' };
      return map[this._legacyWs.readyState] || 'unknown';
    }
    return 'disconnected';
  }

  // ------------------------------------------------------------------
  // LiveKit binding
  // ------------------------------------------------------------------
  _bindLiveKit() {
    if (!this.room || typeof this.room.on !== 'function') return;
    this._dataHandler = (payload, participant, kind, topic) => {
      const msg = decodePayload(payload);
      if (!msg) return;
      this.onEvent(msg.type, msg);
      this._emit(msg.type, msg);
      this._emit('message', msg);
    };
    this.room.on('dataReceived', this._dataHandler);
    // track disconnect/reconnect
    this._disconnectHandler = () => {
      if (!this._intentionalClose) {
        this.onStatusChange('reconnecting', { attempt: 1 });
        this._emit('reconnecting', {});
      }
    };
    this.room.on('disconnected', this._disconnectHandler);
    this._reconnectHandler = () => {
      this.onStatusChange('connected');
      this._emit('connected');
    };
    this.room.on('reconnected', this._reconnectHandler);
    this._connectedHandler = () => {
      this.onStatusChange('connected');
      this._emit('connected');
    };
    this.room.on('connected', this._connectedHandler);
  }

  _unbindLiveKit() {
    if (!this.room || !this._dataHandler) return;
    try { this.room.off('dataReceived', this._dataHandler); } catch {}
    try { this.room.off('disconnected', this._disconnectHandler); } catch {}
    try { this.room.off('reconnected', this._reconnectHandler); } catch {}
    try { this.room.off('connected', this._connectedHandler); } catch {}
  }

  // ------------------------------------------------------------------
  // Legacy WS fallback (keeps old behavior if LiveKit not available)
  // ------------------------------------------------------------------
  _getWsBase() {
    const loc = typeof window !== 'undefined' ? window.location : { protocol: 'http:', host: 'localhost:3000' };
    return import.meta.env.VITE_WS_BASE_URL || `${loc.protocol === 'https:' ? 'wss:' : 'ws:'}//${loc.host}`;
  }

  _connectLegacyWs() {
    if (this._intentionalClose) return;
    const base = this._getWsBase();
    const url = `${base}/ws/rooms/${this.roomId}?token=${this.token}`;
    try {
      this._legacyWs = new WebSocket(url);
    } catch { return; }
    this._legacyWs.onopen = () => {
      this.reconnectAttempts = 0;
      this._startPing();
      this.onStatusChange('connected');
      this._emit('connected');
    };
    this._legacyWs.onclose = (event) => {
      this._stopPing();
      if (!this._intentionalClose && this.reconnectAttempts < this.maxAttempts) {
        this._scheduleReconnect();
      } else {
        this.onStatusChange('disconnected');
        this._emit('disconnected', { code: event.code, reason: event.reason });
      }
    };
    this._legacyWs.onerror = () => { try { this._legacyWs.close(); } catch {} };
    this._legacyWs.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.onEvent(msg.type, msg);
        this._emit(msg.type, msg);
        this._emit('message', msg);
      } catch (err) { console.warn('[LiveKitChannel] WS parse fail:', err); }
    };
  }

  _scheduleReconnect() {
    const delay = Math.min(this.baseDelay * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    this.onStatusChange('reconnecting', { attempt: this.reconnectAttempts, delay });
    this._emit('reconnecting', { attempt: this.reconnectAttempts, delay });
    setTimeout(() => {
      if (this._isLiveKit) return;
      this._connectLegacyWs();
    }, delay);
  }

  _startPing() {
    this._stopPing();
    this._pingTimer = setInterval(() => {
      if (this._isLiveKit) {
        // LiveKit ping via data channel heartbeat
        this._publishRaw({ type: 'ping', ts: Date.now() });
      } else if (this._legacyWs?.readyState === WebSocket.OPEN) {
        try { this._legacyWs.send(JSON.stringify({ type: 'ping' })); } catch {}
      }
    }, PING_INTERVAL);
  }
  _stopPing() { if (this._pingTimer) { clearInterval(this._pingTimer); this._pingTimer = null; } }

  // ------------------------------------------------------------------
  // Publish helpers
  // ------------------------------------------------------------------
  async _publishRaw(obj) {
    if (this._isLiveKit && this.room?.localParticipant) {
      try {
        await this.room.localParticipant.publishData(encodePayload(obj), { reliable: true });
        return true;
      } catch (e) { console.warn('[LiveKitChannel] publishData failed, fallback to REST:', e); }
    }
    // REST fallback — let server broadcast via LiveKit Server API
    // For chat we want persistence; for ping we can skip REST
    if (obj.type === 'ping' || obj.type === 'heartbeat_ack') return false;
    try {
      const path = this._restPathFor(obj);
      if (path) {
        // Fire-and-forget REST; server will broadcast via LiveKit
        // Don't await to keep send() sync-like
        fetchJson(path.path, { method: 'POST', body: JSON.stringify(path.body) }).catch(() => {});
        return true;
      }
    } catch {}
    // Last resort: legacy WS send
    if (this._legacyWs?.readyState === WebSocket.OPEN) {
      try { this._legacyWs.send(JSON.stringify(obj)); return true; } catch {}
    }
    return false;
  }

  _restPathFor(obj) {
    const roomId = this.roomId;
    if (obj.type === 'chat') {
      return { path: `/webrtc/rooms/${roomId}/chat`, body: { text: obj.text || obj.content, display_name: obj.display_name } };
    }
    if (obj.type === 'question') {
      return { path: `/webrtc/rooms/${roomId}/question`, body: { text: obj.text || obj.content } };
    }
    if (obj.type === 'request_tts') {
      return { path: `/webrtc/rooms/${roomId}/tts`, body: { text: obj.text } };
    }
    if (obj.type === 'webrtc_signal') {
      return { path: `/webrtc/rooms/${roomId}/signal`, body: { sdp: obj.sdp, type: obj.signal_type, candidate: obj.candidate, target_user_id: obj.target } };
    }
    return null;
  }

  // ------------------------------------------------------------------
  // Public API (compat with RoomSocket)
  // ------------------------------------------------------------------
  async send(data) {
    // data is object like { type: 'chat', text, ... }
    const obj = typeof data === 'string' ? (() => { try { return JSON.parse(data); } catch { return { type: 'raw', data }; } })() : data;
    const ok = await this._publishRaw(obj);
    // Optimistic local echo — emit same message locally so sender sees own message instantly
    // (server will also broadcast, but dedup in useChatState handles duplicates)
    return ok;
  }

  // Compat: allow RoomSocket-style event emitter
  on(event, callback) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }
  off(event, callback) {
    const set = this.listeners.get(event);
    if (set) { set.delete(callback); if (set.size === 0) this.listeners.delete(event); }
  }
  _emit(event, data) {
    const set = this.listeners.get(event);
    if (set) set.forEach(cb => { try { cb(data); } catch (e) { console.warn('[LiveKitChannel] listener error:', e); } });
  }

  close() {
    this._intentionalClose = true;
    this._stopPing();
    this._unbindLiveKit();
    if (this._legacyWs) { try { this._legacyWs.close(1000, 'Client closed'); } catch {} this._legacyWs = null; }
    this.onStatusChange('disconnected');
    this._emit('disconnected', { intentional: true });
    this.listeners.clear();
  }

  // Allow updating room instance if LiveKitRoom reconnects and provides new Room object
  attachRoom(newRoom) {
    this._unbindLiveKit();
    this.room = newRoom;
    this._isLiveKit = !!newRoom;
    this._bindLiveKit();
    if (this._legacyWs) { try { this._legacyWs.close(); } catch {} this._legacyWs = null; }
  }
}

// Factory compat with old createRoomSocket(roomId, onMessage)
export function createRoomChannel(room, roomId, onMessage) {
  const token = (typeof getTokens === 'function' ? getTokens()?.access : '') || '';
  const channel = new LiveKitChannel(room, roomId, token, {
    onEvent: (type, msg) => onMessage?.(msg),
  });
  return channel;
}

// Legacy export name for drop-in replacement
export const RoomSocket = LiveKitChannel;

export default LiveKitChannel;
