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

  // Get filter and highlight from URL params
  const selectedTag = searchParams.get('tag');
  const highlightedLinkId = searchParams.get('highlight');

  // Filter links by selected tag (works with both specific and broad tags)
  const filteredLinks = useMemo(() => {
    if (!selectedTag) return links;
    return links.filter(link => 
      link.tags && link.tags.some(tag => 
        (typeof tag === 'string' ? tag : tag.name) === selectedTag
      )
    );
  }, [links, selectedTag]);

  // Get tags by type
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

  // Handle tag click - filter by tag
  const handleTagClick = (tagName, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (selectedTag === tagName) {
      setSearchParams({});
    } else {
      setSearchParams({ tag: tagName });
    }
  };

  // Clear tag filter
  const clearFilter = () => {
    setSearchParams({});
  };

  // Scroll to highlighted link when it appears
  const highlightedRef = useRef(null);
  useEffect(() => {
    if (highlightedLinkId && highlightedRef.current) {
      setTimeout(() => {
        highlightedRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
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
    
    if (!url.trim()) {
      return;
    }

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
        err.response?.data?.detail || 
        err.message || 
        'Failed to save link. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (linkId) => {
    if (!window.confirm('Are you sure you want to delete this link?')) {
      return;
    }

    try {
      await deleteLink(linkId);
      await refetch();
    } catch (err) {
      alert(err.response?.data?.detail || err.message || 'Failed to delete link');
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1117] text-white">
      {/* Hero Header Section */}
      <div className="border-b border-white/5 bg-gradient-to-b from-indigo-500/5 to-transparent">
        <div className="max-w-6xl mx-auto px-6 pt-24 pb-12">
          <div className="flex flex-col items-center text-center mb-10">
            {/* Eyebrow badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-medium text-indigo-300 mb-6">
              <BookOpen className="size-3" />
              Your saved knowledge
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">
              Your <span className="text-indigo-400">Library</span>
            </h1>
            <p className="max-w-lg text-slate-400 text-base leading-relaxed mb-8">
              Save any URL and let AI automatically extract titles, summaries, and semantic tags for intelligent organization.
            </p>
            
            {/* URL Submission Form */}
            <form onSubmit={handleSubmit} className="w-full max-w-xl">
              <div className="flex flex-col sm:flex-row items-stretch gap-3">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Paste a URL to save..."
                  disabled={submitting}
                  className="flex-1 px-5 py-3 text-sm border border-white/10 rounded-xl bg-white/5 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                />
                <button 
                  type="submit" 
                  disabled={submitting || !url.trim()}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold bg-indigo-500 text-white rounded-xl hover:bg-indigo-400 disabled:bg-slate-700 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-indigo-500/25"
                >
                  <Plus className="size-4" />
                  {submitting ? 'Saving...' : 'Save Link'}
                </button>
              </div>
              
              {/* Submission feedback */}
              {submitSuccess && (
                <div className="mt-4 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-sm">
                  Link saved successfully!
                </div>
              )}
              {submitError && (
                <div className="mt-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-sm">
                  {submitError}
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* Tag Filter Display */}
        {selectedTag && (
          <div className="inline-flex items-center gap-3 px-4 py-2 mb-8 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-sm text-indigo-300">
            <span>Filtered by: <strong className="text-indigo-200">{selectedTag}</strong></span>
            <button 
              onClick={clearFilter} 
              className="p-1 rounded-full hover:bg-indigo-500/20 transition-colors"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}

        {/* Links List */}
        <div>
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="rounded-xl border border-white/8 bg-white/[0.03] p-5">
                  <div className="h-5 w-3/4 rounded bg-white/10 animate-pulse mb-3" />
                  <div className="h-3 w-full rounded bg-white/10 animate-pulse mb-2" />
                  <div className="h-3 w-2/3 rounded bg-white/10 animate-pulse mb-4" />
                  <div className="flex gap-2">
                    <div className="h-6 w-16 rounded-full bg-white/10 animate-pulse" />
                    <div className="h-6 w-20 rounded-full bg-white/10 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {error && (
            <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/25 text-red-300">
              Error loading links: {error}
            </div>
          )}
          
          {!loading && !error && links.length === 0 && (
            <div className="text-center py-20">
              <div className="size-16 mx-auto mb-6 rounded-full bg-indigo-500/10 flex items-center justify-center">
                <Plus className="size-8 text-indigo-400" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Your library is empty</h2>
              <p className="text-slate-400">Paste a URL above to save your first link.</p>
            </div>
          )}
          
          {!loading && !error && selectedTag && filteredLinks.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              No links found with tag "{selectedTag}".{' '}
              <button onClick={clearFilter} className="text-indigo-400 hover:text-indigo-300 underline">
                Clear filter
              </button>
            </div>
          )}
          
          {!loading && !error && filteredLinks.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredLinks.map((link) => {
                const isHighlighted = highlightedLinkId && String(link.id) === highlightedLinkId;
                const broadTags = getBroadTags(link.tags);
                const specificTags = getSpecificTags(link.tags);
                
                return (
                  <div 
                    key={link.id} 
                    ref={isHighlighted ? highlightedRef : null}
                    className={`group rounded-xl border bg-white/[0.03] p-5 flex flex-col gap-3 transition-all hover:border-indigo-500/30 hover:bg-indigo-500/5 ${
                      isHighlighted 
                        ? 'border-indigo-500 ring-2 ring-indigo-500/30' 
                        : 'border-white/8'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <h3 className="text-sm font-semibold text-slate-200 line-clamp-2 leading-snug">
                        {link.title || 'Untitled'}
                      </h3>
                      <button
                        onClick={() => handleDelete(link.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-all"
                        title="Delete link"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    
                    <a 
                      href={link.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 truncate transition-colors"
                    >
                      <ExternalLink className="size-3 flex-shrink-0" />
                      <span className="truncate">{link.url}</span>
                    </a>
                    
                    {link.summary && (
                      <p className="text-sm text-slate-500 leading-relaxed line-clamp-3">
                        {link.summary}
                      </p>
                    )}
                    
                    {(broadTags.length > 0 || specificTags.length > 0) && (
                      <div className="flex flex-col gap-2 mt-auto pt-2">
                        {/* Broad tags - clickable */}
                        {broadTags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {broadTags.map((tag) => {
                              const tagName = typeof tag === 'string' ? tag : tag.name;
                              const isActive = selectedTag === tagName;
                              return (
                                <button
                                  key={tag.id || tagName}
                                  onClick={(e) => handleTagClick(tagName, e)}
                                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                                    isActive 
                                      ? 'bg-indigo-500 text-white' 
                                      : 'bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20'
                                  }`}
                                  title={isActive ? 'Click to clear filter' : 'Click to filter by this tag'}
                                >
                                  {tagName}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        {/* Specific tags - subtle */}
                        {specificTags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {specificTags.map((tag) => {
                              const tagName = typeof tag === 'string' ? tag : tag.name;
                              return (
                                <span
                                  key={tag.id || tagName}
                                  className="px-2.5 py-1 rounded-full text-xs text-slate-500 bg-white/5"
                                >
                                  {tagName}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="text-xs text-slate-600 mt-1">
                      Saved {new Date(link.date_saved).toLocaleDateString()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LinkList;
