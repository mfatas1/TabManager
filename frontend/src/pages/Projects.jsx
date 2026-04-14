import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Archive, ArchiveRestore, ChevronDown, FolderKanban, Plus, Trash2 } from 'lucide-react';
import { createProject, deleteProject, getProjects, updateProject } from '../api/projects';
import ConfirmModal from '../components/ConfirmModal';

const SKIP_DELETE_PROJECT = 'folio_skip_delete_project_confirm';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [showArchived, setShowArchived] = useState(false);

  const activeProjects   = useMemo(() => projects.filter(p => p.status === 'active'),   [projects]);
  const archivedProjects = useMemo(() => projects.filter(p => p.status === 'archived'), [projects]);

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

  const handleArchiveToggle = async (e, project) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const newStatus = project.status === 'active' ? 'archived' : 'active';
      await updateProject(project.id, { status: newStatus });
      await fetchProjects();
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to update project');
    }
  };

  const handleDeleteClick = (e, projectId) => {
    e.preventDefault();
    e.stopPropagation();
    if (localStorage.getItem(SKIP_DELETE_PROJECT) === 'true') {
      executeDelete(projectId);
      return;
    }
    setConfirmDeleteId(projectId);
  };

  const executeDelete = async (projectId) => {
    try {
      await deleteProject(projectId);
      await fetchProjects();
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to delete project');
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const handleConfirmDelete = (dontAskAgain) => {
    if (dontAskAgain) localStorage.setItem(SKIP_DELETE_PROJECT, 'true');
    executeDelete(confirmDeleteId);
  };

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

  const ProjectCard = ({ project, archived = false }) => (
    <div className={`group relative rounded-lg border bg-white transition-all ${
      archived
        ? 'border-[#e8ece8] opacity-60 hover:opacity-90'
        : 'border-[#dfe5df] hover:border-[#b7cabe] hover:-translate-y-0.5'
    }`}>
      <Link to={`/projects/${project.id}`} className="block p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2 className={`font-display text-base font-semibold leading-snug ${archived ? 'text-[#7d8984]' : 'text-[#26312d]'}`}>
            {project.name}
          </h2>
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

      {/* Hover actions */}
      <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-all">
        <button
          onClick={(e) => handleArchiveToggle(e, project)}
          className={`p-1.5 rounded-lg transition-colors ${
            archived
              ? 'text-[#4f8f7a] hover:bg-[#edf4ef]'
              : 'text-[#9aa39f] hover:text-[#4f8f7a] hover:bg-[#edf4ef]'
          }`}
          title={archived ? 'Unarchive project' : 'Archive project'}
        >
          {archived ? <ArchiveRestore className="size-3.5" /> : <Archive className="size-3.5" />}
        </button>
        <button
          onClick={(e) => handleDeleteClick(e, project.id)}
          className="p-1.5 rounded-lg text-[#9aa39f] hover:text-red-400 hover:bg-red-50 transition-colors"
          title="Delete project"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f7f8f5] text-[#26312d]">
      <div className="relative border-b border-[#dfe5df]">
        <div className="relative max-w-5xl mx-auto px-6 pt-28 pb-14">
          <div className="flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2.5 rounded-md border border-[#c8d8cf] bg-white px-4 py-1.5 mb-7">
              <FolderKanban className="size-3 text-[#4f8f7a]" />
              <span className="font-mono text-[11px] tracking-[0.12em] text-[#315f56]/90 uppercase">Focused workspaces</span>
            </div>

            <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tight leading-[0.92] mb-4">
              Your <span className="text-[#4f8f7a]">Projects</span>
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
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold bg-[#315f56] text-white rounded-md hover:bg-[#244b44] disabled:bg-[#d8ded8] disabled:text-[#7d8984] disabled:cursor-not-allowed transition-colors"
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
              <div key={index} className="rounded-lg border border-[#dfe5df] bg-white p-5">
                <div className="h-4 w-2/3 rounded bg-[#edf2ee] animate-pulse mb-3" />
                <div className="h-3 w-full rounded bg-[#eef2ef] animate-pulse mb-2" />
                <div className="h-3 w-1/2 rounded bg-[#eef2ef] animate-pulse" />
              </div>
            ))}
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

        {/* Active projects */}
        {!loading && activeProjects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}

        {!loading && activeProjects.length === 0 && projects.length > 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-[#7d8984]">All projects are archived.</p>
          </div>
        )}

        {/* Archived projects — collapsible */}
        {!loading && archivedProjects.length > 0 && (
          <div className="mt-10">
            <button
              onClick={() => setShowArchived(v => !v)}
              className="flex items-center gap-2 font-mono text-[11px] text-[#7d8984] hover:text-[#315f56] transition-colors mb-4 group"
            >
              <Archive className="size-3.5" />
              <span className="uppercase tracking-[0.12em]">Archived</span>
              <span className="text-[#b0bab5]">{archivedProjects.length}</span>
              <ChevronDown className={`size-3.5 transition-transform ${showArchived ? 'rotate-180' : ''}`} />
            </button>

            {showArchived && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {archivedProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} archived />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {confirmDeleteId !== null && (
        <ConfirmModal
          title="Delete project?"
          message="This will permanently delete the project and all its tasks. Your saved links will remain in the library."
          confirmLabel="Delete project"
          icon="trash"
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  );
}
