import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReadingScoreCard } from './ReadingScoreCard';
import { DEMO_FEEDBACK, DEMO_PRONUNCIATION, DEMO_TEXT } from './readingDemoData';

describe('ReadingScoreCard', () => {
  it('hiện nút chấm khi chưa có điểm', () => {
    render(<ReadingScoreCard utterance={{ text: DEMO_TEXT }} onScore={vi.fn()} onFeedback={vi.fn()} />);
    expect(screen.getByTestId('reading-unscored')).toBeTruthy();
    expect(screen.getAllByText('Chấm điểm AI').length).toBeGreaterThan(0);
  });

  it('ẩn điểm từng chữ mặc định sau khi chấm', () => {
    render(
      <ReadingScoreCard
        utterance={{ text: DEMO_TEXT, corrected_text: DEMO_TEXT, pronunciation: DEMO_PRONUNCIATION }}
        onScore={vi.fn()}
        onFeedback={vi.fn()}
      />,
    );
    // Tổng + 4 tiêu chí hiện…
    expect(screen.getByTestId('reading-overall')).toBeTruthy();
    expect(screen.getByTestId('btn-word-stats')).toBeTruthy();
    expect(screen.getByTestId('btn-ai-feedback')).toBeTruthy();
    // …nhưng bảng từng chữ ẨN.
    expect(screen.queryByTestId('word-stats-table')).toBeNull();
    expect(screen.queryByTestId('ai-feedback-panel')).toBeNull();
    // Câu chấm hiển thị trơn, không kèm số điểm từng chữ.
    expect(screen.getByTestId('reading-scored-text').textContent).toBe(DEMO_TEXT);
  });

  it('bấm Thống kê điểm số mới mở bảng riêng', () => {
    render(
      <ReadingScoreCard
        utterance={{ text: DEMO_TEXT, corrected_text: DEMO_TEXT, pronunciation: DEMO_PRONUNCIATION }}
        onScore={vi.fn()}
        onFeedback={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId('btn-word-stats'));
    const table = screen.getByTestId('word-stats-table');
    expect(table.textContent).toContain('think');
    expect(table.textContent).toContain('58.5');
    expect(table.textContent).toContain('/θ/ → /s/');
  });

  it('nút Nhận xét AI mở panel riêng độc lập với bảng điểm', () => {
    const onFeedback = vi.fn();
    render(
      <ReadingScoreCard
        utterance={{
          text: DEMO_TEXT,
          corrected_text: DEMO_TEXT,
          pronunciation: DEMO_PRONUNCIATION,
          feedback: DEMO_FEEDBACK,
        }}
        onScore={vi.fn()}
        onFeedback={onFeedback}
      />,
    );
    fireEvent.click(screen.getByTestId('btn-ai-feedback'));
    expect(screen.getByTestId('ai-feedback-panel').textContent).toContain('think');
    // Bảng điểm vẫn ẩn — 2 panel độc lập.
    expect(screen.queryByTestId('word-stats-table')).toBeNull();
  });
});
