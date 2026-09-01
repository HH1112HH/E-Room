# WebSocket → WebRTC Migration (via LiveKit)

> Ngày: 2026-05-13 — Tác giả: Muse Spark + HH1112HH

## Tổng quan

Chuyển cấu trúc realtime từ **WebSocket thuần** (`/ws/rooms`, `/ws/audio`) sang **WebRTC qua LiveKit** (SFU + DataChannel). Giữ backward compat để client cũ vẫn chạy.

### Kiến trúc cũ (WebSocket)
```
Client audioCapture.js --WS /ws/audio--> AudioBuffer --VAD--> PronunciationPipeline --WS--> room_connections broadcast
Client websocket.js   --WS /ws/rooms--> handle_room_ws (chat, heartbeat, presence)
heartbeat_loop        --------WS room_connections------> clients
```

Vấn đề:
- WS single-server, khó scale horizontal (phải dùng Redis PubSub + CeleryBridge)
- Audio PCM base64 qua WS tốn băng thông, không tận dụng được LiveKit SFU đã có
- Chưa dùng được chuẩn WebRTC (NAT traversal, E2E)

### Kiến trúc mới (WebRTC + LiveKit)

```
LiveKit SFU (WebRTC)
  ├─ Media: Camera/Mic tracks (đã có) — UDP/TCP 7880-7881, TURN 3478
  └─ DataChannel: chat/transcript/correction/heartbeat via publishData / Server API SendData

Client (RoomPage.jsx)
  ├─ LiveKitChannel (frontend/src/lib/webrtc.js) — publishData({type:'chat'}) + on('dataReceived')
  └─ audioWebRTC (frontend/src/lib/audioWebRTC.js) — POST /webrtc/rooms/{id}/audio/chunk (HTTP over WebRTC session) + optional publishData

Backend
  ├─ LiveKitService.publish_data() (backend/app/infrastructure/livekit.py) — Server API /twirp/livekit.RoomService/SendData
  ├─ WebRTCManager.broadcast() (backend/app/infrastructure/webrtc_manager.py) — fanout: LiveKit + WS fallback + Redis
  ├─ REST router (backend/app/api/routers/webrtc.py): /webrtc/rooms/{id}/chat, /audio/chunk, /audio/finalize, /question, /tts, /signal
  └─ heartbeat.py + websocket.py process_speech — đều gọi webrtc_manager.broadcast() trước, WS là fallback

Fallback: Nếu VITE_USE_WEBRTC=false hoặc LiveKit không reachable, frontend tự fallback về websocket.js + audioCapture.js cũ. Server luôn broadcast cả 2 kênh.
```

## File thay đổi

### Backend
| File | Mô tả |
|------|-------|
| `backend/app/infrastructure/livekit.py` | Thêm `publish_data()`, `publish_data_sync()`, `_http_base()`, `_auth_header_for_room()` dùng `httpx` + JWT admin |
| `backend/app/infrastructure/webrtc_manager.py` | **Mới** — `WebRTCManager.broadcast()` (LiveKit + WS + Redis), signaling store |
| `backend/app/api/routers/webrtc.py` | **Mới** — 8 endpoints REST thay cho WS handlers |
| `backend/app/api/routers/__init__.py` | Export `webrtc` router |
| `backend/app/api/__init__.py` | `include_router(webrtc, prefix="/webrtc")` |
| `backend/app/service/heartbeat.py` | Gửi heartbeat qua `webrtc_manager.broadcast()` thay vì chỉ `room_connections` |
| `backend/app/api/routers/websocket.py` | Thêm `@deprecated` comment, broadcast kép (WebRTC primary + WS fallback) cho `generate_expert_reply`, `transcript`, `ai_correction` |
| `backend/app/main.py` | Comment legacy WS routes (giữ để compat) |

