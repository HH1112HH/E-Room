/**
 * audioWebRTC.js — WebRTC replacement for audioCapture.js (WebSocket PCM streaming)
 *
 * Old: audioCapture.js sent PCM base64 via WebSocket /ws/audio/{roomId} seq chunks
 *        + server VAD polling every 200ms
 * New:  1) Preferred: POST chunks to REST /api/v1/webrtc/rooms/{roomId}/audio/chunk
 *          (HTTP over same WebRTC session, no extra WS, works through LiveKit SFU)
 *       2) Optional: publish raw PCM via LiveKit DataChannel if room available
 *          (server can receive via webhook or via HTTP fallback above)
 *       3) Fallback: legacy WebSocket if REST unavailable (kept for compat)
 *
 * Keeps same public API as createAudioCapture() so RoomPage.jsx change is minimal:
 *   const cap = createAudioWebRTC(roomId, token, { room, enabled }, onStateChange)
 *   cap.start() / cap.stop() / cap.setEnabled()
 */

import { fetchJson, getTokens, API_BASE_URL } from '../api/client';

const SAMPLE_RATE = 16000;
const BUFFER_SIZE = 2048;

// helper: PCM Int16 -> base64
function pcm16ToBase64(int16) {
  const bytes = new Uint8Array(int16.buffer);
  let binary = '';
  // chunk to avoid stack overflow for large arrays
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function postChunk(roomId, seq, base64) {
  try {
    await fetchJson(`/webrtc/rooms/${roomId}/audio/chunk`, {
      method: 'POST',
      body: JSON.stringify({ seq, pcm: base64 }),
    });
    return true;
  } catch (e) {
    // 401/403 -> token expired, will be handled by fetchJson refresh
    console.debug('[audioWebRTC] postChunk failed:', e?.message);
    return false;
  }
}

async function postFinalize(roomId) {
  try {
    await fetchJson(`/webrtc/rooms/${roomId}/audio/finalize`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    return true;
  } catch (e) {
    console.debug('[audioWebRTC] postFinalize failed:', e?.message);
    return false;
  }
}

function tryPublishData(room, payload) {
  if (!room || !room.localParticipant) return false;
  try {
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    // LiveKit DataChannel - unreliable for audio chunks would be better, but we use reliable for now
    room.localParticipant.publishData(bytes, { reliable: true });
    return true;
  } catch (e) {
    console.debug('[audioWebRTC] publishData failed:', e?.message);
    return false;
  }
}

export function createAudioWebRTC(roomId, token, options = {}, onStateChange) {
  // options: { room, enabled, useDataChannel, useLegacyWs }
  const room = options.room || null;
  const useDataChannel = options.useDataChannel !== false; // default true if room provided
  const useLegacyWs = options.useLegacyWs || false;

  let audioCtx = null;
  let source = null;
  let processor = null;
  let stream = null;
  let seq = 0;
  let isActive = false;
  let enabled = options.enabled !== undefined ? options.enabled : true;
  let legacyWs = null;

  // Silence-based finalize (client VAD hint) — mirrors server VAD but we also do server finalization
  let lastVoiceMs = 0;
  let silenceTimer = null;
  const SILENCE_FINALIZE_MS = 1800; // if no push for 1.8s, finalize

  function _scheduleFinalize() {
    if (silenceTimer) clearTimeout(silenceTimer);
    silenceTimer = setTimeout(async () => {
      if (!isActive || !enabled) return;
      // ask server to finalize buffer (server will run VAD check)
      await postFinalize(roomId);
    }, SILENCE_FINALIZE_MS);
  }

  function connectLegacyWs() {
    if (!useLegacyWs) return;
    const loc = window.location;
    const base = import.meta.env.VITE_WS_BASE_URL || `${loc.protocol === 'https:' ? 'wss:' : 'ws:'}//${loc.host}`;
    const url = `${base}/ws/audio/${roomId}?token=${token}`;
    try {
      legacyWs = new WebSocket(url);
      legacyWs.onopen = () => {};
      legacyWs.onclose = () => { legacyWs = null; };
      legacyWs.onerror = () => { try { legacyWs?.close(); } catch {} };
    } catch {}
  }

  async function start() {
    if (isActive) return;
    isActive = true;

    try {
      const audioConstraints = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      } catch {
        console.warn('[audioWebRTC] audio constraints not supported, fallback to audio:true');
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SAMPLE_RATE });
      source = audioCtx.createMediaStreamSource(stream);
      processor = audioCtx.createScriptProcessor(BUFFER_SIZE, 1, 1);

      if (useLegacyWs) connectLegacyWs();
      onStateChange?.(true);

      processor.onaudioprocess = (e) => {
        if (!isActive || !enabled) return;
        const input = e.inputBuffer.getChannelData(0);
        // Simple energy gate — skip near-silent chunks to save bandwidth (mirrors server rms_threshold ~0.08)
        let energy = 0;
        for (let i = 0; i < input.length; i++) energy += input[i] * input[i];
        energy = Math.sqrt(energy / input.length);
        // still send chunk even if silent, so server VAD can detect speech_end; but throttle ultra-silence?
        // we send anyway to keep timing, server handles silence

        const pcm16 = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
          const s = Math.max(-1, Math.min(1, input[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        const base64 = pcm16ToBase64(pcm16);
        const curSeq = seq++;

        // Primary: REST chunk (WebRTC HTTP)
        postChunk(roomId, curSeq, base64);

        // Optional: also publish via LiveKit DataChannel for low-latency path
        if (useDataChannel && room) {
          tryPublishData(room, { type: 'audio_chunk', seq: curSeq, pcm: base64 });
        }

        // Legacy fallback
        if (legacyWs?.readyState === WebSocket.OPEN) {
          try { legacyWs.send(JSON.stringify({ pcm: base64, seq: curSeq })); } catch {}
        }

        if (energy > 0.02) {
          lastVoiceMs = Date.now();
          _scheduleFinalize();
        }
      };

      const muteGain = audioCtx.createGain();
      muteGain.gain.value = 0;
      source.connect(processor);
      processor.connect(muteGain);
      muteGain.connect(audioCtx.destination);
    } catch (err) {
      console.error('[audioWebRTC] capture failed:', err);
      isActive = false;
      onStateChange?.(false);
    }
  }

  function stop() {
    isActive = false;
    if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
    try { processor?.disconnect(); } catch {}
    try { source?.disconnect(); } catch {}
    try { audioCtx?.close(); } catch {}
    try { stream?.getTracks().forEach(t => t.stop()); } catch {}
    try { legacyWs?.close(); } catch {}
    processor = null;
    source = null;
    audioCtx = null;
    stream = null;
    legacyWs = null;
    seq = 0;
    onStateChange?.(false);
  }

  function setEnabled(val) {
    enabled = val;
    // if disabling, finalize any pending server buffer so utterance doesn't hang
    if (!val) {
      postFinalize(roomId);
    }
  }

  // Exposed for explicit finalize (e.g., on mute or leave)
  async function finalize() {
    return postFinalize(roomId);
  }

  return { start, stop, setEnabled, finalize, get isActive() { return isActive; } };
}

// Backward compat alias — drop-in for old import
export const createAudioCapture = createAudioWebRTC;
export default createAudioWebRTC;
