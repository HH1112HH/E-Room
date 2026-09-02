# E-Room — Tài liệu tổng quát duy nhất

> Nền tảng luyện nói tiếng Anh real-time theo nhóm 3-5 người + AI hỗ trợ phát âm.
> File này gộp toàn bộ `README.md` + 15 file trong `docs/` thành 1 bản chuẩn theo **code thực tế** (09/2026).

---

## 1. E-Room là gì? (MVP)

Người học đăng ký → chọn tag sở thích (Vibe Coding, Marketing, Physics...) → bấm **Bắt đầu nói** → hệ thống ghép vào phòng 3-5 người → **video call + chat + AI nghe → viết transcript → chấm điểm phát âm 0-10 → sửa lỗi khi điểm < 7** → xem lại lịch sử buổi học. Gói trả phí mở thêm quyền tạo phòng, Expert, TTS, Notes, Series, Leaderboard.

Luồng lõi không bao giờ được cắt: **nói → ra chữ → ra điểm**.

---

## 2. Tech stack thực tế (theo code, không theo docs cũ)

| Tầng | Công nghệ | Ghi chú |
|---|---|---|
| Frontend | React 19, Vite 6, Bootstrap 5 + react-bootstrap, react-router 7, Zustand 5, TanStack Query 5, i18next (vi/en) | `frontend/package.json`, toàn file `.jsx`, không TypeScript/Tailwind |
| Backend | Python 3.13, FastAPI, Uvicorn, SQLModel + Alembic, Pydantic-settings, PyJWT, Argon2 | `backend/pyproject.toml`, `app/main.py`, `app/config.py` |
| Realtime | LiveKit SFU (WebRTC video/audio) + DataChannel, WebSocket FastAPI, coTURN | `livekit.yaml`, `turnserver.conf`, `app/infrastructure/livekit.py`, `webrtc_manager.py` |
| STT | **Whisper local worker** (faster-whisper large-v3 GPU, máy local) qua WebSocket reverse `/ws/whisper-worker` | `app/infrastructure/whisper_manager.py` + `audio_whisper.py` + `scripts/whisper_worker.py`. Không chạy Whisper trong API; không worker = không transcript |
| Chấm phát âm | `PronunciationPipeline`: `probability*100` trung bình → overall 0-100, `<70` thì cần sửa | `app/infrastructure/audio_pipeline.py` + `audio_dictionary.py` (CMU dict). Không Wav2Vec2/GOP |
| LLM | OpenAI-compatible, cấu hình qua `LLM_BASE_URL/MODEL`: mặc định OpenRouter `gemini-2.0-flash`, Docker chạy `llama.cpp gemma-4-E4B :8012` | `app/agent/llm.py`, `app/config.py:42-48`, `docker-compose.yml:llama` |
| RAG/Expert | LangChain + LangChain-OpenAI + text-splitters, Brave Search, MinIO docs | `app/rag/`, `app/agent/expert.py` |
| TTS | Supertonic + gTTS | `app/infrastructure/pronunciation_audio.py` |
| DB/Cache/Storage | TiDB (MySQL-compatible, Docker port **4000**) + Redis 7 + MinIO (S3) | `docker-compose.yml`, `app/database.py`. Test dùng SQLite |
| Payment | Stripe (free/pro/pro_plus) | `app/api/routers/subscription.py` |
| Deploy | Docker Compose **9 services**, Nginx reverse proxy | xem mục 7 |

---

## 3. Cấu trúc dự án

