import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Archive, ArchiveRestore, ArrowLeft, Check, ExternalLink, FolderKanban, Plus, Trash2 } from 'lucide-react';
import StatusPicker from '../components/StatusPicker';
import ConfirmModal from '../components/ConfirmModal';
import {
  addUrlToProject,
  createTask,
  deleteProject,
  deleteTask,
  getProject,
  removeLinkFromProject,
  updateProject,
  updateProjectLink,
  updateTask,
} from '../api/projects';

const linkStatuses = ['unread', 'reading', 'done', 'reference', 'skip'];
const taskStatuses = ['todo', 'doing', 'done'];

function getTagName(tag) {
  return typeof tag === 'string' ? tag : tag.name;
}

function getTopics(tags) {
  return (tags || []).filter((tag) => {
    const tagObj = typeof tag === 'string' ? { tag_type: 'broad' } : tag;
    return tagObj.tag_type === 'broad';
  });
}

// localStorage keys for "don't ask again" per action
const SKIP_REMOVE_LINK  = 'folio_skip_remove_link_confirm';
const SKIP_DELETE_TASK  = 'folio_skip_delete_task_confirm';
const SKIP_DELETE_PROJECT = 'folio_skip_delete_project_confirm';

export default function ProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [url, setUrl] = useState('');
  const [savingUrl, setSavingUrl] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [creatingTask, setCreatingTask] = useState(false);

  // confirmModal: null | { action, id?, skipKey, title, message, confirmLabel, icon }
  const [confirmModal, setConfirmModal] = useState(null);

  const links = useMemo(() => project?.project_links || [], [project]);
  const tasks = useMemo(() => project?.tasks || [], [project]);

  const fetchProject = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getProject(projectId);
      setProject(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const handleAddUrl = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;

    try {
      setSavingUrl(true);
      await addUrlToProject(projectId, url.trim());
      setUrl('');
      await fetchProject();
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to add URL');
    } finally {
      setSavingUrl(false);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    try {
      setCreatingTask(true);
      await createTask(projectId, {
        title: taskTitle.trim(),
        description: taskDescription.trim() || null,
      });
      setTaskTitle('');
      setTaskDescription('');
      await fetchProject();
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to create task');
    } finally {
      setCreatingTask(false);
    }
  };

  const handleProjectLinkStatus = async (projectLink, status) => {
    await updateProjectLink(projectId, projectLink.link_id, { status });
    await fetchProject();
  };

  const handleRemoveLink = (linkId) => {
    if (localStorage.getItem(SKIP_REMOVE_LINK) === 'true') {
      removeLinkFromProject(projectId, linkId).then(() => fetchProject());
      return;
    }
    setConfirmModal({
      action: 'removeLink',
      id: linkId,
      skipKey: SKIP_REMOVE_LINK,
      title: 'Remove link?',
      message: 'This will remove the link from this project. The link stays in your library.',
      confirmLabel: 'Remove',
      icon: 'remove',
    });
  };

  const handleDeleteTask = (taskId) => {
    if (localStorage.getItem(SKIP_DELETE_TASK) === 'true') {
      deleteTask(taskId).then(() => fetchProject());
      return;
    }
    setConfirmModal({
      action: 'deleteTask',
      id: taskId,
      skipKey: SKIP_DELETE_TASK,
      title: 'Delete task?',
      message: 'This task will be permanently removed from the project.',
      confirmLabel: 'Delete',
      icon: 'trash',
    });
  };

  const handleArchiveToggle = async () => {
    const newStatus = project.status === 'active' ? 'archived' : 'active';
    try {
      await updateProject(projectId, { status: newStatus });
      await fetchProject();
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to update project');
    }
  };

  const handleDeleteProject = () => {
    if (localStorage.getItem(SKIP_DELETE_PROJECT) === 'true') {
      deleteProject(projectId).then(() => navigate('/projects'));
      return;
    }
    setConfirmModal({
      action: 'deleteProject',
      skipKey: SKIP_DELETE_PROJECT,
      title: 'Delete project?',
      message: 'This will permanently delete the project and all its tasks. Your saved links will remain in the library.',
      confirmLabel: 'Delete project',
      icon: 'trash',
    });
  };

  const handleModalConfirm = async (dontAskAgain) => {
    if (!confirmModal) return;
    const { action, id, skipKey } = confirmModal;
    if (dontAskAgain) localStorage.setItem(skipKey, 'true');
    setConfirmModal(null);
    try {
      if (action === 'removeLink') {
        await removeLinkFromProject(projectId, id);
        await fetchProject();
      } else if (action === 'deleteTask') {
        await deleteTask(id);
        await fetchProject();
      } else if (action === 'deleteProject') {
        await deleteProject(projectId);
        navigate('/projects');
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Action failed');
    }
  };

  const handleTaskStatus = async (task, status) => {
    await updateTask(task.id, { status });
    await fetchProject();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f8f5] flex items-center justify-center">
        <span className="font-mono text-xs text-[#7d8984] tracking-widest uppercase animate-pulse">
          Loading project...
        </span>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-[#f7f8f5] flex items-center justify-center">
        <span className="font-mono text-xs text-red-400">{error || 'Project not found'}</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8f5] text-[#26312d]">
      <div className="relative border-b border-[#dfe5df]">
        <div className="relative max-w-5xl mx-auto px-6 pt-28 pb-12">
          <Link
            to="/projects"
            className="inline-flex items-center gap-2 font-mono text-[11px] text-[#68746f] hover:text-[#315f56] mb-8"
          >
            <ArrowLeft className="size-3.5" />
            Back to projects
          </Link>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2.5 rounded-md border border-[#c8d8cf] bg-white px-4 py-1.5 mb-6">
                <FolderKanban className="size-3 text-[#4f8f7a]" />
                <span className="font-mono text-[11px] tracking-[0.12em] text-[#315f56]/90 uppercase">Project workspace</span>
              </div>
              <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tight leading-[0.92] mb-4">
                {project.name}
              </h1>
              {project.description && (
                <p className="max-w-xl text-sm text-[#68746f] leading-relaxed">{project.description}</p>
              )}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex gap-2 font-mono text-[11px] text-[#68746f]">
                <span className="rounded-full border border-[#d8ded8] px-3 py-1">{links.length} links</span>
                <span className="rounded-full border border-[#d8ded8] px-3 py-1">{tasks.length} tasks</span>
              </div>
              <button
                onClick={handleArchiveToggle}
                className={`flex items-center gap-1.5 p-2 rounded-lg border transition-all text-sm font-mono ${
                  project.status === 'archived'
                    ? 'border-[#c8d8cf] bg-[#edf4ef] text-[#4f8f7a] hover:bg-[#dceae2]'
                    : 'border-[#d8ded8] bg-white text-[#9aa39f] hover:text-[#4f8f7a] hover:border-[#c8d8cf] hover:bg-[#f7faf8]'
                }`}
                title={project.status === 'archived' ? 'Unarchive project' : 'Archive project'}
              >
                {project.status === 'archived'
                  ? <><ArchiveRestore className="size-4" /><span className="text-[11px] tracking-wide pr-0.5">Unarchive</span></>
                  : <Archive className="size-4" />
                }
              </button>
              <button
                onClick={handleDeleteProject}
                className="p-2 rounded-lg border border-[#d8ded8] bg-white text-[#9aa39f] hover:text-red-400 hover:border-red-200 hover:bg-red-50 transition-all"
                title="Delete project"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {project.status === 'archived' && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[#f7f8f5] border border-[#dfe5df] mb-6">
            <Archive className="size-4 text-[#9aa39f] flex-shrink-0" />
            <p className="text-sm text-[#7d8984]">
              This project is archived and read-only.{' '}
              <button onClick={handleArchiveToggle} className="text-[#4f8f7a] hover:text-[#315f56] underline underline-offset-2 transition-colors">
                Unarchive it
              </button>{' '}
              to make changes.
            </p>
          </div>
        )}

        {error && (
          <div className="font-mono text-xs text-red-400/80 px-4 py-3 rounded-lg bg-red-500/8 border border-red-500/15 mb-6">
            Error: {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_0.9fr] gap-6">
          <section>
            <div className="rounded-lg border border-[#dfe5df] bg-white p-5 mb-4">
              <h2 className="font-display text-base font-semibold mb-4">Add a link</h2>
              <form onSubmit={handleAddUrl} className="flex flex-col sm:flex-row gap-2.5">
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  disabled={savingUrl}
                  className="flex-1 px-4 py-3 font-mono text-sm border border-[#d8ded8] rounded-md bg-white text-[#26312d] placeholder:text-[#9aa39f] focus:outline-none focus:border-[#8baea0] focus:ring-1 focus:ring-[#8baea0]/30 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={savingUrl || !url.trim()}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold bg-[#315f56] text-white rounded-md hover:bg-[#244b44] disabled:bg-[#d8ded8] disabled:text-[#7d8984] disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="size-4" />
                  {savingUrl ? 'Saving...' : 'Add'}
                </button>
              </form>
            </div>

            <div className="space-y-3">
              {links.length === 0 && (
                <div className="rounded-lg border border-[#dfe5df] bg-white p-8 text-center">
                  <p className="font-mono text-xs text-[#7d8984] uppercase tracking-widest">No links in this project yet</p>
                </div>
              )}

              {links.map((projectLink) => {
                const link = projectLink.link;
                const topics = getTopics(link.tags);
                return (
                  <article key={projectLink.link_id} className="rounded-lg border border-[#dfe5df] bg-white p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="font-display text-sm font-semibold leading-snug mb-2">{link.title || 'Untitled'}</h3>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[#4f8f7a]/80 hover:text-[#315f56] break-all"
                        >
                          <ExternalLink className="size-3" />
                          {link.url}
                        </a>
                      </div>
                      <button
                        onClick={() => handleRemoveLink(projectLink.link_id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-[#9aa39f] hover:text-red-400 transition-colors"
                        title="Remove from project"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>

                    {link.summary && (
                      <p className="text-sm text-[#68746f] leading-relaxed mb-4">{link.summary}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPicker
                        value={projectLink.status}
                        options={linkStatuses}
                        onChange={(status) => handleProjectLinkStatus(projectLink, status)}
                      />

                      {topics.map((tag) => {
                        const tagName = getTagName(tag);
                        return (
                          <span key={tag.id || tagName} className="font-mono px-2.5 py-0.5 rounded-full text-[10px] bg-[#edf4ef] text-[#315f56] border border-[#c8d8cf]">
                            {tagName}
                          </span>
                        );
                      })}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <aside>
            <div className="rounded-lg border border-[#dfe5df] bg-white p-5 sticky top-24">
              <h2 className="font-display text-base font-semibold mb-4">Tasks</h2>
              <form onSubmit={handleCreateTask} className="space-y-2.5 mb-5">
                <input
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Task title"
                  disabled={creatingTask}
                  className="w-full px-4 py-3 text-sm border border-[#d8ded8] rounded-md bg-white text-[#26312d] placeholder:text-[#9aa39f] focus:outline-none focus:border-[#8baea0] focus:ring-1 focus:ring-[#8baea0]/30 disabled:opacity-50"
                />
                <textarea
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Optional note"
                  disabled={creatingTask}
                  rows={3}
                  className="w-full px-4 py-3 text-sm border border-[#d8ded8] rounded-md bg-white text-[#26312d] placeholder:text-[#9aa39f] focus:outline-none focus:border-[#8baea0] focus:ring-1 focus:ring-[#8baea0]/30 disabled:opacity-50 resize-none"
                />
                <button
                  type="submit"
                  disabled={creatingTask || !taskTitle.trim()}
                  className="inline-flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-semibold bg-[#315f56] text-white rounded-md hover:bg-[#244b44] disabled:bg-[#d8ded8] disabled:text-[#7d8984] disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="size-4" />
                  {creatingTask ? 'Adding...' : 'Add task'}
                </button>
              </form>

              <div className="space-y-2.5">
                {tasks.length === 0 && (
                  <p className="font-mono text-xs text-[#9aa39f] uppercase tracking-widest text-center py-6">
                    No tasks yet
                  </p>
                )}
                {tasks.map((task) => (
                  <div key={task.id} className="rounded-lg border border-[#dfe5df] bg-[#fbfcfa] p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h3 className={`text-sm font-semibold ${task.status === 'done' ? 'line-through text-[#7d8984]' : 'text-[#26312d]'}`}>
                          {task.title}
                        </h3>
                        {task.description && (
                          <p className="text-xs text-[#68746f] leading-relaxed mt-1">{task.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-1 rounded-md hover:bg-red-500/10 text-[#9aa39f] hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusPicker
                        value={task.status}
                        options={taskStatuses}
                        onChange={(status) => handleTaskStatus(task, status)}
                      />
                      {task.status === 'done' && <Check className="size-3.5 text-[#4f8f7a]" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          confirmLabel={confirmModal.confirmLabel}
          icon={confirmModal.icon}
          onConfirm={handleModalConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
}
