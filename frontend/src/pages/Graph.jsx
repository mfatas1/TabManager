import { useEffect, useMemo, useState } from 'react';
import ReactFlow, { Controls, Background, useNodesState, useEdgesState } from 'reactflow';
import 'reactflow/dist/style.css';
import { useLinks } from '../hooks/useLinks';
import { buildGraphData } from '../utils/graphTransform';
import { applyForceLayout } from '../utils/forceLayout';
import LinkNode from '../components/LinkNode';
import { X, ExternalLink, Tag, Calendar, Network } from 'lucide-react';

// Define node types outside component to avoid re-renders
const nodeTypes = { linkNode: LinkNode };

export default function Graph() {
  const { links, loading, error } = useLinks();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedLink, setSelectedLink] = useState(null);
  const [selectedTag, setSelectedTag] = useState(null);
  
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

  // Transform links into graph data
  useEffect(() => {
    const updateGraph = async () => {
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

  const handleTagClick = (tagName) => {
    setSelectedTag((current) => (current === tagName ? null : tagName));
  };

  const clearTagFilter = () => {
    setSelectedTag(null);
  };

  const onNodeClick = (event, node) => {
    if (event.ctrlKey || event.metaKey || event.button === 2) {
      if (node.data.url) {
        window.open(node.data.url, '_blank');
      }
    } else {
      const link = links.find(l => String(l.id) === node.id);
      if (link) {
        setSelectedLink(link);
      }
    }
  };

  const closePanel = () => {
    setSelectedLink(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="text-slate-400">Loading graph...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="text-red-400">Error loading graph: {error}</div>
      </div>
    );
  }

  if (links.length === 0) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="text-center">
          <div className="size-16 mx-auto mb-6 rounded-full bg-indigo-500/10 flex items-center justify-center">
            <Tag className="size-8 text-indigo-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">No links to display</h2>
          <p className="text-slate-400">Add some links to see the graph!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1117] flex flex-col">
      {/* Hero Header Section */}
      <div className="border-b border-white/5 bg-gradient-to-b from-indigo-500/5 to-transparent">
        <div className="max-w-6xl mx-auto px-6 pt-24 pb-8">
          <div className="flex flex-col items-center text-center">
            {/* Eyebrow badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-medium text-indigo-300 mb-6">
              <Network className="size-3" />
              Visual knowledge map
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">
              Knowledge <span className="text-indigo-400">Graph</span>
            </h1>
            <p className="max-w-lg text-slate-400 text-base leading-relaxed mb-8">
              Explore your saved links as an interactive network. Related content clusters together based on shared tags.
            </p>
            
            {/* Tag Filters */}
            <div className="w-full max-w-2xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filter by tag</span>
                {selectedTag && (
                  <button
                    type="button"
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                    onClick={clearTagFilter}
                  >
                    Clear filter
                  </button>
                )}
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {availableTags.length === 0 && (
                  <span className="text-sm text-slate-500">No tags available yet.</span>
                )}
                {availableTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagClick(tag)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      selectedTag === tag
                        ? 'bg-indigo-500 text-white border-indigo-500'
                        : 'bg-white/5 text-slate-400 border-white/10 hover:bg-indigo-500/10 hover:border-indigo-500/30 hover:text-indigo-300'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Graph */}
      <div className={`flex-1 transition-all ${selectedLink ? 'mr-[400px]' : ''}`}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={stableNodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          fitView
          className="bg-[#0f1117]"
        >
          <Controls className="!bg-[#1e2433] !border-white/10 !rounded-lg [&>button]:!bg-[#1e2433] [&>button]:!border-white/10 [&>button]:!text-slate-400 [&>button:hover]:!bg-indigo-500/10" />
          <Background variant="dots" gap={20} size={1} color="rgba(148, 163, 184, 0.1)" />
        </ReactFlow>
      </div>
      
      {/* Side Panel */}
      {selectedLink && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40 animate-in fade-in duration-200" 
            onClick={closePanel}
          />
          <div className="fixed top-0 right-0 w-[400px] h-full bg-[#0d0f16] border-l border-white/5 z-50 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-[#0f1117]">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Link Details</h2>
              <button 
                className="p-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-colors" 
                onClick={closePanel}
              >
                <X className="size-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <h3 className="text-lg font-semibold text-white leading-snug mb-6">
                {selectedLink.title || 'Untitled'}
              </h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">URL</label>
                  <a 
                    href={selectedLink.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 break-all transition-colors"
                  >
                    <ExternalLink className="size-4 flex-shrink-0" />
                    {selectedLink.url}
                  </a>
                </div>
                
                {selectedLink.summary && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Summary</label>
                    <p className="text-sm text-slate-400 leading-relaxed">{selectedLink.summary}</p>
                  </div>
                )}
                
                {(() => {
                  const specificTags = selectedLink.tags 
                    ? selectedLink.tags.filter(tag => {
                        const tagObj = typeof tag === 'string' ? { name: tag } : tag;
                        return tagObj.tag_type === 'specific' || !tagObj.tag_type;
                      })
                    : [];
                  return specificTags.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Tags</label>
                      <div className="flex flex-wrap gap-2">
                        {specificTags.map((tag) => {
                          const tagObj = typeof tag === 'string' ? { name: tag, id: tag } : tag;
                          return (
                            <span 
                              key={tagObj.id || tagObj.name} 
                              className="px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/25"
                            >
                              {tagObj.name}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
                
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Saved</label>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Calendar className="size-4" />
                    {new Date(selectedLink.date_saved).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-5 border-t border-white/5">
              <a
                href={selectedLink.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <ExternalLink className="size-4" />
                Open Link
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
