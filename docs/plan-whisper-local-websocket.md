# Kế hoạch: WebSocket Reverse Connection cho Whisper Local

> **Mục tiêu:** Chạy whisper-large-v3 trên máy local (GPU), giữ các service khác trên Render. Render gọi local whisper qua WebSocket reverse connection.

---

## 1. Tổng quan kiến trúc

```
┌─────────────────────────────────────────────────┐
│                 Render (Cloud)                   │
│                                                  │
│  Browser ──WS/audio──→ API ──WS/whisper──→ Local │
│               (FastAPI + Redis + TiDB + Minio)   │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│            Local Machine (GPU)                   │
│                                                  │
│  whisper_worker.py ──WS──→ Render API            │
│  (faster-whisper large-v3, CUDA int8)            │
└─────────────────────────────────────────────────┘
```

**Nguyên lý:** Local whisper chủ động kết nối WebSocket đến Render (outbound connection). Khi cần transcribe, Render gửi audio qua connection đó, local xử lý rồi trả kết quả về. Không cần expose port, không cần tunnel.

---

## 2. Flow chi tiết

### 2.1 Worker khởi động

```
1. Local: python scripts/whisper_worker.py
2. Kết nối WebSocket: wss://e-room-api.onrender.com/ws/whisper-worker?secret=xxx
3. Render API xác thực secret → đăng ký worker vào WhisperWorkerManager
4. Worker gửi heartbeat mỗi 30s
5. Render API giữ connection sống
```

### 2.2 User nói trong phòng

```
1. Browser gửi audio chunks qua /ws/audio/{room_id}
2. VAD detect speech_end → process_speech()
3. PronunciationPipeline.assess(pcm_data)
4. audio_whisper.py: transcribe_whisper()
   ├── Nếu WHISPER_MODE=local → whisper_manager.send_audio(wav, lang)
   │   → Gửi WebSocket đến local worker
   │   ← Nhận kết quả (text + words)
   └── Nếu WHISPER_MODE=groq → Groq API (fallback)
5. CMU dictionary lookup → scoring → broadcast transcript
```

### 2.3 Xử lý lỗi

```
- Worker mất kết nối → auto-reconnect (exponential backoff)
- Worker không trả lời trong 30s → timeout → fallback Groq
- Không có worker nào available → fallback Groq (nếu WHISPER_FALLBACK_GROQ=true)
```

---

## 3. Chi tiết từng file

### 3.1 TẠO MỚI: `scripts/whisper_worker.py`

Local worker script chạy trên máy có GPU.

```python
# Pseudo-code
class WhisperWorker:
    - server_url: str          # wss://e-room-api.onrender.com/ws/whisper-worker
    - secret: str              # WHISPER_WORKER_SECRET
    - model: WhisperModel      # faster-whisper large-v3
    - reconnect_delay: int     # exponential backoff: 1s, 2s, 4s, 8s... max 60s

    async def connect():
        # WebSocket connect đến Render
        # Đăng ký với secret
        # Vòng lặp: nhận message → process → gửi kết quả

    async def process_audio(task_id, wav_b64, language):
        # Decode base64 → WAV bytes
        # Chạy faster-whisper
        # Trả { task_id, text, words: [{word, probability, start, end}] }

    async def heartbeat_loop():
        # Gửi heartbeat mỗi 30s

    async def reconnect():
        # Auto-reconnect với exponential backoff
```

**Dependencies** (`requirements-worker.txt`):
```
faster-whisper>=1.2.1
websockets>=16.0
numpy>=2.0.0
```

### 3.2 TẠO MỚI: `backend/app/infrastructure/whisper_manager.py`

Quản lý danh sách WebSocket workers trên Render.

