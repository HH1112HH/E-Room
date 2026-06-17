import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '../../lib/api';
import { TagBadge } from './TagBadge';
import { HiMagnifyingGlass } from 'react-icons/hi2';
import '../../styles/TagSearch.css';

export function TagSearch({ onSelect, placeholder = 'Search tags...', exclude = [] }) {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const ref = useRef(null);

  const { data: results = [] } = useQuery({
    queryKey: ['tagSearch', query],
    queryFn: () => fetchJson(`/tags/search?q=${query}&limit=8`),
    enabled: query.length > 1,
  });

  const filtered = results.filter(
    (r) => !exclude.includes(r.id || r.name || r)
  );

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="tag-search-wrapper">
      <div className="tag-search-input-group">
        <HiMagnifyingGlass size={16} className="tag-search-icon" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowResults(true); }}
          onFocus={() => setShowResults(true)}
          placeholder={placeholder}
          className="tag-search-input"
        />
      </div>

      {showResults && query.length > 1 && filtered.length > 0 && (
        <div className="tag-search-dropdown">
          {filtered.map((tag) => {
            const id = tag.id || tag.name || tag;
            const name = tag.name || tag;
            return (
              <button
                key={id}
                type="button"
                onClick={() => { onSelect?.(id, name); setShowResults(false); setQuery(''); }}
                className="tag-search-result-btn"
              >
                <TagBadge label={name} category={tag.category} />
                {tag.category && (
                  <span className="text-muted tag-search-category">{tag.category}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