```
E-Room/
├── backend/app/
│   ├── main.py            # lifespan: tạo bảng + seed tags/rooms/admin + warmup + event_bus + heartbeat_loop + whisper queue; mount /api/v1 + 3 WS
│   ├── config.py          # mọi ENV (DB port 4000, Redis, JWT 7 ngày, LLM, Whisper, Stripe, LiveKit, MinIO, heartbeat 15s)
│   ├── api/routers/       # 15 routers: audio, auth, conversation, health, infra, leaderboard, message, notes, notification, room, series, subscription, tag, user, webrtc
│   ├── agent/             # base, llm, corrector, expert, heartbeat, prompt (AI 3-trong-1)
│   ├── infrastructure/    # audio.py (VAD buffer), audio_whisper.py, audio_pipeline.py, audio_dictionary.py, whisper_manager.py, livekit.py, webrtc_manager.py, event_bus.py (Redis pub/sub), redis_client.py, minio.py, video.py, pronunciation_audio.py
│   ├── service/           # auth, room, tag, user, message, conversation, subscription, series, notification, heartbeat_loop, room_state, token_store, model_warmup
│   ├── model/ + schemas/  # SQLModel (User, Tag, Room, Message, Session, Subscription...) + Pydantic DTO
│   ├── seed/              # 10 phòng mẫu + 53 tag + admin
│   └── ws nằm trong api/routers/websocket.py: /ws/rooms/{id}, /ws/audio/{id}, /ws/whisper-worker
├── frontend/src/
│   ├── app/ (App.jsx, AuthContext/Guard, pages: Home/Learning/Profile/Pricing/Payment/Blog/Contact)
│   ├── features/ (auth, rooms, chat, realtime, onboarding 5 bước, sessions, notes, series, leaderboard, subscription, tags, ai)
│   ├── lib/ (websocket.js legacy, webrtc.js LiveKitChannel, audioCapture.js, audioWebRTC.js)
│   ├── stores/ (auth, room, tag, agent, subscription - Zustand) + i18n/ + components/ui
├── docker-compose.yml, nginx.conf, livekit.yaml, turnserver.conf, scripts/whisper_worker.py
```

---

## 4. Kiến trúc hệ thống

```
Browser ──HTTPS──→ Nginx :80 ──┬──→ Frontend :3000 (React)
                               └──→ API :8000 (/api/v1 + /ws/*)
Browser ──WebRTC UDP──────────→ LiveKit :7880/7881 + TURN :3478 (video/audio/DataChannel)
API ──→ TiDB :4000 (users/rooms/messages/sessions) + Redis :6379 (queue/cache/lock/pubsub) + MinIO :9000 (docs/audio)
API ──WS reverse──→ Local GPU worker (faster-whisper large-v3) : trả text+words
API ──HTTP───────→ LLM (:8012 hoặc OpenRouter) + Brave Search (Expert)
```

Phòng là **always-on**: ACTIVE (≥1 user) ↔ DEACTIVE (0 user, giữ context) → chỉ admin mới ARCHIVED.

---

## 5. Hệ thống hoạt động như thế nào? (6 luồng)

### 5.1 Đăng ký + Onboarding
`POST /auth/register` (email/pass, Argon2, JWT access+refresh 7 ngày, blacklist Redis) → Wizard 5 bước: trình độ A1-C2 → tag (tối đa 10, `POST /tags/bulk-add`) → nghề → mục tiêu → xác nhận. Chưa chọn tag = không auto-match, chỉ join tay.

### 5.2 Ghép phòng (Matchmaking)
`POST /rooms/match` → vào `ERoom:queue:tag:{slug}` (Redis SortedSet, score=timestamp) → task nền 5s tính `Jaccard(tags) + level_proximity` → gom 3-5 người → tạo LiveKit room + `agent_level = max(tier)` → WS `match_found {room_id, token, topic}`. Hết 30s/45s/60s thì nới điều kiện dần → phòng AI.

### 5.3 Nói → Chữ → Điểm (luồng lõi)
1. Mic → 2 đường song song: LiveKit (người khác nghe) + `audioCapture.js` cắt PCM 16kHz/2048 samples → base64 → `/ws/audio` (hoặc `POST /webrtc/.../audio/chunk` ở client mới).
2. `AudioBuffer` tính RMS, im lặng >2s = hết câu → `asyncio.create_task(process_speech)`.
3. `transcribe_whisper()`: PCM→WAV → `whisper_manager.send_audio_sync()` → worker local trả `{text, words[{word, probability, start, end}]}`.
4. `PronunciationPipeline.assess()`: tra CMU dict mỗi từ → `score=prob*100` → `overall=mean` → `needs_remediation = overall<70` → broadcast `transcript` + lưu `messages(type=transcript)`.

