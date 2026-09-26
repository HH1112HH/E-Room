import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/api', () => ({
  fetchJson: vi.fn(),
  getTokens: () => ({ access: 'test-token', refresh: null }),
  API_BASE_URL: '/api/v1',
}));
vi.mock('../chat/voiceApi', () => ({
  getStoredVoice: () => 'af_heart',
  storeVoice: vi.fn(),
  speakToAudioUrl: vi.fn(async () => 'blob:mock'),
  FALLBACK_VOICES: [{ id: 'af_heart', label: 'Heart' }],
  fetchVoices: vi.fn(async () => [{ id: 'af_heart', label: 'Heart' }]),
}));

import { fetchJson } from '../../lib/api';
import { SessionDetailPage } from './SessionDetailPage';

const SCORED_UTTERANCE = {
  message_id: 7,
  room_id: 3,
  text: 'I think this is good',
  corrected_text: 'I think this is good',
  created_at: '2026-08-20T11:10:00Z',
  pronunciation: {
    score: 78.4,
    method: 'local-v2',
    scored_text: 'I think this is good',
    details: { sounds: 74, stress: 81, fluency: 83, completeness: 100 },
    report: {
      scores: { sounds: 74, stress: 81, fluency: 83, completeness: 100, overall: 78.4 },
      word_details: [
        { word: 'think', score: 58.5, status: 'pronunciation_error', expected_ipa: '/θɪŋk/' },
      ],
      top_errors: [{ pattern: '/θ/ → /s/', count: 1, examples: ['think'] }],
      warnings: [],
    },
  },
  feedback: null,
};

let mockSpeech = [];
fetchJson.mockImplementation(async (path, options = {}) => {
  if (path === '/sessions/101') {
    return {
      session: { id: 101, user_id: 9, room_id: 3, joined_at: '2026-08-20T11:00:00Z', left_at: '2026-08-20T11:30:00Z', duration_seconds: 1800, summary: null },
      room: { id: 3, name: 'Old Session', status: 'ended', topics: ['Travel'] },
      message_count: 2,
    };
  }
  if (path === '/sessions/101/messages') {
    return {
      session_id: 101,
      message_count: 2,
      transcript: 'An Nguyen: hello there\nAn Nguyen: it was great',
      transcript_lines: [
        { speaker: 'An Nguyen', text: 'hello there' },
        { speaker: 'An Nguyen', text: 'it was great' },
      ],
      chat: [],
    };
  }
  if (path === '/rooms/3/speech-logs/me') return mockSpeech;
  if (path === '/sessions/101/feedback' && (options.method || 'GET') === 'POST') {
    return {
      session_id: 101, scored_count: 1, total_utterances: 1,
      feedback: {
        summary: 'Fix /θ/ in think.',
        error_words: [{ word: 'think', issue: '/θ/ → /s/', tip: 'Tongue between teeth.' }],
        practice_plan: ['Drill think–sink ×10.', 'Re-read slowly ×5.', 'Re-score.'],
      },
    };
  }
  return {};
});

function renderDetail() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={['/session/101']}>
      <QueryClientProvider client={client}>
        <Routes>
          <Route path="/session/:sessionId" element={<SessionDetailPage />} />
          <Route path="/session" element={<div>Sessions list</div>} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('SessionDetailPage', () => {
  it('shows AI feedbacks panel and fetches session feedback', async () => {
    renderDetail();
    expect(await screen.findByText('AI feedbacks')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Get AI feedback' }));
    expect(await screen.findByText('Fix /θ/ in think.')).toBeTruthy();
    expect(await screen.findByText(/Tongue between teeth/)).toBeTruthy();
    expect(fetchJson).toHaveBeenCalledWith('/sessions/101/feedback', expect.objectContaining({ method: 'POST' }));
  });

  it('shows 409-style error when nothing scored', async () => {
    const fallback = fetchJson.getMockImplementation();
    fetchJson.mockImplementation(async (path, options = {}) => {
      if (path === '/sessions/101/feedback') throw new Error('Chưa có câu nào được chấm điểm trong session này');
      return fallback(path, options);
    });
    try {
      renderDetail();
      fireEvent.click(await screen.findByRole('button', { name: 'Get AI feedback' }));
      expect(await screen.findByText(/Chưa có câu nào được chấm điểm/)).toBeTruthy();
    } finally {
      fetchJson.mockImplementation(fallback);
    }
  });

  it('lists my scored utterances with hidden word stats by default', async () => {
    mockSpeech = [SCORED_UTTERANCE];
    try {
      renderDetail();
      expect(await screen.findByText('My pronunciation scores')).toBeTruthy();
      // Tổng hiện, bảng từng chữ ẩn.
      expect(await screen.findByText('78.4 điểm')).toBeTruthy();
      expect(screen.queryByText('/θɪŋk/')).toBeNull();
      const card = screen.getByText('I think this is good').closest('div');
      fireEvent.click(within(card.parentElement.parentElement).getByRole('button', { name: 'Thống kê điểm số' }));
      expect(await screen.findByText('/θɪŋk/')).toBeTruthy();
    } finally {
      mockSpeech = [];
    }
  });

  it('shows voice picker and speaker buttons in What was said', async () => {
    renderDetail();
    expect(await screen.findByText('What was said')).toBeTruthy();
    expect(screen.getByLabelText('Choose AI voice')).toBeTruthy();
    expect(screen.getAllByLabelText(/Nghe:/).length).toBe(2);
  });
});
