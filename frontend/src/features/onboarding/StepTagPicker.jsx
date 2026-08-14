import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Spinner from 'react-bootstrap/Spinner';
import { fetchJson } from '../../lib/api';
import { TagBadge } from '../../components/tags/TagBadge';
import { HiTag } from 'react-icons/hi2';
import '../../styles/OnboardingWizard.css';

const FALLBACK_TAGS = [
  { id: 'Business', labelKey: 'onboarding.tag_business' },
  { id: 'Technology', labelKey: 'onboarding.tag_technology' },
  { id: 'Travel', labelKey: 'onboarding.tag_travel' },
  { id: 'Education', labelKey: 'onboarding.tag_education' },
  { id: 'IELTS', labelKey: 'onboarding.tag_ielts' },
  { id: 'Daily Life', labelKey: 'onboarding.tag_daily_life' },
  { id: 'Pronunciation', labelKey: 'onboarding.tag_pronunciation' },
  { id: 'Interview', labelKey: 'onboarding.tag_interview' },
  { id: 'Culture', labelKey: 'onboarding.tag_culture' },
  { id: 'Science', labelKey: 'onboarding.tag_science' },
  { id: 'Food', labelKey: 'onboarding.tag_food' },
  { id: 'Music', labelKey: 'onboarding.tag_music' },
  { id: 'Gaming', labelKey: 'onboarding.tag_gaming' },
  { id: 'Sports', labelKey: 'onboarding.tag_sports' },
  { id: 'Movies', labelKey: 'onboarding.tag_movies' },
  { id: 'Fashion', labelKey: 'onboarding.tag_fashion' },
  { id: 'Health', labelKey: 'onboarding.tag_health' },
  { id: 'Startup', labelKey: 'onboarding.tag_startup' },
  { id: 'Marketing', labelKey: 'onboarding.tag_marketing' },
  { id: 'Finance', labelKey: 'onboarding.tag_finance' },
];

export function StepTagPicker({ form, updateField }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [customTag, setCustomTag] = useState('');

  const { data: popularTags = [], isLoading } = useQuery({
    queryKey: ['popularTags'],
    queryFn: () => fetchJson('/tags/popular'),
  });

  const { data: searchResults = [] } = useQuery({
    queryKey: ['tagSearch', search],
    queryFn: () => fetchJson(`/tags/search?q=${search}&limit=8`),
    enabled: search.length > 1,
  });

  const tags = popularTags.length > 0 ? popularTags : FALLBACK_TAGS;
  const selected = form.tagIds || [];

  function tagId(tag) {
    return typeof tag === 'string' ? tag : tag.id || tag.name || tag;
  }

  function tagLabel(tag) {
    if (typeof tag === 'string') return tag;
    if (tag.labelKey) return t(tag.labelKey);
    return tag.name || tag.id || tag;
  }

  function toggleTag(tag) {
    const id = tagId(tag);
    const updated = selected.includes(id)
      ? selected.filter((t) => t !== id)
      : [...selected, id];
    updateField('tagIds', updated);
  }

  function addCustomTag() {
    const tag = customTag.trim();
    if (tag && !selected.includes(tag)) {
      updateField('tagIds', [...selected, tag]);
      setCustomTag('');
    }
  }

  return (
    <div>
      <div className="text-center mb-3">
        <HiTag size={36} className="onboarding-wizard__step-icon" />
        <h4 className="fw-bold mt-2 mb-1">{t('onboarding.tags_title')}</h4>
        <p className="text-muted small mb-0">
          {t('onboarding.tags_sub')}
        </p>
        {selected.length === 0 && (
          <p className="small mt-1 onboarding-wizard__step-warning">
            {t('onboarding.tags_warning')}
          </p>
        )}
      </div>

      {selected.length > 0 && (
        <div className="onboarding-wizard__selected-tags">
          {selected.map((tag) => (
            <TagBadge
              key={tag}
              label={tag}
              removable
              onRemove={() => toggleTag(tag)}
            />
          ))}
        </div>
      )}

      <div className="onboarding-wizard__search">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('onboarding.tags_search_placeholder')}
          className="onboarding-wizard__search-input"
        />
        {search.length > 1 && searchResults.length > 0 && (
          <div className="onboarding-wizard__search-dropdown">
            {searchResults.map((tag) => (
              <button
                key={tag.id || tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className="onboarding-wizard__search-result"
              >
                {tag.name || tag}
                {tag.category && (
                  <span className="text-muted onboarding-wizard__tag-category">
                    {tag.category}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-4"><Spinner animation="border" size="sm" /></div>
      ) : (
        <div className="onboarding-wizard__tag-cloud">
          {tags.map((tag) => {
            const id = tagId(tag);
            const name = tagLabel(tag);
            const active = selected.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleTag(id)}
                className={`onboarding-wizard__tag-pill${active ? ' onboarding-wizard__tag-pill--active' : ''}`}
              >
                {name}
              </button>
            );
          })}
        </div>
      )}

      <div className="onboarding-wizard__custom-tag">
        <input
          type="text"
          value={customTag}
          onChange={(e) => setCustomTag(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag(); } }}
          placeholder={t('onboarding.custom_tag_placeholder')}
          className="onboarding-wizard__custom-input"
        />
        <button
          type="button"
          onClick={addCustomTag}
          disabled={!customTag.trim()}
          className={`onboarding-wizard__custom-btn${customTag.trim() ? ' onboarding-wizard__custom-btn--active' : ''}`}
        >
          {t('onboarding.add')}
        </button>
      </div>
    </div>
  );
}