### 5.4 AI 3-trong-1
- **Corrector:** nếu `<70` → `corrector.correct_text()` (LLM) → `{corrected, errors, pronunciation_feedback, tts_text}` → broadcast `ai_correction` (CorrectionCard + nút nghe mẫu). Free giới hạn 3/phòng.
- **Expert:** hỏi trong chat → embed → vector search top-5 + Brave top-3 → LLM trả lời + sources (`ai_expert_response`). Free không có, Pro chỉ Web, Pro+ full RAG.
- **Heartbeat:** `heartbeat_loop()` mỗi 15s (config), phòng im lặng → LLM sinh câu hỏi gợi chuyện → broadcast. Quota free1/pro3/pro+5.
- Guardrail anti-misuse: chỉ trả lời tiếng Anh + đúng tag phòng, còn lại từ chối lịch sự.

### 5.5 WebRTC migration (đang dở)
Mới: `LiveKitChannel (lib/webrtc.js)` dùng DataChannel `publishData` + REST `/webrtc/...` (chat/audio/finalize/question/tts/signal), server `WebRTCManager.broadcast()` gửi cả LiveKit + WS cũ. Cũ (`websocket.js`) vẫn chạy fallback qua `VITE_USE_WEBRTC=false`.

### 5.6 Sau buổi + tiền + nền
Rời phòng → tính `sessions` (thời gian nói, điểm) → Pro+ sinh `session_notes` markdown. Series/leaderboard/subscription qua Stripe webhook. Task nền in-process (không Celery): matching 5s, heartbeat 15s, cleanup phòng/token, leaderboard. Moderation NSFW + TTS cache MinIO/Redis: code có khung, chưa chạy ổn định.

---

## 6. API, WS, ENV, Ports

- REST prefix `/api/v1`: `auth, rooms (CRUD/join/leave/token/match), messages, sessions(conversation), notes, series, leaderboard, tags(popular/search/custom/bulk-add), notifications, subscriptions(checkout/cancel/webhook/invoices), audio, webrtc, infra(status/health), health`. Swagger ở `:8000/docs`.
- WS: `/ws/rooms/{room_id}` (chat/expert/heartbeat) + `/ws/audio/{room_id}` (PCM) + `/ws/whisper-worker?secret=` (worker GPU).
- Ports: FE 3000, API 8000, TiDB 4000 (+10080 status), Redis 6379, MinIO 9000/9001, LiveKit 7880/7881 + UDP 50000-50100, Llama 8012, TURN 3478, Nginx 80.
- ENV chính (`backend/.env`, xem `config.py`): `DB_HOST/PORT/NAME` (mặc định port 4000), `REDIS_URL`, `SECRET_KEY`, `LLM_BASE_URL/MODEL/API_KEY`, `BRAVE_SEARCH_API_KEY`, `WHISPER_LANGUAGE/TIMEOUT/WORKER_SECRET`, `LIVEKIT_URL/KEY/SECRET`, `MINIO_*`, `STRIPE_*`.

---

## 7. Chạy nhanh

```bash
# Full stack (cần Docker + GPU cho worker nếu muốn STT thật)
docker compose up -d            # 9 services
# FE: http://localhost:3000  API docs: http://localhost:8000/docs  MinIO: http://localhost:9001

# Dev rời:
cd backend; uv sync; uv run python -m app.server   # :8000
cd frontend; npm install; npm run dev               # :3000

# Worker STT (máy có GPU):
pip install -r requirements-worker.txt
set WHISPER_SERVER_URL=wss://<api>/ws/whisper-worker + WHISPER_WORKER_SECRET=...
python scripts/whisper_worker.py
```

Kiểm tra 15 phút khi deploy: mở web → login → tạo/vào phòng → ghi âm 10s ra chữ <5s → có điểm → chat 2 máy → xem log `Error/Traceback/Connection refused`.

---

## 8. Lưu ý lệch docs cũ (đừng tin mù quáng)

- Docs cũ ghi MySQL:3306 / FunASR / Wav2Vec2-GOP / Celery / GPT-4o / Tailwind / TypeScript — **code hiện tại là TiDB:4000 / Whisper-worker / confidence-scoring / asyncio in-process / Gemini-Gemma / Bootstrap / JSX**.
- `backend/README.md` rỗng, `frontend/README.md` còn template CRA.
- NSFW, TTS streaming, auto-note, Stripe production: mới ở mức khung/config, chưa production-ready.
