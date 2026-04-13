import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderKanban, Plus } from 'lucide-react';
import { createProject, getProjects } from '../api/projects';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

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

        {!loading && projects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="group rounded-lg border border-[#dfe5df] bg-white p-5 hover:border-[#b7cabe] hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h2 className="font-display text-base font-semibold text-[#26312d] leading-snug">
                    {project.name}
                  </h2>
                  <span className="font-mono text-[10px] rounded-full border border-[#d8ded8] px-2 py-0.5 text-[#68746f]">
                    {project.status}
                  </span>
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
        )}
      </div>
    </div>
  );
}
