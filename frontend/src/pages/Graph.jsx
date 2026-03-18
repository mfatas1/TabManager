import { useEffect, useMemo, useState } from 'react';
import ReactFlow, { Controls, Background, useNodesState, useEdgesState } from 'reactflow';
import 'reactflow/dist/style.css';  // important, don't forget this or it will look broken
import { useLinks } from '../hooks/useLinks';
import { buildGraphData } from '../utils/graphTransform';
import { applyForceLayout } from '../utils/forceLayout';
import LinkNode from '../components/LinkNode';
import './Graph.css';

// Define node types outside component to avoid re-renders
const nodeTypes = { linkNode: LinkNode };

export default function Graph() {
  const { links, loading, error } = useLinks();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedLink, setSelectedLink] = useState(null);
  const [selectedTag, setSelectedTag] = useState(null);
  
  // Memoize nodeTypes to ensure it's stable across renders
  const stableNodeTypes = useMemo(() => nodeTypes, []);

  // Collect all available broad tags for filtering
  const availableTags = useMemo(() => {
    const tagSet = new Set();
    links.forEach((link) => {
      (link.tags || []).forEach((tag) => {
        const tagObj =
          typeof tag === 'string' ? { name: tag, tag_type: 'broad' } : tag;
        if (tagObj.tag_type === 'broad' && tagObj.name) {
          tagSet.add(tagObj.name);
        }
      });
    });
    return Array.from(tagSet).sort();
  }, [links]);

  // Transform links into graph data whenever links or filters change
  // and apply a force-directed layout so related clusters group together
  useEffect(() => {
    const updateGraph = async () => {
      // Apply tag filter at the link level so only nodes/edges
      // with the selected tag are included in the graph
      const filteredLinks = selectedTag
        ? links.filter((link) =>
            (link.tags || []).some((tag) => {
              const tagObj =
                typeof tag === 'string' ? { name: tag } : tag;
              return tagObj.name === selectedTag;
            })
          )
        : links;

      if (filteredLinks.length > 0) {
        const { nodes, edges } = buildGraphData(filteredLinks);
        const layoutedNodes = await applyForceLayout(nodes, edges);
        setNodes(layoutedNodes);
        setEdges(edges);
      } else {
        setNodes([]);
        setEdges([]);
      }
    };

    updateGraph();
  }, [links, selectedTag, setNodes, setEdges]);

  // Handle tag filter click (toggle on/off)
  const handleTagClick = (tagName) => {
    setSelectedTag((current) => (current === tagName ? null : tagName));
  };

  const clearTagFilter = () => {
    setSelectedTag(null);
  };

  // Handle node click - open side panel with link details
  // Right-click or Ctrl+click opens in new tab
  const onNodeClick = (event, node) => {
    if (event.ctrlKey || event.metaKey || event.button === 2) {
      // Ctrl/Cmd click or right click - open in new tab
      if (node.data.url) {
        window.open(node.data.url, '_blank');
      }
    } else {
      // Regular click - open side panel
      const link = links.find(l => String(l.id) === node.id);
      if (link) {
        setSelectedLink(link);
      }
    }
  };

  // Close side panel
  const closePanel = () => {
    setSelectedLink(null);
  };

  if (loading) {
    return (
      <div className="graph-container">
        <div className="loading">Loading graph...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="graph-container">
        <div className="error">Error loading graph: {error}</div>
      </div>
    );
  }

  if (links.length === 0) {
    return (
      <div className="graph-container">
        <div className="empty-state">
          No links to display. Add some links to see the graph!
        </div>
      </div>
    );
  }

  return (
    <div className="graph-container">
      {/* Tag Filters */}
      <div className="graph-filters">
        <div className="graph-filters-header">
          <span className="graph-filters-title">Filter by tag</span>
          {selectedTag && (
            <button
              type="button"
              className="graph-filters-clear"
              onClick={clearTagFilter}
            >
              Clear
            </button>
          )}
        </div>
        <div className="graph-filters-tags">
          {availableTags.length === 0 && (
            <span className="graph-filters-empty">
              No tags available yet.
            </span>
          )}
          {availableTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => handleTagClick(tag)}
              className={`graph-tag-pill ${
                selectedTag === tag ? 'graph-tag-pill-active' : ''
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className={`graph-wrapper ${selectedLink ? 'graph-wrapper-with-panel' : ''}`}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={stableNodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          fitView
        >
          <Controls />      {/* zoom in/out/fit buttons in the corner */}
          <Background variant="dots" gap={16} size={1} />    {/* dotted background using border color */}
        </ReactFlow>
      </div>
      
      {/* Side Panel */}
      {selectedLink && (
        <>
          <div className="side-panel-overlay" onClick={closePanel}></div>
          <div className="side-panel">
            <div className="side-panel-header">
              <h2>Link Details</h2>
              <button className="side-panel-close" onClick={closePanel} title="Close">
                ×
              </button>
            </div>
            
            <div className="side-panel-content">
              <div className="side-panel-section">
                <h3>{selectedLink.title || 'Untitled'}</h3>
              </div>
              
              <div className="side-panel-section">
                <label>URL</label>
                <a 
                  href={selectedLink.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="side-panel-url"
                >
                  {selectedLink.url}
                </a>
              </div>
              
              {selectedLink.summary && (
                <div className="side-panel-section">
                  <label>Summary</label>
                  <p className="side-panel-summary">{selectedLink.summary}</p>
                </div>
              )}
              
              {(() => {
                const specificTags = selectedLink.tags 
                  ? selectedLink.tags.filter(tag => {
                      const tagObj = typeof tag === 'string' ? { name: tag } : tag;
                      return tagObj.tag_type === 'specific' || !tagObj.tag_type; // fallback for old data
                    })
                  : [];
                return specificTags.length > 0 && (
                  <div className="side-panel-section">
                    <label>Tags</label>
                    <div className="side-panel-tags">
                      {specificTags.map((tag) => {
                        const tagObj = typeof tag === 'string' ? { name: tag, id: tag } : tag;
                        return (
                          <span key={tagObj.id || tagObj.name} className="side-panel-tag">
                            {tagObj.name}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
              
              <div className="side-panel-section">
                <label>Saved</label>
                <p className="side-panel-date">
                  {new Date(selectedLink.date_saved).toLocaleString()}
                </p>
              </div>
              
              <div className="side-panel-actions">
                <a
                  href={selectedLink.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="side-panel-button side-panel-button-primary"
                >
                  Open Link
                </a>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
