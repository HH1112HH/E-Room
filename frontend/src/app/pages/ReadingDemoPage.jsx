import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HiArrowLeft, HiSparkles } from 'react-icons/hi2';
import { ReadingScoreCard } from '../../features/profile/ReadingScoreCard';
import { DEMO_FEEDBACK, DEMO_PRONUNCIATION, DEMO_TEXT } from '../../features/profile/readingDemoData';

/**
 * Trang demo /reading-demo — chạy không cần backend.
 * Mô phỏng đúng luồng backend raw -> sửa -> chấm -> nhận xét:
 *  - Bước 1: câu đọc mẫu (sửa được).
 *  - Bước 2: bấm "Chấm điểm AI" -> giả lập scoring 1.2s -> hiện điểm
 *    tổng + 4 tiêu chí, ẨN điểm từng chữ.
 *  - Bước 3: 2 nút độc lập "Thống kê điểm số" (bảng riêng) và
 *    "Nhận xét AI" (panel riêng).
 * Sửa câu sau khi chấm -> reset về "chưa chấm" (giống backend reset
 * pronunciation + feedback về None).
 */
export function ReadingDemoPage() {
  const [text, setText] = useState(DEMO_TEXT);
  const [pronunciation, setPronunciation] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [scoring, setScoring] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  function handleScore() {
    if (scoring) return;
    setScoring(true);
    setFeedback(null);
    window.setTimeout(() => {
      setPronunciation({ ...DEMO_PRONUNCIATION, scored_text: text });
      setScoring(false);
    }, 1200);
  }

  function handleFeedback() {
    if (feedbackLoading || !pronunciation) return;
    setFeedbackLoading(true);
    window.setTimeout(() => {
      setFeedback(DEMO_FEEDBACK);
      setFeedbackLoading(false);
    }, 1200);
  }

  function handleTextChange(next) {
    setText(next);
    // Giống backend: sửa text sau khi chấm -> reset điểm + feedback.
    if (pronunciation) {
      setPronunciation(null);
      setFeedback(null);
    }
  }

  const utterance = { text, corrected_text: text, pronunciation, feedback };

  return (
    <div className="portal-app portal-app--page">
      <main className="portal-main pf-center--wide">
        <div className="portal-pagehead">
          <div>
            <div className="pf-crumb"><Link to="/">Home</Link> / reading-demo</div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <HiSparkles size={20} /> Demo chấm điểm đọc bằng AI
            </h1>
            <p className="portal-muted" style={{ fontSize: 13, maxWidth: 640 }}>
              Điểm từng chữ được <b>ẩn mặc định</b>. Bấm <b>Thống kê điểm số</b> để mở bảng riêng,
              bấm <b>Nhận xét AI</b> để xem góp ý — hai nút hoạt động độc lập.
            </p>
          </div>
          <Link className="er-btn" style={{ textDecoration: 'none' }} to="/">
            <HiArrowLeft size={14} /> Home
          </Link>
        </div>

        <section className="portal-panel" style={{ marginBottom: 12 }}>
          <div className="portal-panel__head"><h2>1. Câu cần đọc</h2></div>
          <textarea
            className="er-input"
            rows={3}
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            aria-label="Câu cần đọc"
            style={{ width: '100%', resize: 'vertical' }}
          />
          <p className="portal-muted" style={{ fontSize: 12, marginTop: 6 }}>
            Sửa câu sau khi đã chấm sẽ xóa điểm cũ và bắt chấm lại (đúng luật backend).
          </p>
        </section>

        <ReadingScoreCard
          utterance={utterance}
          scoring={scoring}
          feedbackLoading={feedbackLoading}
          onScore={handleScore}
          onFeedback={handleFeedback}
        />

        <section className="portal-panel" style={{ marginTop: 12 }}>
          <div className="portal-panel__head"><h2>Luồng API thật (để gắn backend)</h2></div>
          <ol style={{ fontSize: 13, paddingLeft: 18, margin: 0, lineHeight: 1.7 }}>
            <li><code>PATCH /rooms/{'{room_id}'}/speech-logs/{'{message_id}'}</code> — sửa <code>corrected_text</code> (reset điểm cũ).</li>
            <li><code>POST /rooms/{'{room_id}'}/speech-logs/{'{message_id}'}/score</code> — chấm, nhận <code>pronunciation</code> (+ <code>report.word_details</code>).</li>
            <li><code>POST /rooms/{'{room_id}'}/speech-logs/{'{message_id}'}/feedback</code> — nhận xét AI (409 nếu chưa chấm).</li>
          </ol>
        </section>
      </main>
    </div>
  );
}

export default ReadingDemoPage;
