import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLinks } from '../hooks/useLinks';
import { saveLink, deleteLink } from '../api/links';
import { Plus, X, ExternalLink, Trash2, BookOpen } from 'lucide-react';

function LinkList() {
  const { links, loading, error, refetch } = useLinks();
  const [searchParams, setSearchParams] = useSearchParams();
  const [url, setUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const selectedTag = searchParams.get('tag');
  const highlightedLinkId = searchParams.get('highlight');

  const filteredLinks = useMemo(() => {
    if (!selectedTag) return links;
    return links.filter(link =>
      link.tags && link.tags.some(tag =>
        (typeof tag === 'string' ? tag : tag.name) === selectedTag
      )
    );
  }, [links, selectedTag]);

  const [showAllTags, setShowAllTags] = useState(false);

  // All broad tags sorted by count descending
  const broadTagCounts = useMemo(() => {
    const counts = {};
    links.forEach(link => {
      (link.tags || []).forEach(tag => {
        const tagObj = typeof tag === 'string' ? { name: tag } : tag;
        if (tagObj.tag_type === 'broad') {
          counts[tagObj.name] = (counts[tagObj.name] || 0) + 1;
        }
      });
    });
    return Object.entries(counts).sort(([, a], [, b]) => b - a);
  }, [links]);

  const TAG_LIMIT = 8;
  const visibleTags = showAllTags ? broadTagCounts : broadTagCounts.slice(0, TAG_LIMIT);
  const hiddenCount = broadTagCounts.length - TAG_LIMIT;

  const getBroadTags = (tags) => {
    if (!tags) return [];
    return tags.filter(tag => {
      const tagObj = typeof tag === 'string' ? { name: tag } : tag;
      return tagObj.tag_type === 'broad';
    });
  };

  const getSpecificTags = (tags) => {
    if (!tags) return [];
    return tags.filter(tag => {
      const tagObj = typeof tag === 'string' ? { name: tag } : tag;
      return tagObj.tag_type === 'specific' || (!tagObj.tag_type && tagObj.tag_type !== 'broad');
    });
  };

  const handleTagClick = (tagName, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (selectedTag === tagName) {
      setSearchParams({});
    } else {
      setSearchParams({ tag: tagName });
    }
  };

  const clearFilter = () => setSearchParams({});

  const highlightedRef = useRef(null);
  useEffect(() => {
    if (highlightedLinkId && highlightedRef.current) {
      setTimeout(() => {
        highlightedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
      const timer = setTimeout(() => {
        const params = new URLSearchParams(searchParams);
        params.delete('highlight');
        setSearchParams(params);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightedLinkId, filteredLinks, searchParams, setSearchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    try {
      setSubmitting(true);
      setSubmitError(null);
      setSubmitSuccess(false);
      await saveLink(url.trim());
      setUrl('');
      setSubmitSuccess(true);
      await refetch();
      setTimeout(() => setSubmitSuccess(false), 2000);
    } catch (err) {
      setSubmitError(
        err.response?.data?.detail || err.message || 'Failed to save link. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (linkId) => {
    if (!window.confirm('Are you sure you want to delete this link?')) return;
    try {
      await deleteLink(linkId);
      await refetch();
    } catch (err) {
      alert(err.response?.data?.detail || err.message || 'Failed to delete link');
    }
  };

  return (
    <div className="min-h-screen bg-[#09090e] text-white">

      {/* ── Hero / Input ──────────────────────────────────────── */}
      <div className="relative border-b border-white/5 overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-600/8 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-6 pt-28 pb-14">
          <div className="flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2.5 rounded-full border border-indigo-500/20 bg-indigo-500/6 px-4 py-1.5 mb-7">
              <BookOpen className="size-3 text-indigo-400" />
              <span className="font-mono text-[11px] tracking-[0.12em] text-indigo-300/90 uppercase">Your saved knowledge</span>
            </div>

            <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tight leading-[0.92] mb-4">
              Your <span className="text-indigo-400">Library</span>
            </h1>
            <p className="max-w-sm text-sm text-slate-500 leading-relaxed mb-10">
              Save any URL and let AI automatically extract titles, summaries, and semantic tags.
            </p>

            {/* Input */}
            <form onSubmit={handleSubmit} className="w-full max-w-lg">
              <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  disabled={submitting}
                  className="flex-1 px-4 py-3 font-mono text-sm border border-white/8 rounded-xl bg-white/[0.03] text-white placeholder:text-slate-700 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 disabled:opacity-50 transition-all"
                />
                <button
                  type="submit"
                  disabled={submitting || !url.trim()}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold bg-indigo-500 text-white rounded-xl hover:bg-indigo-400 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/15"
                >
                  <Plus className="size-4" />
                  {submitting ? 'Saving…' : 'Save'}
                </button>
              </div>

              {submitSuccess && (
                <p className="mt-3 font-mono text-[11px] text-emerald-400 tracking-wide text-center">
                  ✓ LINK SAVED
                </p>
              )}
              {submitError && (
                <p className="mt-3 font-mono text-[11px] text-red-400 text-center">
                  {submitError}
                </p>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* Tag filter bar */}
        {broadTagCounts.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-8">
            <button
              onClick={clearFilter}
              className={`font-mono px-3.5 py-1.5 rounded-full text-[11px] border transition-all ${
                !selectedTag
                  ? 'bg-white/10 border-white/20 text-white'
                  : 'bg-transparent border-white/8 text-slate-500 hover:border-white/15 hover:text-slate-400'
              }`}
            >
              All <span className="opacity-50">{links.length}</span>
            </button>
            {visibleTags.map(([tag, count]) => (
              <button
                key={tag}
                onClick={() => setSearchParams(selectedTag === tag ? {} : { tag })}
                className={`font-mono px-3.5 py-1.5 rounded-full text-[11px] border transition-all ${
                  selectedTag === tag
                    ? 'bg-indigo-500 border-indigo-500 text-white shadow-sm shadow-indigo-500/20'
                    : 'bg-transparent border-white/8 text-slate-500 hover:border-indigo-500/30 hover:text-indigo-300'
                }`}
              >
                {tag} <span className="opacity-50">{count}</span>
              </button>
            ))}
            {hiddenCount > 0 && (
              <button
                onClick={() => setShowAllTags(v => !v)}
                className="font-mono px-3.5 py-1.5 rounded-full text-[11px] border border-white/8 text-slate-600 hover:text-slate-400 hover:border-white/15 transition-all"
              >
                {showAllTags ? 'show less' : `+${hiddenCount} more`}
              </button>
            )}
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="rounded-xl border border-white/6 bg-[#0d1017] p-5">
                <div className="h-4 w-3/4 rounded bg-white/8 animate-pulse mb-3" />
                <div className="h-3 w-full rounded bg-white/6 animate-pulse mb-2" />
                <div className="h-3 w-2/3 rounded bg-white/6 animate-pulse mb-4" />
                <div className="flex gap-2">
                  <div className="h-5 w-16 rounded-full bg-white/6 animate-pulse" />
                  <div className="h-5 w-20 rounded-full bg-white/6 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="font-mono text-xs text-red-400/80 px-4 py-3 rounded-lg bg-red-500/8 border border-red-500/15">
            Error: {error}
          </div>
        )}

        {!loading && !error && links.length === 0 && (
          <div className="flex flex-col items-center justify-center py-28 text-center">
            <div className="size-14 mb-6 rounded-2xl border border-white/8 bg-white/[0.02] flex items-center justify-center">
              <Plus className="size-6 text-slate-600" />
            </div>
            <h2 className="font-display text-lg font-semibold text-slate-400 mb-2">Empty library</h2>
            <p className="font-mono text-xs text-slate-700 uppercase tracking-widest">Paste a URL above to begin</p>
          </div>
        )}

        {!loading && !error && selectedTag && filteredLinks.length === 0 && (
          <div className="text-center py-16">
            <p className="text-sm text-slate-500">
              No links tagged{' '}
              <span className="font-mono text-slate-400">"{selectedTag}"</span>.{' '}
              <button onClick={clearFilter} className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">
                Clear filter
              </button>
            </p>
          </div>
        )}

        {!loading && !error && filteredLinks.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLinks.map((link) => {
              const isHighlighted = highlightedLinkId && String(link.id) === highlightedLinkId;
              const broadTags = getBroadTags(link.tags);
              const specificTags = getSpecificTags(link.tags);

              return (
                <div
                  key={link.id}
                  ref={isHighlighted ? highlightedRef : null}
                  className={`group relative rounded-xl border bg-[#0d1017] flex flex-col overflow-hidden transition-all hover:-translate-y-0.5 ${
                    isHighlighted
                      ? 'border-indigo-500/60 shadow-lg shadow-indigo-500/10'
                      : 'border-white/6 hover:border-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/5'
                  }`}
                >
                  {/* Left accent bar */}
                  <div className={`absolute left-0 top-0 bottom-0 w-[2.5px] rounded-l-xl transition-colors ${
                    isHighlighted ? 'bg-indigo-400' : 'bg-indigo-500/25 group-hover:bg-indigo-400/50'
                  }`} />

                  <div className="pl-5 pr-4 pt-4 pb-4 flex flex-col gap-2.5 flex-1">
                    {/* Title + delete */}
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-display text-sm font-semibold text-slate-100 line-clamp-2 leading-snug">
                        {link.title || 'Untitled'}
                      </h3>
                      <button
                        onClick={() => handleDelete(link.id)}
                        className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1.5 rounded-lg hover:bg-red-500/10 text-slate-700 hover:text-red-400 transition-all"
                        title="Delete link"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>

                    {/* URL */}
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-mono text-[11px] text-indigo-400/60 hover:text-indigo-300 truncate transition-colors"
                    >
                      <ExternalLink className="size-2.5 flex-shrink-0" />
                      <span className="truncate">{link.url}</span>
                    </a>

                    {/* Summary */}
                    {link.summary && (
                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                        {link.summary}
                      </p>
                    )}

                    {/* Tags */}
                    {(broadTags.length > 0 || specificTags.length > 0) && (
                      <div className="flex flex-col gap-1.5 mt-auto pt-1">
                        {broadTags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {broadTags.map((tag) => {
                              const tagName = typeof tag === 'string' ? tag : tag.name;
                              const isActive = selectedTag === tagName;
                              return (
                                <button
                                  key={tag.id || tagName}
                                  onClick={(e) => handleTagClick(tagName, e)}
                                  className={`font-mono px-2.5 py-0.5 rounded-full text-[10px] tracking-wide transition-all ${
                                    isActive
                                      ? 'bg-indigo-500 text-white'
                                      : 'bg-indigo-500/10 text-indigo-400/80 hover:bg-indigo-500/20 hover:text-indigo-300'
                                  }`}
                                >
                                  {tagName}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        {specificTags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {specificTags.map((tag) => {
                              const tagName = typeof tag === 'string' ? tag : tag.name;
                              return (
                                <span
                                  key={tag.id || tagName}
                                  className="font-mono px-2 py-0.5 rounded text-[10px] text-slate-600 bg-white/[0.03]"
                                >
                                  {tagName}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Date */}
                    <div className="font-mono text-[10px] text-slate-800 pt-1">
                      {new Date(link.date_saved).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default LinkList;
