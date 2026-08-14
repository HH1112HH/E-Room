import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../components/ui/Card';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { fetchJson } from '../../lib/api';
import '../../styles/DevTools.css';

export function TagPanel() {
  const { t } = useTranslation();
  const loader = useCallback(() => fetchJson('/tags/popular'), []);
  const { data, isLoading, error } = useAsyncResource(loader, []);
  const [selected, setSelected] = useState([]);

  function toggleTag(tagId) {
    setSelected((current) =>
      current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId]
    );
  }

  return (
    <Card title={t('notes.tags')} subtitle={t('learning.select_topics_match')} action={
      selected.length > 0 ? <span className="pill pill-active">{t('common.selected_count', { count: selected.length })}</span> : null
    }>
      {isLoading ? <p className="empty-state">{t('common.loading_tags')}</p> : null}
      {error ? <p className="empty-state empty-state-error">{error}</p> : null}
      {!isLoading && !error && data.length === 0 ? <p className="empty-state">{t('common.no_tags')}</p> : null}
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
