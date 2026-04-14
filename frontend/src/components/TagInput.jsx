import { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';

/**
 * Inline autocomplete input for adding tags to a link.
 *
 * Props:
 *   type        - 'broad' | 'specific'
 *   allTags     - full list of TagResponse objects from GET /tags
 *   existingIds - Set of tag IDs already on this link (to exclude from suggestions)
 *   onAdd(name, type) - called when user confirms a tag
 *   broad       - if true, uses teal styling; otherwise neutral
 */
export default function TagInput({ type, allTags, existingIds, onAdd }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  const isBroad = type === 'broad';

  // Filter suggestions: same type, not already on link, matches query
  const suggestions = allTags
    .filter(t => t.tag_type === type)
    .filter(t => !existingIds.has(t.id))
    .filter(t => !query.trim() || t.name.toLowerCase().includes(query.toLowerCase().trim()));

  const exactMatch = suggestions.some(t => t.name.toLowerCase() === query.toLowerCase().trim());
  const showCreate = query.trim().length > 0 && !exactMatch;
  const totalOptions = suggestions.length + (showCreate ? 1 : 0);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    setHighlighted(0);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const commit = (name) => {
    if (!name.trim()) return;
    onAdd(name.trim(), type);
    setQuery('');
    setOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted(h => Math.min(h + 1, totalOptions - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)); }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (highlighted < suggestions.length) {
        commit(suggestions[highlighted].name);
      } else if (showCreate) {
        commit(query.trim());
      }
    }
    if (e.key === 'Escape') { setOpen(false); setQuery(''); }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1 font-mono px-2 py-0.5 rounded-full text-[10px] border border-dashed transition-colors ${
          isBroad
            ? 'border-[#b7cfc4] text-[#7aab98] hover:border-[#4f8f7a] hover:text-[#315f56]'
            : 'border-[#cdd3cd] text-[#9aa39f] hover:border-[#8baea0] hover:text-[#68746f]'
        }`}
      >
        <Plus className="size-2.5" />
        Add
      </button>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search or create…"
        className={`font-mono text-[11px] px-2.5 py-1 rounded-full border focus:outline-none w-36 transition-colors ${
          isBroad
            ? 'border-[#8baea0] bg-[#f7faf8] text-[#26312d] placeholder:text-[#9aa39f] focus:border-[#4f8f7a] focus:ring-1 focus:ring-[#4f8f7a]/20'
            : 'border-[#c8d4cd] bg-white text-[#26312d] placeholder:text-[#b0bab5] focus:border-[#a8bfb2] focus:ring-1 focus:ring-[#a8bfb2]/20'
        }`}
      />

      {totalOptions > 0 && (
        <div className="absolute z-50 top-full mt-1.5 left-0 min-w-[160px] bg-white rounded-xl border border-[#dfe5df] shadow-lg shadow-black/8 py-1 overflow-y-auto max-h-48">
          {suggestions.map((tag, i) => (
            <button
              key={tag.id}
              onMouseDown={(e) => { e.preventDefault(); commit(tag.name); }}
              onMouseEnter={() => setHighlighted(i)}
              className={`w-full text-left px-3 py-1.5 font-mono text-[11px] transition-colors ${
                highlighted === i ? 'bg-[#edf4ef] text-[#315f56]' : 'text-[#26312d] hover:bg-[#f7f8f5]'
              }`}
            >
              {tag.name}
            </button>
          ))}
          {showCreate && (
            <button
              onMouseDown={(e) => { e.preventDefault(); commit(query.trim()); }}
              onMouseEnter={() => setHighlighted(suggestions.length)}
              className={`w-full text-left px-3 py-1.5 font-mono text-[11px] transition-colors border-t border-[#f0f2f0] ${
                highlighted === suggestions.length ? 'bg-[#edf4ef] text-[#315f56]' : 'text-[#68746f] hover:bg-[#f7f8f5]'
              }`}
            >
              Create <span className="text-[#315f56] font-semibold">"{query.trim()}"</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