### Frontend
| File | Mô tả |
|------|-------|
| `frontend/src/lib/webrtc.js` | **Mới** — `LiveKitChannel` class (wrap LiveKit Room DataChannel + REST fallback), compat API với `RoomSocket` |
| `frontend/src/lib/audioWebRTC.js` | **Mới** — `createAudioWebRTC()` (POST chunk tới REST + optional publishData), thay `audioCapture.js` |
| `frontend/src/lib/websocket.js` | Thêm JSDoc `@deprecated`, hướng dẫn dùng `webrtc.js` |
| `frontend/src/features/chat/useChatState.js` | Hỗ trợ `webrtcChannel` param (ưu tiên WebRTC, fallback WS), `handleSend`/`handleTTS` qua `rtc.send()` |
| `frontend/src/features/chat/ChatWindow.jsx` | Prop mới `webrtcChannel` |
| `frontend/src/features/rooms/RoomPage.jsx` | `USE_WEBRTC` flag (env `VITE_USE_WEBRTC`), `LiveKitRoomBinder`, tạo `LiveKitChannel` + `createAudioWebRTC` khi `phase===connected` |
| `frontend/src/features/realtime/RealtimeRoomPanel.jsx` | DevTools panel hỗ trợ WebRTC channel |
| `frontend/vite.config.js` | Load cả `REACT_APP_*` và `VITE_*` env |
| `frontend/.env.example` | Thêm `VITE_USE_WEBRTC`, `VITE_WS_BASE_URL`, `VITE_LIVEKIT_URL` |

## ENV

```env
# frontend
VITE_USE_WEBRTC=true   # true = WebRTC (khuyến nghị), false = legacy WS
VITE_WS_BASE_URL=ws://localhost:8000   # fallback WS
VITE_LIVEKIT_URL=ws://localhost:7880
VITE_API_BASE_URL=http://localhost:8000/api/v1

# backend (đã có)
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
```

## Luồng mới

### Chat
1. User gõ → `ChatWindow.handleSend()` → `webrtcChannel.send({type:'chat', text})`
2. `LiveKitChannel._publishRaw()` → `room.localParticipant.publishData()` (DataChannel tới peers) + `fetchJson POST /webrtc/rooms/{id}/chat` (server persist + server broadcast)
3. Server `POST /webrtc/rooms/{id}/chat` → `MessageService.save()` + `webrtc_manager.broadcast()` → LiveKit Server API SendData → tất cả clients `room.on('dataReceived')` → `useChatState` on('chat_message')

### Audio / STT
1. `audioWebRTC` capture ScriptProcessor 16kHz → PCM16 → base64 → `POST /webrtc/rooms/{id}/audio/chunk` (mỗi chunk) + `publishData({type:'audio_chunk'})` optional
2. Server `POST /audio/chunk` → `audio_manager.get(user_id).push(seq, b64)` → VAD check → nếu `speech_end` → `asyncio.create_task(process_speech(pcm))`
3. `process_speech` → Whisper → transcript → `webrtc_manager.broadcast({type:'transcript'})` → clients render transcript + scoring → `ai_correction`/`chat_message` với TTS

### Heartbeat
`heartbeat_loop` (5s tick) → nếu silence >15s → LLM sinh câu hỏi → `webrtc_manager.broadcast({type:'chat_message', sender_id:'assistant'})` → clients

## Tương thích ngược

- Client cũ (WS) vẫn nhận được mọi event vì server `broadcast()` luôn gửi cả `room_connections` (WS).
- Client mới (WebRTC) nếu LiveKit disconnect sẽ fallback về WS (trong `LiveKitChannel`).
- Có thể A/B test: set `VITE_USE_WEBRTC=false` để force WS cũ.

## Test

```bash
# backend compile
uv run python -c "from app.api import api_router; print(len(api_router.routes))"  # expect 61

# frontend build
cd frontend && npm run build  # expect 543 modules, 0 errors
```

## Tiếp theo (nếu cần Pure P2P)

Nếu muốn **P2P mesh không qua LiveKit SFU**, dùng signalling REST đã có:
- `POST /webrtc/rooms/{id}/signal` {sdp, type: offer/answer, candidate, target_user_id}
- `GET /webrtc/rooms/{id}/signal` poll
- Frontend tạo `RTCPeerConnection`, exchange SDP/ICE qua REST này. Không khuyến nghị cho >3 peers (bandwidth O(N²)).
