import { useEffect, useMemo, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import ReactFlow, { Controls, Background, useNodesState, useEdgesState } from 'reactflow';
import 'reactflow/dist/style.css';
import { useLinks } from '../hooks/useLinks';
import { buildGraphData } from '../utils/graphTransform';
import { applyForceLayout } from '../utils/forceLayout';
import { addLinkToProject, getProjects } from '../api/projects';
import ProjectDropdown from '../components/ProjectDropdown';
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
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [projectMessage, setProjectMessage] = useState(null);

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

  const handleTagClick = (tagName) => setSearchParams(selectedTag === tagName ? {} : { tag: tagName });
  const clearTagFilter = () => setSearchParams({});

  const openPanel = (link) => {
    setProjectMessage(null);
    setSelectedLink(link);
  };

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
      if (link) openPanel(link);
    }
  };

  const closePanel = () => setSelectedLink(null);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f8f5] flex items-center justify-center">
        <span className="font-mono text-xs text-[#7d8984] tracking-widest uppercase animate-pulse">
          Loading graph…
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f7f8f5] flex items-center justify-center">
        <span className="font-mono text-xs text-red-400">Error: {error}</span>
      </div>
    );
  }

  if (links.length === 0) {
    return (
      <div className="min-h-screen bg-[#f7f8f5] flex items-center justify-center">
        <div className="text-center">
          <div className="size-14 mx-auto mb-6 rounded-lg border border-[#d8ded8] bg-white flex items-center justify-center">
            <Tag className="size-6 text-[#7d8984]" />
          </div>
          <h2 className="font-display text-lg font-semibold text-[#5f6c67] mb-2">No links yet</h2>
          <p className="font-mono text-xs text-[#9aa39f] uppercase tracking-widest">Add some links to see the graph</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f7f8f5] flex flex-col">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="relative border-b border-[#e9d5ff] overflow-hidden">
        <div className="relative max-w-5xl mx-auto px-6 pt-20 pb-6">
          <div className="flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2.5 rounded-md border border-[#ddd6fe] bg-white px-4 py-1.5 mb-7">
              <Network className="size-3 text-[#7c3aed]" />
              <span className="font-mono text-[11px] tracking-[0.12em] text-[#5b21b6]/90 uppercase">Visual knowledge map</span>
            </div>

            <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tight leading-[0.92] mb-4">
              Knowledge <span className="text-[#7c3aed]">Graph</span>
            </h1>
            <p className="max-w-sm text-sm text-[#68746f] leading-relaxed mb-10">
              Explore your saved links as an interactive network. Related content clusters by shared tags.
            </p>

            {/* Tag filters */}
            {broadTagCounts.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={clearTagFilter}
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
                    type="button"
                    onClick={() => handleTagClick(tag)}
                    className={`font-mono px-3.5 py-1.5 rounded-full text-[11px] border transition-all ${
                      selectedTag === tag
                        ? 'bg-[#5b21b6] border-[#5b21b6] text-white'
                        : 'bg-transparent border-[#d8ded8] text-[#68746f] hover:border-[#a8bfb2] hover:text-[#5b21b6]'
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
          className="bg-[#f7f8f5]"
        >
          <Controls className="!bg-white !border-[#d8ded8] !rounded-lg [&>button]:!bg-white [&>button]:!border-[#d8ded8] [&>button]:!text-[#68746f] [&>button:hover]:!bg-[#f5f3ff] [&>button:hover]:!text-[#5b21b6]" />
          <Background variant="dots" gap={24} size={1} color="rgba(79, 143, 122, 0.16)" />
        </ReactFlow>
      </div>

      {/* ── Side Panel ──────────────────────────────────────────── */}
      {selectedLink && (
        <div className="fixed top-0 right-0 w-[400px] h-full bg-[#f7f8f5] border-l border-[#e9d5ff] z-50 flex flex-col shadow-sm">
            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#e9d5ff]">
              <span className="font-mono text-[10px] tracking-[0.2em] text-[#9aa39f] uppercase">Link Details</span>
              <button
                onClick={closePanel}
                className="p-2 rounded-lg hover:bg-[#f1f4f1] text-[#7d8984] hover:text-[#26312d] transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              {/* Left accent */}
              <div className="border-l-2 border-[#c4b5fd] pl-4 mb-8">
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
                    className="inline-flex items-start gap-2 font-mono text-[11px] text-[#7c3aed]/80 hover:text-[#5b21b6] break-all transition-colors leading-relaxed"
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

                {(() => {
                  const specificTags = selectedLink.tags
                    ? selectedLink.tags.filter((tag) => {
                        const tagObj = typeof tag === 'string' ? { name: tag } : tag;
                        return tagObj.tag_type === 'specific' || !tagObj.tag_type;
                      })
                    : [];
                  return specificTags.length > 0 && (
                    <div>
                      <label className="font-mono text-[10px] tracking-[0.15em] text-[#9aa39f] uppercase block mb-2">Keywords</label>
                      <div className="flex flex-wrap gap-1.5">
                        {specificTags.map((tag) => {
                          const tagObj = typeof tag === 'string' ? { name: tag, id: tag } : tag;
                          return (
                            <span
                              key={tagObj.id || tagObj.name}
                              className="font-mono px-2.5 py-0.5 rounded-full text-[10px] bg-[#f5f3ff] text-[#7c3aed]/80 border border-[#ddd6fe]"
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
                  <label className="font-mono text-[10px] tracking-[0.15em] text-[#9aa39f] uppercase block mb-2">Saved</label>
                  <div className="flex items-center gap-2 font-mono text-xs text-[#7d8984]">
                    <Calendar className="size-3.5" />
                    {new Date(selectedLink.date_saved).toLocaleString()}
                  </div>
                </div>

                {projects.length > 0 && (
                  <div>
                    <label className="font-mono text-[10px] tracking-[0.15em] text-[#9aa39f] uppercase block mb-2">Add to project</label>
                    <div className="flex gap-2">
                      <ProjectDropdown
                        projects={projects}
                        value={selectedProjectId}
                        onChange={(value) => {
                          setSelectedProjectId(value);
                          setProjectMessage(null);
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAddToProject}
                        disabled={!selectedProjectId}
                        className="px-4 py-2.5 text-sm font-semibold bg-[#5b21b6] text-white rounded-lg hover:bg-[#244b44] disabled:bg-[#d8ded8] disabled:text-[#7d8984] disabled:cursor-not-allowed transition-colors"
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

            <div className="px-6 py-5 border-t border-[#e9d5ff]">
              <a
                href={selectedLink.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-[#5b21b6] hover:bg-[#244b44] text-white text-sm font-semibold rounded-md transition-colors"
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
