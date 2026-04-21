import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Archive, FolderKanban, Plus, RotateCcw, Search, Trash2, X } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import { createProject, deleteProject, getProjects, updateProject } from '../api/projects';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [pendingDeleteProject, setPendingDeleteProject] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProjects = projects.filter((project) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    return (
      (project.name || '').toLowerCase().includes(query) ||
      (project.description || '').toLowerCase().includes(query)
    );
  });
  const activeProjects = filteredProjects.filter((project) => project.status !== 'archived');
  const archivedProjects = filteredProjects.filter((project) => project.status === 'archived');

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getProjects();
      setProjects(response.data);
    } catch (err) {
      setError(err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setCreating(true);
      await createProject({
        name: name.trim(),
        description: description.trim() || null,
      });
      setName('');
      setDescription('');
      await fetchProjects();
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const handleArchiveToggle = async (project, e) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      setError(null);
      await updateProject(project.id, {
        status: project.status === 'archived' ? 'active' : 'archived',
      });
      await fetchProjects();
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to update project');
    }
  };

  const requestDeleteProject = (project, e) => {
    e.preventDefault();
    e.stopPropagation();
    setPendingDeleteProject(project);
  };

  const handleDeleteProject = async () => {
    if (!pendingDeleteProject) return;

    try {
      setError(null);
      await deleteProject(pendingDeleteProject.id);
      setPendingDeleteProject(null);
      await fetchProjects();
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to delete project');
      setPendingDeleteProject(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f8f5] text-[#26312d]">
      <div className="relative border-b border-[#e9d5ff]">
        <div className="relative max-w-5xl mx-auto px-6 pt-28 pb-14">
          <div className="flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2.5 rounded-md border border-[#ddd6fe] bg-white px-4 py-1.5 mb-7">
              <FolderKanban className="size-3 text-[#7c3aed]" />
              <span className="font-mono text-[11px] tracking-[0.12em] text-[#5b21b6]/90 uppercase">Focused workspaces</span>
            </div>

            <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tight leading-[0.92] mb-4">
              Your <span className="text-[#7c3aed]">Projects</span>
            </h1>
            <p className="max-w-sm text-sm text-[#68746f] leading-relaxed mb-10">
              Group links into focused workspaces, track tasks, and keep research moving.
            </p>

            <form onSubmit={handleCreate} className="w-full max-w-2xl">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr_auto] gap-2.5">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Project name"
                  disabled={creating}
                  className="px-4 py-3 text-sm border border-[#d8ded8] rounded-md bg-white text-[#26312d] placeholder:text-[#9aa39f] focus:outline-none focus:border-[#8baea0] focus:ring-1 focus:ring-[#8baea0]/30 disabled:opacity-50"
                />
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short description"
                  disabled={creating}
                  className="px-4 py-3 text-sm border border-[#d8ded8] rounded-md bg-white text-[#26312d] placeholder:text-[#9aa39f] focus:outline-none focus:border-[#8baea0] focus:ring-1 focus:ring-[#8baea0]/30 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={creating || !name.trim()}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold bg-[#5b21b6] text-white rounded-md hover:bg-[#244b44] disabled:bg-[#d8ded8] disabled:text-[#7d8984] disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="size-4" />
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {error && (
          <div className="font-mono text-xs text-red-400/80 px-4 py-3 rounded-lg bg-red-500/8 border border-red-500/15 mb-6">
            Error: {error}
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="rounded-lg border border-[#e9d5ff] bg-white p-5">
                <div className="h-4 w-2/3 rounded bg-[#edf2ee] animate-pulse mb-3" />
                <div className="h-3 w-full rounded bg-[#eef2ef] animate-pulse mb-2" />
                <div className="h-3 w-1/2 rounded bg-[#eef2ef] animate-pulse" />
              </div>
            ))}
          </div>
        )}

        {!loading && projects.length > 0 && (
          <div className="mb-8 flex items-center gap-3">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[#9aa39f] pointer-events-none" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects..."
                className="w-full pl-9 pr-8 py-2 font-mono text-[11px] border border-[#d8ded8] rounded-full bg-white text-[#26312d] placeholder:text-[#b0bab5] focus:outline-none focus:border-[#8baea0] focus:ring-1 focus:ring-[#8baea0]/20 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa39f] hover:text-[#5f6c67]"
                  aria-label="Clear project search"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {!loading && projects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="size-14 mb-6 rounded-lg border border-[#d8ded8] bg-white flex items-center justify-center">
              <FolderKanban className="size-6 text-[#7d8984]" />
            </div>
            <h2 className="font-display text-lg font-semibold text-[#5f6c67] mb-2">No projects yet</h2>
            <p className="font-mono text-xs text-[#9aa39f] uppercase tracking-widest">Create one above to start grouping links</p>
          </div>
        )}

        {!loading && projects.length > 0 && filteredProjects.length === 0 && (
          <div className="text-center py-16">
            <p className="text-sm text-[#68746f]">
              No projects matching{' '}
              <span className="font-mono text-[#5f6c67]">"{searchQuery}"</span>.{' '}
              <button
                onClick={() => setSearchQuery('')}
                className="text-[#7c3aed] hover:text-[#5b21b6] underline underline-offset-2"
              >
                Clear search
              </button>
            </p>
          </div>
        )}

        {!loading && filteredProjects.length > 0 && (
          <div className="space-y-12">
            {activeProjects.length > 0 && (
              <ProjectGrid
                projects={activeProjects}
                onArchiveToggle={handleArchiveToggle}
                onDelete={requestDeleteProject}
              />
            )}

            {archivedProjects.length > 0 && (
              <section>
                <div className="mb-4 flex items-center gap-3">
                  <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#7d8984]">
                    Archived
                  </h2>
                  <div className="h-px flex-1 bg-[#e9d5ff]" />
                  <span className="font-mono text-[10px] text-[#9aa39f]">
                    {archivedProjects.length}
                  </span>
                </div>
                <ProjectGrid
                  projects={archivedProjects}
                  archived
                  onArchiveToggle={handleArchiveToggle}
                  onDelete={requestDeleteProject}
                />
              </section>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(pendingDeleteProject)}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteProject(null);
        }}
        title="Delete this project?"
        description={`"${pendingDeleteProject?.name || 'This project'}" will be permanently deleted. Saved links stay in your library.`}
        confirmLabel="Delete project"
        destructive
        onConfirm={handleDeleteProject}
      />
    </div>
  );
}

function ProjectGrid({ projects, archived = false, onArchiveToggle, onDelete }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map((project) => (
        <Link
          key={project.id}
          to={`/projects/${project.id}`}
          className={`group rounded-lg border border-[#e9d5ff] bg-white p-5 hover:border-[#b7cabe] hover:-translate-y-0.5 transition-all ${
            archived ? 'opacity-70' : ''
          }`}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <h2 className="font-display text-base font-semibold text-[#26312d] leading-snug">
              {project.name}
            </h2>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={(e) => onArchiveToggle(project, e)}
                className="p-1.5 rounded-md text-[#9aa39f] hover:text-[#5b21b6] hover:bg-[#f5f3ff] transition-colors"
                title={project.status === 'archived' ? 'Unarchive project' : 'Archive project'}
              >
                {project.status === 'archived' ? (
                  <RotateCcw className="size-3.5" />
                ) : (
                  <Archive className="size-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={(e) => onDelete(project, e)}
                className="p-1.5 rounded-md text-[#9aa39f] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Delete project"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
          {project.description && (
            <p className="text-sm text-[#68746f] leading-relaxed line-clamp-2 mb-4">
              {project.description}
            </p>
          )}
          <div className="flex gap-2 font-mono text-[11px] text-[#7d8984]">
            <span>{project.link_count} links</span>
            <span>·</span>
            <span>{project.task_count} tasks</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
