import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLinks } from '../hooks/useLinks';
import { saveLink, deleteLink } from '../api/links';
import { addLinkToProject, getProjects } from '../api/projects';
import { Plus, X, ExternalLink, Trash2, BookOpen, Calendar } from 'lucide-react';

function LinkList() {
  const { links, loading, error, refetch } = useLinks();
  const [searchParams, setSearchParams] = useSearchParams();
  const [url, setUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [selectedLink, setSelectedLink] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [projectMessage, setProjectMessage] = useState(null);

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

  const getTagName = (tag) => (typeof tag === 'string' ? tag : tag.name);

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

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await getProjects();
        setProjects(response.data);
      } catch {
        setProjects([]);
      }
    };
    fetchProjects();
  }, []);

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

  const handleDelete = async (linkId, e) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this link?')) return;
    try {
      await deleteLink(linkId);
      if (selectedLink && selectedLink.id === linkId) {
        setSelectedLink(null);
      }
      await refetch();
    } catch (err) {
      alert(err.response?.data?.detail || err.message || 'Failed to delete link');
    }
  };

  const closePanel = () => setSelectedLink(null);

  const openPanel = (link) => {
    setProjectMessage(null);
    setSelectedLink(link);
  };

  const handleAddToProject = async () => {
    if (!selectedLink || !selectedProjectId) return;
    try {
      setProjectMessage(null);
      await addLinkToProject(selectedProjectId, selectedLink.id);
      setProjectMessage('Added to project');
    } catch (err) {
      setProjectMessage(err.response?.data?.detail || err.message || 'Could not add to project');
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f8f5] text-[#26312d]">

      {/* ── Hero / Input ──────────────────────────────────────── */}
      <div className="relative border-b border-[#dfe5df] overflow-hidden">
        <div className="relative max-w-5xl mx-auto px-6 pt-28 pb-14">
          <div className="flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2.5 rounded-md border border-[#c8d8cf] bg-white px-4 py-1.5 mb-7">
              <BookOpen className="size-3 text-[#4f8f7a]" />
              <span className="font-mono text-[11px] tracking-[0.12em] text-[#315f56]/90 uppercase">Your saved knowledge</span>
            </div>

            <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tight leading-[0.92] mb-4">
              Your <span className="text-[#4f8f7a]">Library</span>
            </h1>
            <p className="max-w-sm text-sm text-[#68746f] leading-relaxed mb-10">
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
                  className="flex-1 px-4 py-3 font-mono text-sm border border-[#d8ded8] rounded-md bg-white text-[#26312d] placeholder:text-[#9aa39f] focus:outline-none focus:border-[#8baea0] focus:ring-1 focus:ring-[#8baea0]/30 disabled:opacity-50 transition-all"
                />
                <button
                  type="submit"
                  disabled={submitting || !url.trim()}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold bg-[#315f56] text-white rounded-md hover:bg-[#244b44] disabled:bg-[#d8ded8] disabled:text-[#7d8984] disabled:cursor-not-allowed transition-all"
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
                  ? 'bg-[#e7efea] border-[#b7c6bd] text-[#26312d]'
                  : 'bg-transparent border-[#d8ded8] text-[#68746f] hover:border-[#c3cfc7] hover:text-[#5f6c67]'
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
                    ? 'bg-[#315f56] border-[#315f56] text-white'
                    : 'bg-transparent border-[#d8ded8] text-[#68746f] hover:border-[#a8bfb2] hover:text-[#315f56]'
                }`}
              >
                {tag} <span className="opacity-50">{count}</span>
              </button>
            ))}
            {hiddenCount > 0 && (
              <button
                onClick={() => setShowAllTags(v => !v)}
                className="font-mono px-3.5 py-1.5 rounded-full text-[11px] border border-[#d8ded8] text-[#7d8984] hover:text-[#5f6c67] hover:border-[#c3cfc7] transition-all"
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
              <div key={idx} className="rounded-lg border border-[#dfe5df] bg-white p-5">
                <div className="h-4 w-3/4 rounded bg-[#edf2ee] animate-pulse mb-3" />
                <div className="h-3 w-full rounded bg-[#eef2ef] animate-pulse mb-2" />
                <div className="h-3 w-2/3 rounded bg-[#eef2ef] animate-pulse mb-4" />
                <div className="flex gap-2">
                  <div className="h-5 w-16 rounded-full bg-[#eef2ef] animate-pulse" />
                  <div className="h-5 w-20 rounded-full bg-[#eef2ef] animate-pulse" />
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
            <div className="size-14 mb-6 rounded-lg border border-[#d8ded8] bg-white flex items-center justify-center">
              <Plus className="size-6 text-[#7d8984]" />
            </div>
            <h2 className="font-display text-lg font-semibold text-[#5f6c67] mb-2">Empty library</h2>
            <p className="font-mono text-xs text-[#9aa39f] uppercase tracking-widest">Paste a URL above to begin</p>
          </div>
        )}

        {!loading && !error && selectedTag && filteredLinks.length === 0 && (
          <div className="text-center py-16">
            <p className="text-sm text-[#68746f]">
              No links tagged{' '}
              <span className="font-mono text-[#5f6c67]">"{selectedTag}"</span>.{' '}
              <button onClick={clearFilter} className="text-[#4f8f7a] hover:text-[#315f56] underline underline-offset-2">
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

              return (
                <div
                  key={link.id}
                  ref={isHighlighted ? highlightedRef : null}
                  role="button"
                  tabIndex={0}
                  onClick={() => openPanel(link)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openPanel(link);
                    }
                  }}
                  className={`group relative rounded-lg border bg-white flex flex-col overflow-hidden transition-all hover:-translate-y-0.5 ${
                    selectedLink?.id === link.id
                      ? 'border-[#4f8f7a]'
                      : isHighlighted
                      ? 'border-[#7aa390]'
                      : 'border-[#dfe5df] hover:border-[#b7cabe]'
                  } cursor-pointer`}
                >
                  {/* Left accent bar */}
                  <div className={`absolute left-0 top-0 bottom-0 w-[2.5px] rounded-l-xl transition-colors ${
                    isHighlighted ? 'bg-[#5a9b86]' : 'bg-[#c7ddd2] group-hover:bg-[#5a9b86]/50'
                  }`} />

                  <div className="pl-5 pr-4 pt-4 pb-4 flex flex-col gap-2.5 flex-1">
                    {/* Title + delete */}
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-display text-sm font-semibold text-[#26312d] line-clamp-2 leading-snug">
                        {link.title || 'Untitled'}
                      </h3>
                      <button
                        onClick={(e) => handleDelete(link.id, e)}
                        className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1.5 rounded-lg hover:bg-red-500/10 text-[#9aa39f] hover:text-red-400 transition-all"
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
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[#4f8f7a]/60 hover:text-[#315f56] truncate transition-colors"
                    >
                      <ExternalLink className="size-2.5 flex-shrink-0" />
                      <span className="truncate">{link.url}</span>
                    </a>

                    {/* Summary */}
                    {link.summary && (
                      <p className="text-xs text-[#7d8984] leading-relaxed line-clamp-2">
                        {link.summary}
                      </p>
                    )}

                    {/* Tags */}
                    {broadTags.length > 0 && (
                      <div className="flex flex-col gap-1.5 mt-auto pt-1">
                        <div className="flex flex-wrap gap-1.5">
                          {broadTags.map((tag) => {
                            const tagName = getTagName(tag);
                            const isActive = selectedTag === tagName;
                            return (
                              <button
                                key={tag.id || tagName}
                                onClick={(e) => handleTagClick(tagName, e)}
                                className={`font-mono px-2.5 py-0.5 rounded-full text-[10px] tracking-wide transition-all ${
                                  isActive
                                    ? 'bg-[#315f56] text-white'
                                    : 'bg-[#edf4ef] text-[#4f8f7a]/80 hover:bg-[#dceae2] hover:text-[#315f56]'
                                }`}
                              >
                                {tagName}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Date */}
                    <div className="font-mono text-[10px] text-[#b1bab5] pt-1">
                      {new Date(link.date_saved).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Side Panel ──────────────────────────────────────────── */}
      {selectedLink && (
        <div className="fixed top-0 right-0 w-[400px] max-w-[calc(100vw-24px)] h-full bg-[#f7f8f5] border-l border-[#dfe5df] z-50 flex flex-col shadow-sm">
          <div className="flex items-center justify-between px-6 py-5 border-b border-[#dfe5df]">
            <span className="font-mono text-[10px] tracking-[0.2em] text-[#9aa39f] uppercase">Link Details</span>
            <button
              onClick={closePanel}
              className="p-2 rounded-lg hover:bg-[#f1f4f1] text-[#7d8984] hover:text-[#26312d] transition-colors"
              title="Close panel"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="border-l-2 border-[#9cb8aa] pl-4 mb-8">
              <h3 className="font-display text-base font-semibold text-[#26312d] leading-snug">
                {selectedLink.title || 'Untitled'}
              </h3>
            </div>

            <div className="space-y-6">
              <div>
                <label className="font-mono text-[10px] tracking-[0.15em] text-[#9aa39f] uppercase block mb-2">URL</label>
                <a
                  href={selectedLink.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-start gap-2 font-mono text-[11px] text-[#4f8f7a]/80 hover:text-[#315f56] break-all transition-colors leading-relaxed"
                >
                  <ExternalLink className="size-3.5 mt-0.5 flex-shrink-0" />
                  {selectedLink.url}
                </a>
              </div>

              {selectedLink.summary && (
                <div>
                  <label className="font-mono text-[10px] tracking-[0.15em] text-[#9aa39f] uppercase block mb-2">Summary</label>
                  <p className="text-sm text-[#68746f] leading-relaxed">{selectedLink.summary}</p>
                </div>
              )}

              {getBroadTags(selectedLink.tags).length > 0 && (
                <div>
                  <label className="font-mono text-[10px] tracking-[0.15em] text-[#9aa39f] uppercase block mb-2">Topics</label>
                  <div className="flex flex-wrap gap-1.5">
                    {getBroadTags(selectedLink.tags).map((tag) => {
                      const tagName = getTagName(tag);
                      return (
                        <button
                          key={tag.id || tagName}
                          onClick={(e) => handleTagClick(tagName, e)}
                          className="font-mono px-2.5 py-0.5 rounded-full text-[10px] bg-[#edf4ef] text-[#315f56] border border-[#c8d8cf] hover:bg-[#dceae2] transition-colors"
                        >
                          {tagName}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {getSpecificTags(selectedLink.tags).length > 0 && (
                <div>
                  <label className="font-mono text-[10px] tracking-[0.15em] text-[#9aa39f] uppercase block mb-2">Keywords</label>
                  <div className="flex flex-wrap gap-1.5">
                    {getSpecificTags(selectedLink.tags).map((tag) => {
                      const tagName = getTagName(tag);
                      return (
                        <span
                          key={tag.id || tagName}
                          className="font-mono px-2.5 py-0.5 rounded-full text-[10px] bg-white text-[#68746f] border border-[#d8ded8]"
                        >
                          {tagName}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="font-mono text-[10px] tracking-[0.15em] text-[#9aa39f] uppercase block mb-2">Saved</label>
                <div className="flex items-center gap-2 font-mono text-xs text-[#7d8984]">
                  <Calendar className="size-3.5" />
                  {new Date(selectedLink.date_saved).toLocaleString()}
                </div>
              </div>

              {projects.length > 0 && (
                <div>
                  <label className="font-mono text-[10px] tracking-[0.15em] text-[#9aa39f] uppercase block mb-2">Project</label>
                  <div className="flex gap-2">
                    <select
                      value={selectedProjectId}
                      onChange={(e) => {
                        setSelectedProjectId(e.target.value);
                        setProjectMessage(null);
                      }}
                      className="min-w-0 flex-1 px-3 py-2 text-sm border border-[#d8ded8] rounded-md bg-white text-[#26312d] focus:outline-none focus:border-[#8baea0]"
                    >
                      <option value="">Choose project</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>{project.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAddToProject}
                      disabled={!selectedProjectId}
                      className="px-3 py-2 text-sm font-semibold bg-[#315f56] text-white rounded-md hover:bg-[#244b44] disabled:bg-[#d8ded8] disabled:text-[#7d8984] disabled:cursor-not-allowed"
                    >
                      Add
                    </button>
                  </div>
                  {projectMessage && (
                    <p className="mt-2 font-mono text-[11px] text-[#68746f]">{projectMessage}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="px-6 py-5 border-t border-[#dfe5df]">
            <a
              href={selectedLink.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-[#315f56] hover:bg-[#244b44] text-white text-sm font-semibold rounded-md transition-colors"
            >
              <ExternalLink className="size-4" />
              Open Link
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default LinkList;