```python
# Pseudo-code
@dataclass
class WhisperWorker:
    worker_id: str
    websocket: WebSocket
    is_busy: bool = False
    last_heartbeat: float = 0
    tasks_completed: int = 0

class WhisperWorkerManager:
    workers: dict[str, WhisperWorker]

    def register(worker_id, ws):      # Worker kết nối
    def unregister(worker_id):         # Worker ngắt kết nối
    def heartbeat(worker_id):          # Nhận heartbeat

    async def send_audio(wav_bytes, language, timeout=30):
        # 1. Chọn worker availability (round-robin hoặc least-loaded)
        # 2. Tạo task_id (UUID)
        # 3. Gửi WebSocket message: { task_id, audio_wav, language }
        # 4. Tạo asyncio.Future, store theo task_id
        # 5. Chờ Future hoàn thành (timeout 30s)
        # 6. Return (text, words) hoặc raise TimeoutError

    def complete_task(task_id, result):
        # Worker trả kết quả → resolve Future
```

### 3.3 SỬA: `backend/app/infrastructure/audio_whisper.py`

Thêm mode switch giữa local và Groq.

```python
# Pseudo-code
def transcribe_whisper(pcm_data, sample_rate):
    if len(pcm_data) < MIN_AUDIO_BYTES:
        return "", []

    wav_data = _pcm_to_wav(pcm_data, sample_rate)

    if settings.whisper_mode == "local":
        try:
            return _transcribe_local(wav_data)
        except Exception:
            if settings.whisper_fallback_groq:
                logger.warning("Local whisper failed, fallback Groq")
                return _transcribe_groq(wav_data)
            raise
    else:
        return _transcribe_groq(wav_data)

async def _transcribe_local(wav_data):
    from app.infrastructure.whisper_manager import whisper_manager
    return await whisper_manager.send_audio(wav_data, settings.whisper_language)

def _transcribe_groq(wav_data):
    client = _get_groq_client()
    result = client.audio.transcriptions.create(...)
    ...
```

### 3.4 SỬA: `backend/app/api/routers/websocket.py`

Thêm endpoint `/ws/whisper-worker`.

```python
# Pseudo-code
@router.websocket("/ws/whisper-worker")
async def handle_whisper_worker(ws: WebSocket):
    # 1. Xác thực secret từ query param
    secret = ws.query_params.get("secret")
    if secret != settings.whisper_worker_secret:
        await ws.close(code=4001, reason="Invalid secret")
        return

    # 2. Accept connection
    await ws.accept()

    # 3. Đăng ký worker
    worker_id = str(uuid4())
    whisper_manager.register(worker_id, ws)
    log.info("Whisper worker connected: %s", worker_id)

    try:
        # 4. Vòng lặp nhận messages
        while True:
            data = await ws.receive_json()

            if data["type"] == "heartbeat":
                whisper_manager.heartbeat(worker_id)

            elif data["type"] == "transcribe_result":
                whisper_manager.complete_task(data["task_id"], data)

    except WebSocketDisconnect:
        pass
    finally:
        whisper_manager.unregister(worker_id)
        log.info("Whisper worker disconnected: %s", worker_id)
```

### 3.5 SỬA: `backend/app/config.py`

Thêm config vars mới.

```python
# Thêm vào class Settings:
whisper_mode: str = "groq"                    # "local" | "groq"
whisper_worker_secret: str = ""               # Secret cho worker auth
whisper_local_timeout: int = 30               # Timeout chờ worker (s)
whisper_fallback_groq: bool = True            # Fallback sang Groq nếu local fail
```

### 3.6 SỬA: `backend/app/api/middleware/auth.py`

Thêm endpoint worker vào whitelist.

```python
PUBLIC_PATHS = {
    ...
    "/ws/whisper-worker",   # ← THÊM DÒNG NÀY
}
```

### 3.7 SỬA: `backend/app/main.py`

Khởi tạo WhisperWorkerManager khi startup.

```python
# Trong lifespan():
from app.infrastructure.whisper_manager import whisper_manager
# Không cần làm gì特殊, manager tự xử lý khi worker connect
```

### 3.8 SỬA: `.env.example` / `.env.docker`

