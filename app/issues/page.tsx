"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
    Sparkles,
    MessageSquare,
    Clock,
    GripVertical,
    Loader2,
    ExternalLink,
    Check,
    X,
    Pencil,
    RefreshCw,
    Plus,
    InboxIcon,
    ChevronDown,
    ChevronRight,
    Trash2,
    GitPullRequest,
} from "lucide-react";
import clsx from "clsx";

interface Issue {
    id: string;
    title: string;
    problem_summary: string;
    why_it_matters: string | null;
    fix_prompt: string | null;
    status: string;
    ticket_id: string | null;
    priority_rank: number | null;
    github_issue_number: number | null;
    github_issue_url: string | null;
    created_at: string;
    updated_at: string;
    ticket: {
        subject: string;
        customer_email: string;
    } | null;
}

const COLUMNS = [
    { key: "Backlog", color: "#8b5cf6" },
    { key: "In Progress", color: "#f59e0b" },
    { key: "Done", color: "#10b981" },
    { key: "Dismissed", color: "#9ca3af" },
];

function timeAgo(dateString: string): string {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

export default function IssuesPage() {
    const [issues, setIssues] = useState<Issue[]>([]);
    const [loading, setLoading] = useState(true);
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [dragOverCol, setDragOverCol] = useState<string | null>(null);
    const [expandedIssue, setExpandedIssue] = useState<string | null>(null);
    const [editingIssue, setEditingIssue] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ title: "", problem_summary: "", why_it_matters: "", fix_prompt: "" });
    const [saving, setSaving] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [creatingGithub, setCreatingGithub] = useState<Record<string, boolean>>({});
    const [createForm, setCreateForm] = useState({
        title: "",
        problem_summary: "",
        why_it_matters: "",
        fix_prompt: "",
    });
    // Mobile: track collapsed columns
    const [collapsedCols, setCollapsedCols] = useState<Set<string>>(new Set());

    const toggleColCollapse = (colKey: string) => {
        setCollapsedCols((prev) => {
            const next = new Set(prev);
            if (next.has(colKey)) next.delete(colKey);
            else next.add(colKey);
            return next;
        });
    };

    const handleCreateIssue = async () => {
        if (!createForm.title.trim() || !createForm.problem_summary.trim()) return;
        setCreating(true);
        try {
            await fetch("/api/issues", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: createForm.title,
                    problem_summary: createForm.problem_summary,
                    why_it_matters: createForm.why_it_matters || null,
                    fix_prompt: createForm.fix_prompt || null,
                }),
            });
            setCreateForm({ title: "", problem_summary: "", why_it_matters: "", fix_prompt: "" });
            setShowCreate(false);
            await fetchIssues();
        } catch (err) {
            console.error("Failed to create issue:", err);
        } finally {
            setCreating(false);
        }
    };

    const fetchIssues = useCallback(async () => {
        setRefreshing(true);
        try {
            const res = await fetch("/api/issues");
            if (!res.ok) {
                console.error("Failed to fetch issues: status", res.status);
                return;
            }
            const data = await res.json();
            setIssues(data);
        } catch (err) {
            console.error("Failed to fetch issues:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchIssues();
    }, [fetchIssues]);

    const updateIssueStatus = async (issueId: string, newStatus: string) => {
        setIssues((prev) => prev.map((iss) => (iss.id === issueId ? { ...iss, status: newStatus } : iss)));
        try {
            await fetch(`/api/issues/${issueId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });
        } catch (err) {
            console.error("Failed to update issue status:", err);
            fetchIssues();
        }
    };

    const deleteIssue = async (issueId: string) => {
        if (!confirm("Delete this issue? This cannot be undone.")) return;
        setIssues((prev) => prev.filter((iss) => iss.id !== issueId));
        try {
            await fetch(`/api/issues/${issueId}`, { method: "DELETE" });
        } catch (err) {
            console.error("Failed to delete issue:", err);
            fetchIssues();
        }
    };

    const createGithubIssue = async (issueId: string) => {
        setCreatingGithub((prev) => ({ ...prev, [issueId]: true }));
        try {
            const res = await fetch("/api/github/create-issue", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ issueId }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => null);
                console.error("Failed to create GitHub issue:", err);
                alert("Failed to create GitHub issue. Check console for details.");
                return;
            }
            const data = await res.json();
            // Update local issue state with the GitHub URL
            setIssues((prev) =>
                prev.map((iss) =>
                    iss.id === issueId
                        ? { ...iss, github_issue_url: data.html_url, github_issue_number: data.number }
                        : iss
                )
            );
        } catch (err) {
            console.error("Failed to create GitHub issue:", err);
            alert("Failed to create GitHub issue.");
        } finally {
            setCreatingGithub((prev) => ({ ...prev, [issueId]: false }));
        }
    };

    const startEditing = (issue: Issue) => {
        setEditingIssue(issue.id);
        setEditForm({
            title: issue.title,
            problem_summary: issue.problem_summary,
            why_it_matters: issue.why_it_matters || "",
            fix_prompt: issue.fix_prompt || "",
        });
        setExpandedIssue(issue.id);
    };

    const cancelEditing = () => {
        setEditingIssue(null);
    };

    const saveEditing = async (issueId: string) => {
        setSaving(true);
        // Optimistic
        setIssues((prev) =>
            prev.map((iss) =>
                iss.id === issueId
                    ? {
                        ...iss,
                        title: editForm.title,
                        problem_summary: editForm.problem_summary,
                        why_it_matters: editForm.why_it_matters || null,
                        fix_prompt: editForm.fix_prompt || null,
                    }
                    : iss
            )
        );
        try {
            await fetch(`/api/issues/${issueId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: editForm.title,
                    problem_summary: editForm.problem_summary,
                    why_it_matters: editForm.why_it_matters || null,
                    fix_prompt: editForm.fix_prompt || null,
                }),
            });
        } catch (err) {
            console.error("Failed to save issue:", err);
            fetchIssues();
        } finally {
            setSaving(false);
            setEditingIssue(null);
        }
    };

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, issueId: string) => {
        setDraggedId(issueId);
        e.dataTransfer.effectAllowed = "move";
        requestAnimationFrame(() => {
            const el = document.getElementById(`issue-${issueId}`);
            if (el) el.classList.add("dragging");
        });
    };

    const handleDragEnd = () => {
        if (draggedId) {
            const el = document.getElementById(`issue-${draggedId}`);
            if (el) el.classList.remove("dragging");
        }
        setDraggedId(null);
        setDragOverCol(null);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>, col: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOverCol(col);
    };

    const handleDragLeave = () => setDragOverCol(null);

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, col: string) => {
        e.preventDefault();
        if (draggedId) updateIssueStatus(draggedId, col);
        setDragOverCol(null);
        setDraggedId(null);
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
        );
    }

    const renderIssueCard = (issue: Issue, col: { key: string; color: string }) => {
        const isEditing = editingIssue === issue.id;
        const isExpanded = expandedIssue === issue.id;

        return (
            <div
                key={issue.id}
                id={`issue-${issue.id}`}
                draggable={!isEditing}
                onDragStart={(e) => handleDragStart(e, issue.id)}
                onDragEnd={handleDragEnd}
                onClick={() => {
                    if (!isEditing) setExpandedIssue(isExpanded ? null : issue.id);
                }}
                className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing group"
                style={{ borderLeft: `3px solid ${col.color}` }}
            >
                {/* Card header */}
                <div className="flex justify-between items-start mb-1.5">
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-amber-600 bg-amber-50 px-1 py-0.5 rounded uppercase tracking-wider border border-amber-100">
                        <Sparkles className="w-2.5 h-2.5" />
                        AI
                    </span>
                    <div className="flex items-center gap-0.5 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        {issue.github_issue_url ? (
                            <a
                                href={issue.github_issue_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-0.5 text-green-500 hover:text-green-600 rounded"
                                title="View on GitHub"
                            >
                                <GitPullRequest className="w-3 h-3" />
                            </a>
                        ) : (
                            <button
                                onClick={(e) => { e.stopPropagation(); createGithubIssue(issue.id); }}
                                disabled={creatingGithub[issue.id]}
                                className="p-0.5 text-gray-400 hover:text-gray-800 rounded disabled:opacity-50"
                                title="Create GitHub Issue"
                            >
                                {creatingGithub[issue.id] ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                    <GitPullRequest className="w-3 h-3" />
                                )}
                            </button>
                        )}
                        <button
                            onClick={(e) => { e.stopPropagation(); startEditing(issue); }}
                            className="p-0.5 text-gray-400 hover:text-blue-500 rounded"
                            title="Edit issue"
                        >
                            <Pencil className="w-3 h-3" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); deleteIssue(issue.id); }}
                            className="p-0.5 text-gray-400 hover:text-red-500 rounded"
                            title="Delete issue"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                        <button className="p-0.5 text-gray-400 hover:text-gray-600 rounded">
                            <GripVertical className="w-3 h-3" />
                        </button>
                    </div>
                </div>

                {isEditing ? (
                    /* Edit mode */
                    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                        <div>
                            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-0.5">Title</label>
                            <input
                                value={editForm.title}
                                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                className="w-full text-[13px] font-semibold text-gray-800 border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:border-blue-300"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-0.5">Summary</label>
                            <textarea
                                value={editForm.problem_summary}
                                onChange={(e) => setEditForm({ ...editForm, problem_summary: e.target.value })}
                                className="w-full text-xs text-gray-600 border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:border-blue-300 resize-none h-16"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-0.5">Why it matters</label>
                            <textarea
                                value={editForm.why_it_matters}
                                onChange={(e) => setEditForm({ ...editForm, why_it_matters: e.target.value })}
                                className="w-full text-xs text-gray-600 border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:border-blue-300 resize-none h-12"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-0.5">Fix prompt</label>
                            <textarea
                                value={editForm.fix_prompt}
                                onChange={(e) => setEditForm({ ...editForm, fix_prompt: e.target.value })}
                                className="w-full text-xs text-gray-600 border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:border-blue-300 resize-none h-12"
                            />
                        </div>
                        <div className="flex gap-1.5 pt-1">
                            <button
                                onClick={() => saveEditing(issue.id)}
                                disabled={saving}
                                className="flex items-center gap-1 text-[11px] font-medium text-white bg-gray-900 hover:bg-gray-800 px-2.5 py-1 rounded-md transition-colors disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                Save
                            </button>
                            <button
                                onClick={cancelEditing}
                                className="flex items-center gap-1 text-[11px] font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded-md transition-colors"
                            >
                                <X className="w-3 h-3" />
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    /* View mode */
                    <>
                        <h4 className="text-[13px] font-semibold text-gray-800 mb-1 leading-snug">
                            {issue.title}
                        </h4>
                        <p className={clsx("text-xs text-gray-500 leading-relaxed mb-2", !isExpanded && "line-clamp-2")}>
                            {issue.problem_summary}
                        </p>

                        {isExpanded && (
                            <div className="animate-slide-down mb-2 space-y-2">
                                {issue.why_it_matters && (
                                    <div className="text-xs p-2 rounded-md bg-gray-50 border border-gray-100">
                                        <span className="font-semibold text-amber-600 block mb-0.5">Why it matters</span>
                                        <span className="text-gray-600">{issue.why_it_matters}</span>
                                    </div>
                                )}
                                {issue.fix_prompt && (
                                    <div className="text-xs p-2 rounded-md bg-blue-50/50 border border-blue-100">
                                        <span className="font-semibold text-blue-600 block mb-0.5">Suggested fix</span>
                                        <span className="text-gray-600">{issue.fix_prompt}</span>
                                    </div>
                                )}
                                {issue.ticket && (
                                    <div className="text-xs p-2 rounded-md bg-gray-50 border border-gray-100">
                                        <span className="font-semibold text-gray-500 block mb-0.5">Linked ticket</span>
                                        <span className="text-gray-600 flex items-center gap-1">
                                            <ExternalLink className="w-3 h-3" />
                                            {issue.ticket.subject} — {issue.ticket.customer_email}
                                        </span>
                                        <Link
                                            href={`/inbox?ticket=${issue.ticket_id}`}
                                            onClick={(e) => e.stopPropagation()}
                                            className="inline-flex items-center gap-1.5 mt-2 text-[11px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md transition-colors"
                                        >
                                            <InboxIcon className="w-3 h-3" />
                                            View in Inbox
                                        </Link>
                                    </div>
                                )}
                                {issue.github_issue_url && (
                                    <a
                                        href={issue.github_issue_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 px-2.5 py-1.5 rounded-md transition-colors border border-gray-200"
                                    >
                                        <GitPullRequest className="w-3.5 h-3.5" />
                                        View on GitHub
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                )}
                            </div>
                        )}

                        <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-1 text-gray-400">
                                <MessageSquare className="w-3 h-3" />
                                <span className="text-[10px] font-medium truncate max-w-[80px]">
                                    {issue.ticket?.customer_email || "Manual"}
                                </span>
                            </div>
                            <div className="flex items-center gap-0.5 text-gray-400">
                                <Clock className="w-3 h-3" />
                                <span className="text-[10px] font-medium">{timeAgo(issue.created_at)}</span>
                            </div>
                        </div>
                    </>
                )}
            </div>
        );
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
            <div className="px-4 md:px-5 py-3 md:py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-sm md:text-base font-semibold text-gray-900">Issues Board</h1>
                    <p className="text-xs text-gray-400 mt-0.5">
                        {issues.length} issue{issues.length !== 1 ? "s" : ""} across the workspace
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchIssues}
                        disabled={refreshing}
                        className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 px-2.5 py-1.5 rounded-md transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
                        <span className="hidden sm:inline">{refreshing ? "Refreshing…" : "Refresh"}</span>
                    </button>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="flex items-center gap-1.5 bg-gray-900 text-white px-3.5 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-800 transition-colors"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">New Issue</span>
                    </button>
                </div>
            </div>

            {/* Create Issue Modal */}
            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                    <div
                        className="bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-md mx-4 animate-slide-down"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-sm font-semibold text-gray-900">New Issue</h3>
                            <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-5 space-y-3">
                            <div>
                                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Title *</label>
                                <input
                                    value={createForm.title}
                                    onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-300 text-gray-800 placeholder:text-gray-400"
                                    placeholder="Short issue title"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Summary *</label>
                                <textarea
                                    value={createForm.problem_summary}
                                    onChange={(e) => setCreateForm({ ...createForm, problem_summary: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-300 text-gray-800 placeholder:text-gray-400 h-20 resize-none"
                                    placeholder="Describe the problem"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Why it matters</label>
                                <input
                                    value={createForm.why_it_matters}
                                    onChange={(e) => setCreateForm({ ...createForm, why_it_matters: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-300 text-gray-800 placeholder:text-gray-400"
                                    placeholder="Business impact (optional)"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Suggested fix</label>
                                <input
                                    value={createForm.fix_prompt}
                                    onChange={(e) => setCreateForm({ ...createForm, fix_prompt: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-300 text-gray-800 placeholder:text-gray-400"
                                    placeholder="How to fix this (optional)"
                                />
                            </div>
                        </div>
                        <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2">
                            <button
                                onClick={() => setShowCreate(false)}
                                className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateIssue}
                                disabled={creating || !createForm.title.trim() || !createForm.problem_summary.trim()}
                                className="flex items-center gap-1.5 bg-gray-900 text-white px-3.5 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
                            >
                                {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Desktop: horizontal kanban (unchanged) */}
            <div className="flex-1 overflow-x-auto px-5 py-4 hidden md:flex gap-4 bg-gray-50/60">
                {COLUMNS.map((col) => {
                    const columnIssues = issues.filter((iss) => iss.status === col.key);
                    const isDragOver = dragOverCol === col.key;

                    return (
                        <div key={col.key} className="w-[280px] shrink-0 flex flex-col h-full">
                            <div className="flex items-center justify-between mb-2 px-0.5">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                                    <h3 className="text-[13px] font-semibold text-gray-700">{col.key}</h3>
                                </div>
                                <span className="text-[10px] font-semibold text-gray-400 bg-gray-200/60 px-1.5 py-0.5 rounded-full">
                                    {columnIssues.length}
                                </span>
                            </div>

                            <div
                                className={clsx(
                                    "flex-1 flex flex-col gap-2.5 p-2.5 rounded-xl overflow-y-auto transition-colors",
                                    isDragOver ? "drag-over" : "bg-gray-100/50 border border-gray-200/60"
                                )}
                                style={{ minHeight: 100 }}
                                onDragOver={(e) => handleDragOver(e, col.key)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, col.key)}
                            >
                                {columnIssues.map((issue) => renderIssueCard(issue, col))}

                                {columnIssues.length === 0 && (
                                    <div
                                        className="h-full min-h-[60px] flex items-center justify-center rounded-lg border-2 border-dashed border-gray-200 transition-colors"
                                        style={isDragOver ? { borderColor: col.color, background: `${col.color}08` } : {}}
                                    >
                                        <p className="text-[11px] text-gray-400 font-medium">
                                            {isDragOver ? "Drop here" : "Drag issues here"}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Mobile: stacked, collapsible sections */}
            <div className="flex-1 overflow-y-auto px-4 py-3 md:hidden bg-gray-50/60 space-y-3">
                {COLUMNS.map((col) => {
                    const columnIssues = issues.filter((iss) => iss.status === col.key);
                    const isCollapsed = collapsedCols.has(col.key);

                    return (
                        <div key={col.key}>
                            <button
                                onClick={() => toggleColCollapse(col.key)}
                                className="w-full flex items-center justify-between py-2 px-1"
                            >
                                <div className="flex items-center gap-2">
                                    {isCollapsed
                                        ? <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                                        : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                                    }
                                    <span className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                                    <h3 className="text-[13px] font-semibold text-gray-700">{col.key}</h3>
                                </div>
                                <span className="text-[10px] font-semibold text-gray-400 bg-gray-200/60 px-1.5 py-0.5 rounded-full">
                                    {columnIssues.length}
                                </span>
                            </button>

                            {!isCollapsed && (
                                <div className="space-y-2.5 pt-1 pb-2">
                                    {columnIssues.map((issue) => renderIssueCard(issue, col))}
                                    {columnIssues.length === 0 && (
                                        <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-4">
                                            <p className="text-[11px] text-gray-400 font-medium">No issues</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
