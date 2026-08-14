import { useCallback, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { fetchJson } from '../../lib/api';
import '../../styles/DevTools.css';

export function TagPanel() {
  const loader = useCallback(() => fetchJson('/tags/popular'), []);
  const { data, isLoading, error } = useAsyncResource(loader, []);
  const [selected, setSelected] = useState([]);

  function toggleTag(tagId) {
    setSelected((current) =>
      current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId]
    );
  }

  return (
    <Card title="Thẻ" subtitle="Chọn chủ đề để ghép phòng" action={
      selected.length > 0 ? <span className="pill pill-active">{selected.length} đã chọn</span> : null
    }>
      {isLoading ? <p className="empty-state">Đang tải thẻ...</p> : null}
      {error ? <p className="empty-state empty-state-error">{error}</p> : null}
      {!isLoading && !error && data.length === 0 ? <p className="empty-state">Chưa có thẻ nào</p> : null}
      <div className="tag-cloud">
        {data.map((tag) => (
          <span
            key={tag.id}
            className={`tag-chip${selected.includes(tag.id) ? ' selected' : ''}`}
            onClick={() => toggleTag(tag.id)}
          >
            {tag.name}
          </span>
        ))}
      </div>
    </Card>
  );
}
