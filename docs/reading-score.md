# Chấm điểm đọc bằng AI — logic & thiết kế UI

> Quy ước UX đã khóa: **điểm từng chữ bị ẨN mặc định sau khi chấm**.
> Muốn xem phải bấm **Thống kê điểm số** (bảng riêng).
> **Nhận xét AI** là nút độc lập thứ hai.

## 1. Luồng chấm điểm (backend — đã verify code)

```
Mic/user ──▶ VAD cắt câu ──▶ Whisper STT (raw, pronunciation=None)
      ──▶ user sửa corrected_text (PATCH)
      ──▶ POST .../score  → chấm trên corrected_text + audio ĐẦU–CUỐI lượt nói
      ──▶ POST .../feedback → Nemotron đọc ScoringReport đã lưu, không chấm lại
```

| Bước | API | Luật |
|---|---|---|
| Sửa câu | `PATCH /rooms/{room_id}/speech-logs/{message_id}` `{corrected_text}` | Sửa sau khi đã chấm → `pronunciation` + `feedback` reset về `None`, bắt chấm lại (`app/ai/speech_log.py::update_corrected_text`) |
| Chấm điểm | `POST /rooms/{room_id}/speech-logs/{message_id}/score` | Dùng audio ĐẦU–CUỐI của attempt + toàn bộ `corrected_text` lượt nói; log cũ (không attempt) mới rớt về wav VAD từng câu (`app/api/routers/speech.py::rescore_utterance`) |
| Nhận xét | `POST /rooms/{room_id}/speech-logs/{message_id}/feedback` | Chỉ chạy khi đã có `pronunciation.report`; chưa chấm → **409** `"Chưa có điểm phát âm — chấm điểm trước"` |

### Scorer (deterministic, không phải LLM)

`app/scoring/pipeline.py::score_attempt_v2` trả `ScoringReport`:

- `scores`: `sounds` (âm), `stress` (nhấn), `fluency` (trôi chảy), `completeness` (đủ chữ), `overall` (trung bình trọng số). `intonation` = `None` ở MVP (chỉ detect monotone).
- `word_details[]`: `{word, score, status, expected_ipa}` — `status` ∈ `ok` (≥70) · `pronunciation_error` · `no_evidence` (loại khỏi mẫu số, UI hiện "Không nghe rõ").
- `phonemes[]`: `{word, expected, observed, type, gop, score}` — vd `/θ/ → /s/` ở "think".
- `top_errors[]`: `{pattern, count, examples}` — tối đa 5.
- Thứ tự thử model: local pipeline → Pronun service (`PRONUN_BASE_URL`) → heuristic chữ (không có `word_details`).

### Nhận xét AI (Nemotron — chỉ giải thích, không tính điểm)

`app/llm/nemotron_client.py::generate_feedback` nhận **đúng 1 JSON `scoring_report`**, bị cấm đổi điểm / bịa lỗi (10 luật trong `SYSTEM_PROMPT`).
Trả: `summary`, `pronunciation_feedback`, `stress_feedback`, `intonation_feedback`,
`fluency_feedback`, `priority_errors[]`, `practice_plan[]` (hoặc `feedback_raw` khi model trả text thô).

## 2. Thiết kế UI (frontend)

Component: `frontend/src/features/speaking/ReadingScoreCard.jsx`
(props: `utterance {text, corrected_text, pronunciation, feedback}`, `onScore`, `onFeedback`, `scoring`, `feedbackLoading`)

### Trạng thái

| State | Hiển thị |
|---|---|
| Chưa chấm (`pronunciation == null`) | Hướng dẫn + nút **Chấm điểm AI** |
| Đã chấm | Câu chấm **hiển thị trơn** (không tô màu/badge từng chữ) + 4 thanh tiêu chí + điểm tổng + **2 nút độc lập** |
| `showStats = true` | Thêm **bảng riêng**: `Chữ · Điểm · Trạng thái · IPA` + mục *Lỗi âm nổi bật* (`top_errors`) |
| `showFeedback = true` | Thêm **panel riêng**: summary → 4 góp ý → *Ưu tiên sửa* → *Luyện tiếp* |
| Sửa text sau khi chấm | Parent reset `pronunciation/feedback` → quay về "chưa chấm" (khớp luật backend) |

### Quy tắc bắt buộc khi sửa UI này

1. **Không** render điểm từng chữ ra ngoài `word-stats-table` (không highlight chữ trong câu).
2. Hai nút **không gộp**: `Thống kê điểm số` chỉ toggle bảng, `Nhận xét AI` chỉ toggle/gọi feedback.
3. Nút `Nhận xét AI` disable khi chưa có `report` (backend sẽ 409).
4. Chấm lại → reset cả 2 panel về đóng (ẩn mặc định).
5. Bản heuristic (không `word_details`) → bảng hiện dòng "Chưa có chi tiết từng chữ".

## 3. Demo

- Trang: `frontend/src/app/pages/ReadingDemoPage.jsx` — route **`/reading-demo`** (không cần backend, scoring/feedback giả lập 1.2s).
- Dữ liệu mẫu: `frontend/src/features/speaking/readingDemoData.js`
  (câu *"I think this is the best thing we have ever done"*, lỗi mẫu `/θ/ → /s/` ở think/thing, 1 chữ `no_evidence`).
- Test: `ReadingScoreCard.test.jsx` — 4 case (chưa chấm / ẩn mặc định / mở bảng / panel feedback độc lập).
- Chạy:

```bash
cd frontend
npm run dev          # mở https://localhost:3000/reading-demo
npx vitest run src/features/speaking/ReadingScoreCard.test.jsx
npm run build        # verify build
```

## 4. Gắn backend thật (việc còn lại)

Trong `ReadingDemoPage` thay 2 handler giả lập bằng:

```js
await fetchJson(`/rooms/${roomId}/speech-logs/${messageId}/score`, { method: 'POST' });
await fetchJson(`/rooms/${roomId}/speech-logs/${messageId}/feedback`, { method: 'POST', body: {} });
```

`PATCH .../speech-logs/{message_id}` khi user sửa câu. `ReadingScoreCard` giữ nguyên — nó chỉ đọc `utterance.pronunciation` / `utterance.feedback` theo đúng schema `SpeechUtterance`.