```bash
# ─── Whisper Mode ──────────────────────────────
# "local" = dùng faster-whisper trên máy local (cần worker kết nối)
# "groq" = dùng Groq API (cần GROQ_API_KEY)
WHISPER_MODE=groq
WHISPER_WORKER_SECRET=change-me-to-random-string
WHISPER_LOCAL_TIMEOUT=30
WHISPER_FALLBACK_GROQ=true
```

---

## 4. Message Protocol

### Worker → Render API

```jsonc
// Heartbeat (mỗi 30s)
{ "type": "heartbeat" }

// Transcribe result
{
  "type": "transcribe_result",
  "task_id": "uuid",
  "text": "hello world",
  "words": [
    { "word": "hello", "probability": 0.92, "start": 0.0, "end": 0.45 },
    { "word": "world", "probability": 0.87, "start": 0.5, "end": 0.95 }
  ]
}
```

### Render API → Worker

```jsonc
// Transcribe request
{
  "type": "transcribe",
  "task_id": "uuid",
  "audio_wav": "<base64 encoded WAV>",
  "language": "en"
}
```

---

## 5. Local Worker Setup

### 5.1 Cài đặt

```bash
# Clone repo hoặc copy scripts/whisper_worker.py
pip install faster-whisper websockets numpy

# Hoặc dùng requirements file
pip install -r requirements-worker.txt
```

### 5.2 Chạy

```bash
# Set env vars
export WHISPER_WORKER_SECRET="your-secret-here"
export WHISPER_SERVER_URL="wss://e-room-api.onrender.com/ws/whisper-worker"

# Chạy worker
python scripts/whisper_worker.py
```

### 5.3 Docker (tùy chọn)

```dockerfile
FROM nvidia/cuda:12.4.0-runtime-ubuntu22.04
# ... cài Python + faster-whisper
CMD ["python", "scripts/whisper_worker.py"]
```

---

## 6. Fallback Strategy

```
WHISPER_MODE=local + WHISPER_FALLBACK_GROQ=true
  → Thử local trước
  → Nếu worker timeout/mất kết nối → tự động fallback Groq

WHISPER_MODE=local + WHISPER_FALLBACK_GROQ=false
  → Chỉ dùng local
  → Nếu fail → trả kết quả rỗng

WHISPER_MODE=groq
  → Luôn dùng Groq API (như hiện tại)
```

---

## 7. An toàn

| Rủi ro | Giải pháp |
|--------|-----------|
| Worker giả mạo | Secret key xác thực, chỉ chấp nhận connection có secret đúng |
| Worker mất kết nối | Auto-reconnect với exponential backoff (1s → 2s → 4s → ... → 60s) |
| Worker không trả lời | Timeout 30s → fallback Groq |
| Audio quá lớn | Giới hạn 15s audio (240KB PCM), worker từ chối nếu lớn hơn |
| Nhiều worker | Round-robin load balancing, mỗi worker xử lý 1 task tại một thời điểm |
| Render sleep | Worker reconnect tự động khi Render wake up |

---

## 8. Timeline thực hiện

| Bước | File | Thời gian ước tính |
|------|------|-------------------|
| 1 | Viết `whisper_manager.py` | 30 phút |
| 2 | Viết `whisper_worker.py` | 45 phút |
| 3 | Sửa `audio_whisper.py` | 15 phút |
| 4 | Sửa `websocket.py` (thêm endpoint) | 15 phút |
| 5 | Sửa `config.py` + env files | 10 phút |
| 6 | Test local → Render | 20 phút |
| **Tổng** | | **~2.5 giờ** |

---

## 9. Checklist sau khi hoàn thành

- [ ] `whisper_manager.py` tạo xong, test được
- [ ] `whisper_worker.py` chạy được trên local, kết nối Render
- [ ] `audio_whisper.py` switch được giữa local và Groq
- [ ] Endpoint `/ws/whisper-worker` hoạt động
- [ ] Config vars thêm vào `.env` và Render dashboard
- [ ] Test: user nói trong phòng → transcript hiện đúng
- [ ] Test: worker mất kết nối → fallback Groq hoạt động
- [ ] Test: worker reconnect tự động
- [ ] Push lên GitHub
