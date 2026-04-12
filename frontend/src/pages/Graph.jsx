import { useEffect, useMemo, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import ReactFlow, { Controls, Background, useNodesState, useEdgesState } from 'reactflow';
import 'reactflow/dist/style.css';
import { useLinks } from '../hooks/useLinks';
import { buildGraphData } from '../utils/graphTransform';
import { applyForceLayout } from '../utils/forceLayout';
import LinkNode from '../components/LinkNode';
import TagNode from '../components/TagNode';
import { X, ExternalLink, Tag, Calendar, Network } from 'lucide-react';

const nodeTypes = { linkNode: LinkNode, tagNode: TagNode };

export default function Graph() {
  const { links, loading, error } = useLinks();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedLink, setSelectedLink] = useState(null);
  const [showAllTags, setShowAllTags] = useState(false);

  const selectedTag = searchParams.get('tag');
  const rfInstance = useRef(null);

  const broadTagCounts = useMemo(() => {
    const counts = {};
    links.forEach((link) => {
      (link.tags || []).forEach((tag) => {
        const tagObj = typeof tag === 'string' ? { name: tag, tag_type: 'broad' } : tag;
        if (tagObj.tag_type === 'broad' && tagObj.name) {
          counts[tagObj.name] = (counts[tagObj.name] || 0) + 1;
        }
      });
    });
    return Object.entries(counts).sort(([, a], [, b]) => b - a);
  }, [links]);

  const TAG_LIMIT = 8;
  const visibleTags = showAllTags ? broadTagCounts : broadTagCounts.slice(0, TAG_LIMIT);
  const hiddenCount = broadTagCounts.length - TAG_LIMIT;

  useEffect(() => {
    const updateGraph = async () => {
      const filteredLinks = selectedTag
        ? links.filter((link) =>
            (link.tags || []).some((tag) => {
              const tagObj = typeof tag === 'string' ? { name: tag } : tag;
              return tagObj.name === selectedTag;
            })
          )
        : links;

      if (filteredLinks.length > 0) {
        const { nodes, edges } = buildGraphData(filteredLinks);
        const layoutedNodes = await applyForceLayout(nodes, edges);
        setNodes(layoutedNodes);
        setEdges(edges);
        setTimeout(() => rfInstance.current?.fitView({ padding: 0.25 }), 50);
      } else {
        setNodes([]);
        setEdges([]);
      }
    };
    updateGraph();
  }, [links, selectedTag, setNodes, setEdges]);

  const handleTagClick = (tagName) => setSearchParams(selectedTag === tagName ? {} : { tag: tagName });
  const clearTagFilter = () => setSearchParams({});

  const onNodeClick = (event, node) => {
    if (node.type === 'tagNode') {
      // Clicking a hub filters to that tag
      handleTagClick(node.data.label);
      return;
    }
    if (event.ctrlKey || event.metaKey || event.button === 2) {
      if (node.data.url) window.open(node.data.url, '_blank');
    } else {
      const link = links.find((l) => String(l.id) === node.id);
      if (link) setSelectedLink(link);
    }
  };

  const closePanel = () => setSelectedLink(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090e] flex items-center justify-center">
        <span className="font-mono text-xs text-slate-600 tracking-widest uppercase animate-pulse">
          Loading graph…
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#09090e] flex items-center justify-center">
        <span className="font-mono text-xs text-red-400">Error: {error}</span>
      </div>
    );
  }

  if (links.length === 0) {
    return (
      <div className="min-h-screen bg-[#09090e] flex items-center justify-center">
        <div className="text-center">
          <div className="size-14 mx-auto mb-6 rounded-2xl border border-white/8 bg-white/[0.02] flex items-center justify-center">
            <Tag className="size-6 text-slate-600" />
          </div>
          <h2 className="font-display text-lg font-semibold text-slate-400 mb-2">No links yet</h2>
          <p className="font-mono text-xs text-slate-700 uppercase tracking-widest">Add some links to see the graph</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#09090e] flex flex-col">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="relative border-b border-white/5 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[200px] bg-indigo-600/6 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-6 pt-20 pb-6">
          <div className="flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2.5 rounded-full border border-indigo-500/20 bg-indigo-500/6 px-4 py-1.5 mb-7">
              <Network className="size-3 text-indigo-400" />
              <span className="font-mono text-[11px] tracking-[0.12em] text-indigo-300/90 uppercase">Visual knowledge map</span>
            </div>

            <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tight leading-[0.92] mb-4">
              Knowledge <span className="text-indigo-400">Graph</span>
            </h1>
            <p className="max-w-sm text-sm text-slate-500 leading-relaxed mb-10">
              Explore your saved links as an interactive network. Related content clusters by shared tags.
            </p>

            {/* Tag filters */}
            {broadTagCounts.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={clearTagFilter}
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
                    type="button"
                    onClick={() => handleTagClick(tag)}
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
          </div>
        </div>
      </div>

      {/* ── Graph canvas ────────────────────────────────────────── */}
      <div className={`h-screen transition-all ${selectedLink ? 'mr-[400px]' : ''}`}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onInit={(instance) => { rfInstance.current = instance; }}
          nodeOrigin={[0.5, 0.5]}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          minZoom={0.05}
          maxZoom={2}
          className="bg-[#09090e]"
        >
          <Controls className="!bg-[#0d1017] !border-white/8 !rounded-xl [&>button]:!bg-[#0d1017] [&>button]:!border-white/8 [&>button]:!text-slate-500 [&>button:hover]:!bg-indigo-500/10 [&>button:hover]:!text-indigo-300" />
          <Background variant="dots" gap={24} size={1} color="rgba(255,255,255,0.04)" />
        </ReactFlow>
      </div>

      {/* ── Side Panel ──────────────────────────────────────────── */}
      {selectedLink && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40 backdrop-blur-[2px]"
            onClick={closePanel}
          />
          <div className="fixed top-0 right-0 w-[400px] h-full bg-[#09090e] border-l border-white/6 z-50 flex flex-col">
            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
              <span className="font-mono text-[10px] tracking-[0.2em] text-slate-700 uppercase">Link Details</span>
              <button
                onClick={closePanel}
                className="p-2 rounded-lg hover:bg-white/5 text-slate-600 hover:text-white transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              {/* Left accent */}
              <div className="border-l-2 border-indigo-500/40 pl-4 mb-8">
                <h3 className="font-display text-base font-semibold text-white leading-snug">
                  {selectedLink.title || 'Untitled'}
                </h3>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="font-mono text-[10px] tracking-[0.15em] text-slate-700 uppercase block mb-2">URL</label>
                  <a
                    href={selectedLink.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-start gap-2 font-mono text-[11px] text-indigo-400/80 hover:text-indigo-300 break-all transition-colors leading-relaxed"
                  >
                    <ExternalLink className="size-3.5 mt-0.5 flex-shrink-0" />
                    {selectedLink.url}
                  </a>
                </div>

                {selectedLink.summary && (
                  <div>
                    <label className="font-mono text-[10px] tracking-[0.15em] text-slate-700 uppercase block mb-2">Summary</label>
                    <p className="text-sm text-slate-500 leading-relaxed">{selectedLink.summary}</p>
                  </div>
                )}

                {(() => {
                  const specificTags = selectedLink.tags
                    ? selectedLink.tags.filter((tag) => {
                        const tagObj = typeof tag === 'string' ? { name: tag } : tag;
                        return tagObj.tag_type === 'specific' || !tagObj.tag_type;
                      })
                    : [];
                  return specificTags.length > 0 && (
                    <div>
                      <label className="font-mono text-[10px] tracking-[0.15em] text-slate-700 uppercase block mb-2">Tags</label>
                      <div className="flex flex-wrap gap-1.5">
                        {specificTags.map((tag) => {
                          const tagObj = typeof tag === 'string' ? { name: tag, id: tag } : tag;
                          return (
                            <span
                              key={tagObj.id || tagObj.name}
                              className="font-mono px-2.5 py-0.5 rounded-full text-[10px] bg-indigo-500/10 text-indigo-400/80 border border-indigo-500/15"
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
                  <label className="font-mono text-[10px] tracking-[0.15em] text-slate-700 uppercase block mb-2">Saved</label>
                  <div className="flex items-center gap-2 font-mono text-xs text-slate-600">
                    <Calendar className="size-3.5" />
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
                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-indigo-500/15"
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
