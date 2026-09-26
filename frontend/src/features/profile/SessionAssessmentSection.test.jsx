import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/api', () => ({
  fetchJson: vi.fn(),
  getTokens: () => ({ access: 'test-token', refresh: null }),
  API_BASE_URL: '/api/v1',
}));

import { fetchJson } from '../../lib/api';
import { SessionAssessmentSection } from './SessionAssessmentSection';

fetchJson.mockImplementation(async (path) => {
  if (path === '/sessions/mine') {
    return {
      sessions: [
        { session: { id: 102, room_id: 3, joined_at: '2026-08-20T11:00:00Z', left_at: '2026-08-20T11:30:00Z', duration_seconds: 1800 }, room: { id: 3, name: 'New Session' }, message_count: 5 },
        { session: { id: 101, room_id: 3, joined_at: '2026-08-19T11:00:00Z', left_at: '2026-08-19T11:30:00Z', duration_seconds: 1800 }, room: { id: 3, name: 'Old Session' }, message_count: 2 },
      ],
    };
  }
  return {};
});

function renderAssessment() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <SessionAssessmentSection />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('SessionAssessmentSection', () => {
  it('lists sessions with links to separate assessment pages', async () => {
    renderAssessment();
    expect(await screen.findByText('New Session')).toBeTruthy();
    expect(await screen.findByText('Old Session')).toBeTruthy();
    const links = await screen.findAllByRole('link', { name: 'Assess' });
    expect(links).toHaveLength(2);
    expect(links[0].getAttribute('href')).toBe('/assessment/102');
    expect(links[1].getAttribute('href')).toBe('/assessment/101');
  });

  it('shows empty state without sessions', async () => {
    const fallback = fetchJson.getMockImplementation();
    fetchJson.mockImplementation(async (path) => {
      if (path === '/sessions/mine') return { sessions: [] };
      return fallback(path);
    });
    try {
      renderAssessment();
      expect(await screen.findByText(/Chưa có session nào/)).toBeTruthy();
    } finally {
      fetchJson.mockImplementation(fallback);
    }
  });
});
