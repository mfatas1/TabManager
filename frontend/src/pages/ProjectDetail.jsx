import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, ExternalLink, FileText, FolderKanban, Link2, Pencil, Plus, Trash2, Upload, X } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import StatusPicker from '../components/StatusPicker';
import TagEditor from '../components/TagEditor';
import { getTags } from '../api/links';
import {
  addUrlToProject,
  addFileToProject,
  createTask,
  deleteTask,
  getProject,
  removeLinkFromProject,
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

function getTaskLinks(task) {
  if (task.linked_links?.length) return task.linked_links;
  return task.linked_link ? [task.linked_link] : [];
}

export default function ProjectDetail() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [url, setUrl] = useState('');
  const [savingUrl, setSavingUrl] = useState(false);
  const [skipAI, setSkipAI] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskLinkIds, setTaskLinkIds] = useState([]);
  const [taskLinkPickerOpen, setTaskLinkPickerOpen] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState(null);
  const [pendingTaskDelete, setPendingTaskDelete] = useState(null);
  const [taskComposerLinkId, setTaskComposerLinkId] = useState(null);
  const [editingLink, setEditingLink] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editTopics, setEditTopics] = useState([]);
  const [editKeywords, setEditKeywords] = useState([]);
  const [editSaving, setEditSaving] = useState(false);
  const [linkedTaskTitle, setLinkedTaskTitle] = useState('');
  const [linkedTaskDescription, setLinkedTaskDescription] = useState('');
  const [creatingLinkedTask, setCreatingLinkedTask] = useState(false);
  const [highlightedLinkId, setHighlightedLinkId] = useState(null);
  const linkRefs = useRef({});
  const [allTags, setAllTags] = useState([]);

  const topicOptions = useMemo(
    () => allTags.filter((t) => t.tag_type === 'broad').map((t) => t.name),
    [allTags],
  );
  const keywordOptions = useMemo(
    () => allTags.filter((t) => t.tag_type === 'specific').map((t) => t.name),
    [allTags],
  );

  const getBroadTags = (tags) =>
    (tags || []).filter((t) => (typeof t === 'string' ? false : t.tag_type === 'broad'));
  const getSpecificTags = (tags) =>
    (tags || []).filter((t) => (typeof t === 'string' ? true : t.tag_type !== 'broad'));

  const links = useMemo(() => project?.project_links || [], [project]);
  const tasks = useMemo(() => project?.tasks || [], [project]);

  const fetchProject = useCallback(async ({ showLoading = false } = {}) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);
      const response = await getProject(projectId);
      setProject(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to load project');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject({ showLoading: true });
  }, [fetchProject]);

  useEffect(() => {
    getTags().then((res) => setAllTags(res.data)).catch(() => {});
  }, []);

  const friendlyError = (err, fallback = 'Something went wrong.') => {
    if (!err.response && err.message?.toLowerCase().includes('network'))
      return 'Could not reach the server. The backend may be waking up — try again in a moment.';
    const detail = err.response?.data?.detail || '';
    if (err.response?.status === 400 && detail.toLowerCase().includes('already exists'))
      return 'This URL is already in your library.';
    if (err.response?.status === 400)
      return 'Invalid URL — make sure it starts with https://.';
    return detail || fallback;
  };

  const handleAddUrl = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    const trimmed = url.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      setError('Please enter a full URL starting with https://');
      return;
    }
    try {
      setSavingUrl(true);
      setError(null);
      const res = await addUrlToProject(projectId, trimmed, skipAI);
      setUrl('');
      await fetchProject();
      if (skipAI) {
        // open edit modal on the new blank link
        const newLink = res.data?.link;
        if (newLink) {
          setEditingLink(newLink);
          setEditTitle(newLink.title || '');
          setEditSummary(newLink.summary || '');
          setEditTopics([]);
          setEditKeywords([]);
        }
      }
    } catch (err) {
      setError(friendlyError(err, 'Failed to add URL'));
    } finally {
      setSavingUrl(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      setUploading(true);
      setUploadError(null);
      const res = await addFileToProject(projectId, file, skipAI);
      await fetchProject();
      if (skipAI) {
        const newLink = res.data?.link;
        if (newLink) {
          setEditingLink(newLink);
          setEditTitle(newLink.title || '');
          setEditSummary(newLink.summary || '');
          setEditTopics([]);
          setEditKeywords([]);
        }
      }
    } catch (err) {
      setUploadError(friendlyError(err, 'Failed to upload file.'));
    } finally {
      setUploading(false);
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
        linked_link_ids: taskLinkIds,
      });
      setTaskTitle('');
      setTaskDescription('');
      setTaskLinkIds([]);
      setTaskLinkPickerOpen(false);
      await fetchProject();
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to create task');
    } finally {
      setCreatingTask(false);
    }
  };

  const openEditModal = (link, e) => {
    e?.preventDefault();
    e?.stopPropagation();
    setEditingLink(link);
    setEditTitle(link.title || '');
    setEditSummary(link.summary || '');
    setEditTopics(getBroadTags(link.tags).map(getTagName));
    setEditKeywords(getSpecificTags(link.tags).map(getTagName));
  };

  const handleSaveEdit = async () => {
    if (!editingLink) return;
    try {
      setEditSaving(true);
      const { updateLink } = await import('../api/links');
      await updateLink(editingLink.id, {
        title: editTitle,
        summary: editSummary,
        topics: editTopics,
        keywords: editKeywords,
      });
      await fetchProject();
      getTags().then((res) => setAllTags(res.data)).catch(() => {});
      setEditingLink(null);
    } catch (err) {
      setError(friendlyError(err, 'Failed to save changes'));
    } finally {
      setEditSaving(false);
    }
  };

  const openLinkedTaskComposer = (linkId) => {
    setTaskComposerLinkId(linkId);
    setLinkedTaskTitle('');
    setLinkedTaskDescription('');
  };

  const handleCreateLinkedTask = async (e) => {
    e.preventDefault();
    if (!taskComposerLinkId || !linkedTaskTitle.trim()) return;

    try {
      setCreatingLinkedTask(true);
      await createTask(projectId, {
        title: linkedTaskTitle.trim(),
        description: linkedTaskDescription.trim() || null,
        linked_link_ids: [taskComposerLinkId],
      });
      setTaskComposerLinkId(null);
      setLinkedTaskTitle('');
      setLinkedTaskDescription('');
      await fetchProject();
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to create linked task');
    } finally {
      setCreatingLinkedTask(false);
    }
  };

  const focusLinkedSource = (linkId) => {
    const node = linkRefs.current[linkId];
    if (!node) return;

    setHighlightedLinkId(linkId);
    node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => {
      setHighlightedLinkId((current) => (current === linkId ? null : current));
    }, 2200);
  };

  const toggleTaskLink = (linkId) => {
    setTaskLinkIds((current) => (
      current.includes(linkId)
        ? current.filter((id) => id !== linkId)
        : [...current, linkId]
    ));
  };

  const handleProjectLinkStatus = async (projectLink, status) => {
    await updateProjectLink(projectId, projectLink.link_id, { status });
    await fetchProject();
  };

  const handleRemoveLink = async () => {
    if (!pendingRemoval) return;
    try {
      await removeLinkFromProject(projectId, pendingRemoval.linkId);
      setPendingRemoval(null);
      await fetchProject();
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to remove link');
      setPendingRemoval(null);
    }
  };

  const handleTaskStatus = async (task, status) => {
    await updateTask(task.id, { status });
    await fetchProject();
  };

  const handleDeleteTask = async () => {
    if (!pendingTaskDelete) return;
    try {
      await deleteTask(pendingTaskDelete.id);
      setPendingTaskDelete(null);
      await fetchProject();
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to delete task');
      setPendingTaskDelete(null);
    }
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
            <div className="flex gap-2 font-mono text-[11px] text-[#68746f]">
              <span className="rounded-full border border-[#d8ded8] px-3 py-1">{links.length} links</span>
              <span className="rounded-full border border-[#d8ded8] px-3 py-1">{tasks.length} tasks</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {error && (
          <div className="font-mono text-xs text-red-400/80 px-4 py-3 rounded-lg bg-red-500/8 border border-red-500/15 mb-6">
            Error: {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_0.9fr] gap-6">
          <section>
            <div className="rounded-lg border border-[#dfe5df] bg-white p-5 mb-4">
              <h2 className="font-display text-base font-semibold mb-4">Add a link</h2>

              {/* URL input */}
              <form onSubmit={handleAddUrl} className="flex flex-col sm:flex-row gap-2.5">
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  disabled={savingUrl || uploading}
                  className="flex-1 px-4 py-3 font-mono text-sm border border-[#d8ded8] rounded-md bg-white text-[#26312d] placeholder:text-[#9aa39f] focus:outline-none focus:border-[#8baea0] focus:ring-1 focus:ring-[#8baea0]/30 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={savingUrl || uploading || !url.trim()}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold bg-[#315f56] text-white rounded-md hover:bg-[#244b44] disabled:bg-[#d8ded8] disabled:text-[#7d8984] disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="size-4" />
                  {savingUrl ? 'Saving...' : 'Add'}
                </button>
              </form>

              {/* Skip AI toggle */}
              <label className="flex items-center gap-2 mt-3 cursor-pointer select-none justify-end">
                <span className="font-mono text-[11px] text-[#68746f]">Skip AI — add manually</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={skipAI}
                  onClick={() => setSkipAI(v => !v)}
                  className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ${skipAI ? 'bg-[#4f8f7a]' : 'bg-[#d8ded8]'}`}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${skipAI ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </label>

              {/* File upload */}
              <input ref={fileInputRef} type="file" accept=".pdf,.txt,.md,.docx" className="hidden" onChange={handleFileUpload} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || savingUrl}
                className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium border border-dashed border-[#9cb8aa] text-[#68746f] rounded-md hover:border-[#4f8f7a] hover:text-[#4f8f7a] hover:bg-[#edf4ef] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Upload className="size-4" />
                {uploading ? 'Uploading…' : 'Upload a file (PDF, DOCX, TXT, MD)'}
              </button>
              {uploadError && (
                <p className="mt-2 font-mono text-[11px] text-red-400">{uploadError}</p>
              )}
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
                const linkedTasks = tasks.filter((task) => (
                  getTaskLinks(task).some((taskLink) => taskLink.id === link.id)
                ));
                const isHighlighted = highlightedLinkId === link.id;
                return (
                  <article
                    key={projectLink.link_id}
                    ref={(node) => {
                      if (node) linkRefs.current[link.id] = node;
                    }}
                    className={`rounded-lg border bg-white p-5 transition-colors ${
                      isHighlighted ? 'border-[#4f8f7a] bg-[#fbfdfb]' : 'border-[#dfe5df]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="font-display text-sm font-semibold leading-snug mb-2">{link.title || 'Untitled'}</h3>
                        {link.source_type === 'file' ? (
                          link.file_url ? (
                            <a
                              href={link.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[#4f8f7a]/80 hover:text-[#315f56] break-all"
                            >
                              <FileText className="size-3 flex-shrink-0" />
                              {link.file_name}
                            </a>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[#4f8f7a]/80 break-all">
                              <FileText className="size-3 flex-shrink-0" />
                              {link.file_name}
                            </span>
                          )
                        ) : (
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[#4f8f7a]/80 hover:text-[#315f56] break-all"
                          >
                            <ExternalLink className="size-3" />
                            {link.url}
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => openEditModal(link, e)}
                          className="p-1.5 rounded-lg hover:bg-[#edf4ef] text-[#9aa39f] hover:text-[#4f8f7a] transition-colors"
                          title="Edit node"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          onClick={() => setPendingRemoval({
                            linkId: projectLink.link_id,
                            title: link.title || link.url,
                          })}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-[#9aa39f] hover:text-red-400 transition-colors"
                          title="Remove from project"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>

                    {link.summary && (
                      <p className="text-sm text-[#68746f] leading-relaxed mb-4">{link.summary}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <StatusPicker
                        value={projectLink.status}
                        options={linkStatuses}
                        onChange={(status) => handleProjectLinkStatus(projectLink, status)}
                      />
                      <button
                        type="button"
                        onClick={() => openLinkedTaskComposer(link.id)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#d8ded8] px-2.5 py-1 font-mono text-[10px] text-[#68746f] hover:border-[#a8bfb2] hover:text-[#315f56] transition-colors"
                      >
                        <Plus className="size-3" />
                        Task
                      </button>
                      {linkedTasks.length > 0 && (
                        <span className="rounded-full border border-[#d8ded8] px-2.5 py-1 font-mono text-[10px] text-[#7d8984]">
                          {linkedTasks.length} task{linkedTasks.length === 1 ? '' : 's'}
                        </span>
                      )}

                      {topics.map((tag) => {
                        const tagName = getTagName(tag);
                        return (
                          <span key={tag.id || tagName} className="font-mono px-2.5 py-0.5 rounded-full text-[10px] bg-[#edf4ef] text-[#315f56] border border-[#c8d8cf]">
                            {tagName}
                          </span>
                        );
                      })}
                    </div>

                    {taskComposerLinkId === link.id && (
                      <form onSubmit={handleCreateLinkedTask} className="mt-4 rounded-lg border border-[#dfe5df] bg-[#fbfcfa] p-3">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#7d8984]">
                            Task for this link
                          </span>
                          <button
                            type="button"
                            onClick={() => setTaskComposerLinkId(null)}
                            className="rounded-md p-1 text-[#9aa39f] hover:bg-[#edf4ef] hover:text-[#315f56]"
                            aria-label="Close task composer"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                        <input
                          value={linkedTaskTitle}
                          onChange={(e) => setLinkedTaskTitle(e.target.value)}
                          placeholder="Task title"
                          disabled={creatingLinkedTask}
                          className="mb-2 w-full rounded-md border border-[#d8ded8] bg-white px-3 py-2 text-sm text-[#26312d] placeholder:text-[#9aa39f] focus:outline-none focus:border-[#8baea0] focus:ring-1 focus:ring-[#8baea0]/30 disabled:opacity-50"
                        />
                        <textarea
                          value={linkedTaskDescription}
                          onChange={(e) => setLinkedTaskDescription(e.target.value)}
                          placeholder="Optional note"
                          disabled={creatingLinkedTask}
                          rows={2}
                          className="mb-2 w-full resize-none rounded-md border border-[#d8ded8] bg-white px-3 py-2 text-sm text-[#26312d] placeholder:text-[#9aa39f] focus:outline-none focus:border-[#8baea0] focus:ring-1 focus:ring-[#8baea0]/30 disabled:opacity-50"
                        />
                        <button
                          type="submit"
                          disabled={creatingLinkedTask || !linkedTaskTitle.trim()}
                          className="inline-flex items-center justify-center gap-2 rounded-md bg-[#315f56] px-3 py-2 text-xs font-semibold text-white hover:bg-[#244b44] disabled:bg-[#d8ded8] disabled:text-[#7d8984] disabled:cursor-not-allowed transition-colors"
                        >
                          <Plus className="size-3.5" />
                          {creatingLinkedTask ? 'Adding...' : 'Add task'}
                        </button>
                      </form>
                    )}
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
                {links.length > 0 && (
                  <div className="rounded-md border border-[#d8ded8] bg-[#fbfcfa]">
                    <button
                      type="button"
                      onClick={() => setTaskLinkPickerOpen((open) => !open)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
                    >
                      <span className="inline-flex items-center gap-2 font-mono text-[11px] text-[#68746f]">
                        <Link2 className="size-3.5" />
                        {taskLinkIds.length > 0
                          ? `${taskLinkIds.length} linked source${taskLinkIds.length === 1 ? '' : 's'}`
                          : 'Connect links'}
                      </span>
                      {taskLinkIds.length > 0 && (
                        <span className="font-mono text-[10px] text-[#9aa39f]">optional</span>
                      )}
                    </button>

                    {taskLinkIds.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 px-3 pb-2">
                        {taskLinkIds.map((linkId) => {
                          const projectLink = links.find((item) => item.link_id === linkId);
                          const linked = projectLink?.link;
                          if (!linked) return null;

                          return (
                            <button
                              key={linkId}
                              type="button"
                              onClick={() => toggleTaskLink(linkId)}
                              className="inline-flex max-w-full items-center gap-1 rounded-full bg-white px-2 py-0.5 font-mono text-[10px] text-[#315f56] border border-[#c8d8cf]"
                              title="Remove linked source"
                            >
                              <span className="truncate max-w-[150px]">{linked.title || linked.url}</span>
                              <X className="size-3 flex-shrink-0" />
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {taskLinkPickerOpen && (
                      <div className="max-h-52 overflow-y-auto border-t border-[#dfe5df] p-2">
                        {links.map((projectLink) => {
                          const linked = projectLink.link;
                          const selected = taskLinkIds.includes(linked.id);

                          return (
                            <button
                              key={projectLink.link_id}
                              type="button"
                              onClick={() => toggleTaskLink(linked.id)}
                              className={`mb-1 flex w-full items-start gap-2 rounded-md px-2 py-2 text-left transition-colors last:mb-0 ${
                                selected ? 'bg-[#edf4ef]' : 'hover:bg-white'
                              }`}
                            >
                              <span className={`mt-0.5 size-3.5 rounded-sm border flex-shrink-0 ${
                                selected ? 'border-[#315f56] bg-[#315f56]' : 'border-[#cfd8d1] bg-white'
                              }`}>
                                {selected && <Check className="size-3 text-white" />}
                              </span>
                              <span className="min-w-0">
                                <span className="block truncate text-xs font-semibold text-[#26312d]">
                                  {linked.title || 'Untitled'}
                                </span>
                                <span className="block truncate font-mono text-[10px] text-[#9aa39f]">
                                  {linked.url}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
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
                {tasks.map((task) => {
                  const taskLinks = getTaskLinks(task);

                  return (
                  <div key={task.id} className="rounded-lg border border-[#dfe5df] bg-[#fbfcfa] p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h3 className={`text-sm font-semibold ${task.status === 'done' ? 'line-through text-[#7d8984]' : 'text-[#26312d]'}`}>
                          {task.title}
                        </h3>
                        {task.description && (
                          <p className="text-xs text-[#68746f] leading-relaxed mt-1">{task.description}</p>
                        )}
                        {taskLinks.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {taskLinks.map((linked) => (
                              <button
                                key={linked.id}
                                type="button"
                                onClick={() => focusLinkedSource(linked.id)}
                                className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#d8ded8] bg-white px-2.5 py-1 font-mono text-[10px] text-[#68746f] hover:border-[#a8bfb2] hover:text-[#315f56] transition-colors"
                                title="Jump to linked source"
                              >
                                <Link2 className="size-3 flex-shrink-0" />
                                <span className="truncate max-w-[180px]">
                                  {linked.title || linked.url}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setPendingTaskDelete(task)}
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
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pendingRemoval)}
        onOpenChange={(open) => {
          if (!open) setPendingRemoval(null);
        }}
        title="Remove from project?"
        description={`"${pendingRemoval?.title || 'This link'}" will stay in your library, but it will no longer be part of this project.`}
        confirmLabel="Remove link"
        destructive
        onConfirm={handleRemoveLink}
      />

      <ConfirmDialog
        open={Boolean(pendingTaskDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingTaskDelete(null);
        }}
        title="Delete this task?"
        description={`"${pendingTaskDelete?.title || 'This task'}" will be permanently removed from this project.`}
        confirmLabel="Delete task"
        destructive
        onConfirm={handleDeleteTask}
      />

      {/* Edit link modal */}
      {editingLink && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm" onClick={() => setEditingLink(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <p className="font-mono text-[11px] text-[#9aa39f] mb-5 truncate">{editingLink.file_name || editingLink.url}</p>
            <div className="space-y-4">
              <div>
                <label className="font-mono text-[10px] tracking-[0.15em] text-[#9aa39f] uppercase block mb-2">Title</label>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Enter a title…"
                  className="w-full px-4 py-3 text-sm border border-[#d8ded8] rounded-lg bg-white text-[#26312d] focus:outline-none focus:border-[#8baea0] focus:ring-1 focus:ring-[#8baea0]/20 transition-all"
                />
              </div>
              <div>
                <label className="font-mono text-[10px] tracking-[0.15em] text-[#9aa39f] uppercase block mb-2">Summary</label>
                <textarea
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  placeholder="Write a summary…"
                  rows={4}
                  className="w-full px-4 py-3 text-sm border border-[#d8ded8] rounded-lg bg-white text-[#26312d] focus:outline-none focus:border-[#8baea0] focus:ring-1 focus:ring-[#8baea0]/20 resize-none transition-all"
                />
              </div>
              <TagEditor
                label="Topics"
                tags={editTopics}
                options={topicOptions}
                onChange={setEditTopics}
              />
              <TagEditor
                label="Keywords"
                tags={editKeywords}
                options={keywordOptions}
                onChange={setEditKeywords}
              />
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setEditingLink(null)} className="flex-1 py-2.5 text-sm text-[#68746f] border border-[#d8ded8] rounded-lg hover:bg-[#f7f8f5] transition-colors">Cancel</button>
              <button onClick={handleSaveEdit} disabled={editSaving} className="flex-1 py-2.5 text-sm font-semibold bg-[#315f56] text-white rounded-lg hover:bg-[#244b44] disabled:opacity-50 transition-colors">
                {editSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
