import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useLinks } from '../hooks/useLinks';
import { saveLink, deleteLink } from '../api/links';
import './LinkList.css';

function LinkList() {
  const { links, loading, error, refetch } = useLinks();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
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
      return tagObj.tag_type === 'specific' || (!tagObj.tag_type && tagObj.tag_type !== 'broad'); // fallback for old data
    });
  };

  // Handle tag click - filter by tag
  const handleTagClick = (tagName, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (selectedTag === tagName) {
      // If clicking the same tag, clear the filter
      setSearchParams({});
    } else {
      // Filter by the clicked tag
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
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        highlightedRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }, 300);
      
      // Clear highlight after 3 seconds
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
      
      // Clear input and refresh list
      setUrl('');
      setSubmitSuccess(true);
      await refetch();
      
      // Clear success message after 2 seconds
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
      await refetch(); // Refresh the list after deletion
    } catch (err) {
      alert(err.response?.data?.detail || err.message || 'Failed to delete link');
    }
  };

  return (
    <div className="link-list">
      <div className="link-list-header">
        <h1 className="page-title">Library</h1>
        {/* URL Submission Form */}
        <form onSubmit={handleSubmit} className="url-form">
          <div className="form-group">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste a URL here..."
              disabled={submitting}
              className="url-input"
            />
            <button 
              type="submit" 
              disabled={submitting || !url.trim()}
              className="submit-button"
            >
              {submitting ? 'Saving...' : 'Save Link'}
            </button>
          </div>
          
          {/* Submission feedback */}
          {submitSuccess && (
            <div className="message message-success">
              Link saved successfully!
            </div>
          )}
          {submitError && (
            <div className="message message-error">
              {submitError}
            </div>
          )}
        </form>
      </div>

      {/* Tag Filter Display */}
      {selectedTag && (
        <div className="filter-badge">
          <span>Filtered by: <strong>{selectedTag}</strong></span>
          <button onClick={clearFilter} className="clear-filter-button">
            × Clear
          </button>
        </div>
      )}

      {/* Links List */}
      <div className="links-container">
        {loading && (
          <div className="links-grid">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="link-card-skeleton">
                <div className="skeleton skeleton-title" />
                <div className="skeleton skeleton-summary" />
                <div className="skeleton skeleton-summary-short" />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <div className="skeleton skeleton-tag" />
                  <div className="skeleton skeleton-tag" />
                </div>
              </div>
            ))}
          </div>
        )}
        
        {error && (
          <div className="message message-error">
            Error loading links: {error}
          </div>
        )}
        
        {!loading && !error && links.length === 0 && (
          <div className="empty-state">
            <h2>Your library is empty</h2>
            <p>Paste a URL above to save your first link.</p>
          </div>
        )}
        
        {!loading && !error && selectedTag && filteredLinks.length === 0 && (
          <div className="empty-state">
            No links found with tag "{selectedTag}". <button onClick={clearFilter} className="link-button">Clear filter</button>
          </div>
        )}
        
        {!loading && !error && filteredLinks.length > 0 && (
          <div className="links-grid">
            {filteredLinks.map((link) => {
              const isHighlighted = highlightedLinkId && String(link.id) === highlightedLinkId;
              return (
                <div 
                  key={link.id} 
                  ref={isHighlighted ? highlightedRef : null}
                  className={`link-card ${isHighlighted ? 'link-card-highlighted' : ''}`}
                  id={isHighlighted ? 'highlighted-link' : undefined}
                >
                  <div className="link-header">
                    <h3 className="link-title">
                      {link.title || 'Untitled'}
                    </h3>
                    <button
                      onClick={() => handleDelete(link.id)}
                      className="delete-button"
                      title="Delete link"
                    >
                      ×
                    </button>
                  </div>
                  <a 
                    href={link.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="link-url"
                  >
                    {link.url}
                  </a>
                  {link.summary && (
                    <p className="link-summary">{link.summary}</p>
                  )}
                  {(() => {
                    const broadTags = getBroadTags(link.tags);
                    const specificTags = getSpecificTags(link.tags);
                    const hasTags = broadTags.length > 0 || specificTags.length > 0;
                    
                    return hasTags && (
                      <div className="tags-section">
                        {/* Broad tags - clickable and prominent */}
                        {broadTags.length > 0 && (
                          <div className="tags-container">
                            {broadTags.map((tag) => {
                              const tagName = typeof tag === 'string' ? tag : tag.name;
                              const isActive = selectedTag === tagName;
                              return (
                                <button
                                  key={tag.id || tagName}
                                  onClick={(e) => handleTagClick(tagName, e)}
                                  className={`tag-pill tag-pill-broad ${isActive ? 'tag-pill-active' : ''}`}
                                  title={isActive ? 'Click to clear filter' : 'Click to filter by this tag'}
                                >
                                  {tagName}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        {/* Specific tags - subtle and not clickable */}
                        {specificTags.length > 0 && (
                          <div className="tags-container tags-container-specific">
                            {specificTags.map((tag) => {
                              const tagName = typeof tag === 'string' ? tag : tag.name;
                              return (
                                <span
                                  key={tag.id || tagName}
                                  className="tag-pill tag-pill-specific"
                                  title="Specific tag (not filterable)"
                                >
                                  {tagName}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  <div className="link-date">
                    Saved: {new Date(link.date_saved).toLocaleDateString()}
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
