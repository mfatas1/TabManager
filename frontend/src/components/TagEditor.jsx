import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';

function normalizeTag(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function TagEditor({ label, tags, options, onChange }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return options
      .filter((option) => !tags.includes(option))
      .filter((option) => !q || option.includes(q))
      .slice(0, 12);
  }, [options, query, tags]);

  const addTag = (value) => {
    const normalized = normalizeTag(value);
    if (!normalized || tags.includes(normalized)) return;
    onChange([...tags, normalized]);
    setQuery('');
    setOpen(false);
  };

  const removeTag = (tag) => {
    onChange(tags.filter((item) => item !== tag));
  };

  return (
    <div>
      <label className="font-mono text-[10px] tracking-[0.15em] text-[var(--tm-text-muted)] uppercase block mb-2">
        {label}
      </label>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 font-mono px-2.5 py-1 rounded-full text-[10px] bg-[var(--tm-accent-bg)] text-[var(--tm-accent-hover)] border border-[var(--tm-accent-bg-deep)]"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="text-[var(--tm-text-disabled)] hover:text-red-400"
                aria-label={`Remove ${tag}`}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div ref={ref} className="relative flex gap-2">
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addTag(query);
            }
          }}
          placeholder={`Add ${label.toLowerCase()}`}
          className="min-w-0 flex-1 px-3 py-2.5 text-sm border border-[var(--tm-border)] rounded-lg bg-white text-[#1e1b2e] placeholder:text-[var(--tm-text-muted)] focus:outline-none focus:border-[var(--tm-accent-muted)] focus:ring-1 focus:ring-[var(--tm-accent-muted)]/20"
        />
        <button
          type="button"
          onClick={() => addTag(query)}
          disabled={!normalizeTag(query)}
          className="px-3 py-2.5 text-sm font-semibold bg-[var(--tm-accent-hover)] text-white rounded-lg hover:bg-[var(--tm-accent-press)] disabled:bg-[var(--tm-border)] disabled:text-[var(--tm-text-disabled)] disabled:cursor-not-allowed"
        >
          <Plus className="size-4" />
        </button>

        {open && (filteredOptions.length > 0 || normalizeTag(query)) && (
          <div className="absolute z-50 top-full mt-1.5 left-0 right-12 max-h-56 overflow-y-auto rounded-xl border border-[#e8dff2] bg-white shadow-lg shadow-black/8 py-1.5">
            {filteredOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => addTag(option)}
                className="w-full text-left px-3 py-2 font-mono text-[11px] text-[#1e1b2e] hover:bg-[#f7f8f5] transition-colors"
              >
                {option}
              </button>
            ))}
            {normalizeTag(query) && !filteredOptions.includes(normalizeTag(query)) && !tags.includes(normalizeTag(query)) && (
              <button
                type="button"
                onClick={() => addTag(query)}
                className="w-full text-left px-3 py-2 font-mono text-[11px] text-[var(--tm-accent-hover)] hover:bg-[var(--tm-accent-bg)] transition-colors border-t border-[var(--tm-accent-bg-mid)]"
              >
                Create "{normalizeTag(query)}"
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
