/**
 * Dữ liệu demo cho trang /reading-demo.
 * Khớp schema backend: SpeechUtterance.pronunciation = _report_to_hook(report)
 * (xem backend/app/ai/pronunciation.py), report khớp ScoringReport
 * (backend/app/schemas/scoring.py + app/scoring/pipeline.py).
 */

export const DEMO_TEXT = 'I think this is the best thing we have ever done';

export const DEMO_PRONUNCIATION = {
  score: 78.4,
  method: 'local-v2',
  wav2vec_ready: true,
  scorer_version: 'scorer-v2-mvp',
  scored_text: DEMO_TEXT,
  details: {
    sounds: 74.2,
    stress: 81.0,
    fluency: 83.5,
    completeness: 100.0,
    n_scored: 9,
    n_no_evidence: 1,
    top_errors: [{ pattern: '/θ/ → /s/', count: 2, examples: ['think', 'thing'] }],
    warnings: [],
  },
  report: {
    scores: { sounds: 74.2, stress: 81.0, fluency: 83.5, completeness: 100.0, intonation: null, overall: 78.4 },
    texts: { original: null, whisper_raw: 'I sink this is the best ting we have ever done', user_corrected: DEMO_TEXT },
    reference: { accent: 'en-US', voice_id: 'af_heart', speed: 0.9 },
    word_details: [
      { word: 'I', score: 92.0, status: 'ok', expected_ipa: '/aɪ/' },
      { word: 'think', score: 58.5, status: 'pronunciation_error', expected_ipa: '/θɪŋk/' },
      { word: 'this', score: 81.3, status: 'ok', expected_ipa: '/ðɪs/' },
      { word: 'is', score: 88.0, status: 'ok', expected_ipa: '/ɪz/' },
      { word: 'the', score: 90.2, status: 'ok', expected_ipa: '/ðə/' },
      { word: 'best', score: 86.7, status: 'ok', expected_ipa: '/bɛst/' },
      { word: 'thing', score: 61.0, status: 'pronunciation_error', expected_ipa: '/θɪŋ/' },
      { word: 'we', score: 89.4, status: 'ok', expected_ipa: '/wiː/' },
      { word: 'have', score: 84.1, status: 'ok', expected_ipa: '/hæv/' },
      { word: 'done', score: 0.0, status: 'no_evidence', expected_ipa: '/dʌn/' },
    ],
    phonemes: [
      { word: 'think', expected: '/θ/', observed: '/s/', type: 'substitution', gop: -1.204, score: 58.5 },
      { word: 'thing', expected: '/θ/', observed: '/s/', type: 'substitution', gop: -1.012, score: 61.0 },
    ],
    stress_detail: [],
    intonation: { median_f0: 132.0, std_f0: 11.2, range_f0: 48.0, final_slope: -4.0, monotone: true },
    fluency: { wpm: 128.0, score: 83.5 },
    completeness: { mode: 'read_aloud', missing_words: [], extra_words: [], score: 100.0 },
    top_errors: [{ pattern: '/θ/ → /s/', count: 2, examples: ['think', 'thing'] }],
    scorer_version: 'scorer-v2-mvp',
    warnings: [],
  },
};

export const DEMO_FEEDBACK = {
  summary: 'Bạn đọc trôi chảy, đủ chữ. Vấn đề lớn nhất là âm /θ/ trong “think” và “thing” đang đọc thành /s/.',
  pronunciation_feedback: 'Hai chữ “think” (58.5) và “thing” (61.0) bị thay /θ/ → /s/. Đặt lưỡi nhẹ giữa hai răng, thổi hơi ra cho /θ/ rồi mới thêm giọng.',
  stress_feedback: 'Nhấn âm tốt (81.0). Giữ nhịp mạnh ở “best” và “ever”.',
  intonation_feedback: 'Giọng hơi đều (monotone). Câu khẳng định nên hạ giọng nhẹ ở chữ cuối “done”.',
  fluency_feedback: 'Tốc độ 128 từ/phút là vùng tự nhiên. Chữ “done” bị mất evidence — đừng nuốt âm cuối /n/.',
  priority_errors: [
    { word: 'think', issue: '/θ/ đọc thành /s/', advice: 'luyện cặp think–sink ×10' },
    { word: 'thing', issue: '/θ/ đọc thành /s/', advice: 'luyện cloth → clothe → clothes' },
  ],
  practice_plan: [
    'Đọc chậm “I think…” ×5, soi gương xem lưỡi có thè ra không.',
    'Cặp tối thiểu think–sink, thing–sing mỗi cặp ×10.',
    'Đọc lại cả câu ở tốc độ tự nhiên, ghi âm và chấm lại.',
  ],
};
