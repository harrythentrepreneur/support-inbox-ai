"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
    Search,
    Reply,
    Sparkles,
    Send,
    InboxIcon,
    Loader2,
    Bug,
    AlertCircle,
    Download,
    ShieldAlert,
    ChevronDown,
    Mail,
    ArrowLeft,
    Paperclip,
    X,
    Plus,
    FileText,
    Trash2,
} from "lucide-react";
import clsx from "clsx";
import TicketStatusDropdown from "@/components/TicketStatusDropdown";

interface Attachment {
    id: string;
    filename: string;
    content_type: string;
    size: number;
}

interface Message {
    id: string;
    sender_name: string;
    body_text: string;
    direction: string;
    sent_at: string;
    attachments?: Attachment[];
}

interface Issue {
    id: string;
    title: string;
    status: string;
}

interface Ticket {
    id: string;
    subject: string;
    status: string;
    customer_email: string;
    mailbox: string;
    latest_message_at: string;
    summary_text: string | null;
    messages: Message[];
    issues: Issue[];
    created_at: string;
}

const STATUS_DOT_MAP: Record<string, string> = {
    Open: "status-dot-open",
    Pending: "status-dot-pending",
    "On Hold": "status-dot-onhold",
    Solved: "status-dot-solved",
    Spam: "status-dot-spam",
};

const QUEUE_TO_STATUS: Record<string, string> = {
    open: "Open",
    pending: "Pending",
    onhold: "On Hold",
    solved: "Solved",
    spam: "Spam",
};

const EMAIL_ACCOUNTS = [
    process.env.NEXT_PUBLIC_EMAIL_1 || "",
    process.env.NEXT_PUBLIC_EMAIL_2 || "",
].filter(Boolean);

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

function getInitial(email: string): string {
    return email.charAt(0).toUpperCase();
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function InboxContent() {
    const searchParams = useSearchParams();
    const queueParam = searchParams.get("queue");
    const ticketParam = searchParams.get("ticket");

    const [allTickets, setAllTickets] = useState<Ticket[]>([]);
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const [replyText, setReplyText] = useState("");
    const [replyFrom, setReplyFrom] = useState<string>("");
    const [replySubject, setReplySubject] = useState<string>("");
    const [showFromPicker, setShowFromPicker] = useState(false);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [drafting, setDrafting] = useState(false);
    const [summarizing, setSummarizing] = useState(false);
    const [extracting, setExtracting] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [showDraftPrompt, setShowDraftPrompt] = useState(false);
    const [draftPrompt, setDraftPrompt] = useState("");

    // Search state
    const [searchQuery, setSearchQuery] = useState("");
    const [searchFocused, setSearchFocused] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // File upload state
    const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Compose new email state
    const [showCompose, setShowCompose] = useState(false);
    const [composeTo, setComposeTo] = useState("");
    const [composeSubject, setComposeSubject] = useState("");
    const [composeBody, setComposeBody] = useState("");
    const [composeFrom, setComposeFrom] = useState(EMAIL_ACCOUNTS[0]);
    const [composeFiles, setComposeFiles] = useState<File[]>([]);
    const [composeSending, setComposeSending] = useState(false);
    const [showComposeFromPicker, setShowComposeFromPicker] = useState(false);
    const composeFileInputRef = useRef<HTMLInputElement>(null);

    // Compose AI state
    const [composeDrafting, setComposeDrafting] = useState(false);
    const [composeShowDraftPrompt, setComposeShowDraftPrompt] = useState(false);
    const [composeDraftPrompt, setComposeDraftPrompt] = useState("");
    const [composeGeneratingSubject, setComposeGeneratingSubject] = useState(false);

    const fetchTickets = useCallback(async () => {
        try {
            const res = await fetch("/api/tickets");
            if (!res.ok) return;
            const data = await res.json();
            setAllTickets(data);
            if (data.length > 0 && !selectedTicketId) {
                if (ticketParam && data.some((t: Ticket) => t.id === ticketParam)) {
                    setSelectedTicketId(ticketParam);
                } else {
                    setSelectedTicketId(data[0].id);
                }
            }
        } catch (err) {
            console.error("Failed to fetch tickets:", err);
        } finally {
            setLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ticketParam]);

    useEffect(() => {
        fetchTickets();
        // Auto-sync emails on page load
        handleSyncEmail();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Filter tickets based on queue (default to Open)
    const activeQueue = queueParam && QUEUE_TO_STATUS[queueParam]
        ? QUEUE_TO_STATUS[queueParam]
        : "Open";
    const queueFiltered = allTickets.filter((t) => t.status === activeQueue);

    // Filter tickets based on search query
    const tickets = searchQuery.trim()
        ? queueFiltered.filter((t) => {
            const q = searchQuery.toLowerCase();
            return (
                t.subject.toLowerCase().includes(q) ||
                t.customer_email.toLowerCase().includes(q) ||
                t.messages.some((m) => m.body_text.toLowerCase().includes(q) || m.sender_name.toLowerCase().includes(q))
            );
        })
        : queueFiltered;

    const selectedTicket = allTickets.find((t) => t.id === selectedTicketId);

    // Set default reply-from and subject based on ticket
    useEffect(() => {
        if (selectedTicket?.mailbox) {
            setReplyFrom(selectedTicket.mailbox);
        }
        if (selectedTicket?.subject) {
            setReplySubject(selectedTicket.subject);
        }
    }, [selectedTicket?.mailbox, selectedTicket?.subject]);

    const handleSyncEmail = async () => {
        setSyncing(true);
        try {
            const res = await fetch("/api/sync", { method: "POST" });
            const data = await res.json();
            if (data.success) await fetchTickets();
            else console.error("Sync failed:", data.error);
        } catch (err) {
            console.error("Sync error:", err);
        } finally {
            setSyncing(false);
        }
    };

    const handleSendReply = async () => {
        if (!selectedTicket || !replyText.trim()) return;
        setSending(true);
        try {
            const formData = new FormData();
            formData.append("body_text", replyText);
            formData.append("send_from", replyFrom);
            formData.append("subject", replySubject);
            for (const file of attachedFiles) {
                formData.append("files", file);
            }
            await fetch(`/api/tickets/${selectedTicket.id}/reply`, {
                method: "POST",
                body: formData,
            });
            setReplyText("");
            setAttachedFiles([]);
            await fetchTickets();
        } catch (err) {
            console.error("Failed to send reply:", err);
        } finally {
            setSending(false);
        }
    };

    const handleGenerateDraft = async () => {
        if (!selectedTicket) return;
        setDrafting(true);
        setShowDraftPrompt(false);
        try {
            const res = await fetch(`/api/tickets/${selectedTicket.id}/draft`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ customPrompt: draftPrompt || undefined, existingText: replyText || undefined, sendFrom: replyFrom }),
            });
            const data = await res.json();
            setReplyText(data.draft);
            setDraftPrompt("");
        } catch (err) {
            console.error("Failed to generate draft:", err);
        } finally {
            setDrafting(false);
        }
    };

    const handleSummarize = async () => {
        if (!selectedTicket) return;
        setSummarizing(true);
        try {
            await fetch(`/api/tickets/${selectedTicket.id}/summarize`, { method: "POST" });
            await fetchTickets();
        } catch (err) {
            console.error("Failed to summarize:", err);
        } finally {
            setSummarizing(false);
        }
    };

    const handleExtractIssue = async () => {
        if (!selectedTicket) return;
        setExtracting(true);
        try {
            await fetch(`/api/tickets/${selectedTicket.id}/extract-issue`, { method: "POST" });
            await fetchTickets();
        } catch (err) {
            console.error("Failed to extract issue:", err);
        } finally {
            setExtracting(false);
        }
    };

    const handleStatusChange = async (ticketId: string, newStatus: string) => {
        setAllTickets((prev) =>
            prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t))
        );
        try {
            await fetch(`/api/tickets/${ticketId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });
        } catch (err) {
            console.error("Failed to update status:", err);
            fetchTickets();
        }
    };

    // Mobile: go back to list
    const handleBackToList = () => {
        setSelectedTicketId(null);
        setReplyText("");
        setAttachedFiles([]);
        setShowCompose(false);
    };

    const handleDeleteTicket = async (ticketId: string) => {
        if (!confirm("Delete this ticket and all its messages? This cannot be undone.")) return;
        setAllTickets((prev) => prev.filter((t) => t.id !== ticketId));
        setSelectedTicketId(null);
        try {
            await fetch(`/api/tickets/${ticketId}`, { method: "DELETE" });
        } catch (err) {
            console.error("Failed to delete ticket:", err);
            fetchTickets();
        }
    };

    // File upload handlers
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        const newFiles = Array.from(files).filter(f => f.size <= 5 * 1024 * 1024); // 5MB limit
        setAttachedFiles(prev => [...prev, ...newFiles]);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleRemoveFile = (index: number) => {
        setAttachedFiles(prev => prev.filter((_, i) => i !== index));
    };

    // Compose file handlers
    const handleComposeFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        const newFiles = Array.from(files).filter(f => f.size <= 5 * 1024 * 1024);
        setComposeFiles(prev => [...prev, ...newFiles]);
        if (composeFileInputRef.current) composeFileInputRef.current.value = "";
    };

    const handleRemoveComposeFile = (index: number) => {
        setComposeFiles(prev => prev.filter((_, i) => i !== index));
    };

    // Compose AI handlers
    const handleComposeDraft = async () => {
        setComposeDrafting(true);
        setComposeShowDraftPrompt(false);
        try {
            const res = await fetch("/api/compose/draft", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: composeDraftPrompt || undefined,
                    existingBody: composeBody || undefined,
                    to: composeTo || undefined,
                    subject: composeSubject || undefined,
                    sendFrom: composeFrom,
                }),
            });
            const data = await res.json();
            if (data.draft) setComposeBody(data.draft);
            setComposeDraftPrompt("");
        } catch (err) {
            console.error("Failed to generate compose draft:", err);
        } finally {
            setComposeDrafting(false);
        }
    };

    const handleComposeAISubject = async () => {
        if (!composeBody.trim()) return;
        setComposeGeneratingSubject(true);
        try {
            const res = await fetch("/api/compose/subject", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bodyText: composeBody }),
            });
            const data = await res.json();
            if (data.subject) setComposeSubject(data.subject);
        } catch (err) {
            console.error("Failed to generate subject:", err);
        } finally {
            setComposeGeneratingSubject(false);
        }
    };

    // Compose send handler
    const handleSendCompose = async () => {
        if (!composeTo.trim() || !composeSubject.trim() || !composeBody.trim()) return;
        setComposeSending(true);
        try {
            const formData = new FormData();
            formData.append("to", composeTo);
            formData.append("subject", composeSubject);
            formData.append("body_text", composeBody);
            formData.append("send_from", composeFrom);
            for (const file of composeFiles) {
                formData.append("files", file);
            }
            const res = await fetch("/api/tickets/compose", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();
            if (data.success) {
                setShowCompose(false);
                setComposeTo("");
                setComposeSubject("");
                setComposeBody("");
                setComposeFiles([]);
                await fetchTickets();
                if (data.ticket?.id) {
                    setSelectedTicketId(data.ticket.id);
                }
            }
        } catch (err) {
            console.error("Failed to compose email:", err);
        } finally {
            setComposeSending(false);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
        );
    }

    const queueLabel = activeQueue;

    return (
        <div className="flex-1 flex h-full overflow-hidden">
            {/* Ticket List — full width mobile, fixed 340px desktop. Hidden on mobile when ticket selected. */}
            <div
                className={clsx(
                    "border-r border-gray-100 bg-white flex flex-col shrink-0",
                    "w-full md:w-[340px]",
                    (selectedTicketId || showCompose) ? "hidden md:flex" : "flex"
                )}
            >
                <div className="px-4 py-3 border-b border-gray-100">
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="font-semibold text-sm text-gray-900">{queueLabel}</h2>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => { setShowCompose(true); setSelectedTicketId(null); }}
                                className="flex items-center gap-1 text-[11px] font-medium text-white bg-gray-900 hover:bg-gray-800 px-2 py-1 rounded-md transition-colors"
                                title="Compose new email"
                            >
                                <Plus className="w-3 h-3" />
                                New
                            </button>
                            <button
                                onClick={handleSyncEmail}
                                disabled={syncing}
                                className="flex items-center gap-1 text-[11px] font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-md transition-colors disabled:opacity-50"
                                title="Sync email inbox"
                            >
                                {syncing ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                    <Download className="w-3 h-3" />
                                )}
                                Sync
                            </button>
                        </div>
                    </div>
                    <span className="text-[11px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                        {tickets.length} ticket{tickets.length !== 1 ? "s" : ""}
                    </span>
                </div>

                {/* Search bar */}
                <div className="px-3 py-2 border-b border-gray-100">
                    <div className={clsx(
                        "flex items-center gap-2 rounded-lg px-2.5 py-1.5 transition-all duration-200",
                        searchFocused ? "bg-white border border-gray-300 shadow-sm" : "bg-gray-50 border border-transparent"
                    )}>
                        <Search className={clsx(
                            "w-3.5 h-3.5 shrink-0 transition-colors",
                            searchFocused ? "text-gray-500" : "text-gray-400"
                        )} />
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => setSearchFocused(true)}
                            onBlur={() => setSearchFocused(false)}
                            placeholder="Search emails..."
                            className="flex-1 bg-transparent text-[12px] text-gray-800 placeholder:text-gray-400 outline-none"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => { setSearchQuery(""); searchInputRef.current?.focus(); }}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {tickets.map((ticket) => {
                        const isSelected = ticket.id === selectedTicketId;
                        const lastMsg = ticket.messages[ticket.messages.length - 1];
                        return (
                            <div
                                key={ticket.id}
                                onClick={() => {
                                    setSelectedTicketId(ticket.id);
                                    setShowCompose(false);
                                    setReplyText("");
                                    setAttachedFiles([]);
                                }}
                                className={clsx(
                                    "px-4 py-3 border-b border-gray-50 cursor-pointer transition-colors",
                                    isSelected ? "bg-blue-50/50" : "hover:bg-gray-50"
                                )}
                            >
                                <div className="flex justify-between items-start mb-0.5">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[9px] font-bold text-gray-500 shrink-0">
                                            {getInitial(ticket.customer_email)}
                                        </div>
                                        <span className={clsx("font-medium text-[13px] truncate", isSelected ? "text-gray-900" : "text-gray-700")}>
                                            {ticket.customer_email}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">
                                        {timeAgo(ticket.latest_message_at)}
                                    </span>
                                </div>
                                <h3 className={clsx("text-[13px] font-medium mb-0.5 truncate pl-7", isSelected ? "text-gray-800" : "text-gray-600")}>
                                    {ticket.subject}
                                </h3>
                                <p className="text-xs text-gray-400 line-clamp-1 pl-7">
                                    {lastMsg?.body_text.slice(0, 120)}
                                </p>
                                <div className="flex items-center gap-1.5 mt-1.5 pl-7">
                                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                        <span className={clsx("status-dot", STATUS_DOT_MAP[ticket.status] || "")} style={{ width: 5, height: 5 }} />
                                        {ticket.status}
                                    </span>
                                    {ticket.mailbox && (
                                        <span className="text-[10px] text-gray-400 truncate max-w-[100px]">
                                            via {ticket.mailbox.split("@")[0]}
                                        </span>
                                    )}
                                    {ticket.issues.length > 0 && (
                                        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                                            <Sparkles className="w-2.5 h-2.5" />
                                            Issue
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {tickets.length === 0 && (
                        <div className="p-8 text-center">
                            <p className="text-gray-400 text-xs">
                                {queueParam ? "No tickets in this queue." : "No tickets yet. Click Sync to fetch from your email."}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Thread Detail / Compose — full screen on mobile when ticket selected */}
            <div
                className={clsx(
                    "flex-1 flex flex-col bg-white min-w-0",
                    (selectedTicketId || showCompose) ? "flex" : "hidden md:flex"
                )}
            >
                {/* ========== COMPOSE NEW EMAIL ========== */}
                {showCompose ? (
                    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
                        <div className="px-4 md:px-5 py-3 md:py-4 border-b border-gray-100 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleBackToList}
                                    className="md:hidden p-1 -ml-1 text-gray-500 hover:text-gray-700 rounded-md"
                                    aria-label="Back to list"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                </button>
                                <Mail className="w-4 h-4 text-gray-500" />
                                <h2 className="text-sm md:text-base font-semibold text-gray-900">New Email</h2>
                            </div>
                            <button
                                onClick={() => setShowCompose(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 md:px-5 py-4 space-y-3">
                            {/* From */}
                            <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                                <label className="text-xs font-medium text-gray-400 w-14 shrink-0">From</label>
                                <div className="relative flex-1">
                                    <button
                                        onClick={() => setShowComposeFromPicker(!showComposeFromPicker)}
                                        className="w-full flex items-center justify-between text-[13px] text-gray-800 bg-transparent hover:text-gray-900 transition-colors"
                                    >
                                        {composeFrom}
                                        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                                    </button>
                                    {showComposeFromPicker && (
                                        <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
                                            {EMAIL_ACCOUNTS.map((email) => (
                                                <button
                                                    key={email}
                                                    onClick={() => { setComposeFrom(email); setShowComposeFromPicker(false); }}
                                                    className={clsx(
                                                        "w-full text-left px-3 py-1.5 text-xs font-medium transition-colors",
                                                        email === composeFrom ? "bg-gray-50 text-gray-900" : "text-gray-600 hover:bg-gray-50"
                                                    )}
                                                >
                                                    {email}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            {/* To */}
                            <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                                <label className="text-xs font-medium text-gray-400 w-14 shrink-0">To</label>
                                <input
                                    type="email"
                                    value={composeTo}
                                    onChange={(e) => setComposeTo(e.target.value)}
                                    placeholder="recipient@example.com"
                                    className="flex-1 text-[13px] text-gray-800 bg-transparent border-none outline-none placeholder:text-gray-300 transition-colors"
                                />
                            </div>
                            {/* Subject */}
                            <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                                <label className="text-xs font-medium text-gray-400 w-14 shrink-0">Subject</label>
                                <input
                                    type="text"
                                    value={composeSubject}
                                    onChange={(e) => setComposeSubject(e.target.value)}
                                    placeholder="Email subject"
                                    className="flex-1 text-[13px] text-gray-800 bg-transparent border-none outline-none placeholder:text-gray-300 transition-colors"
                                />
                                <button
                                    onClick={handleComposeAISubject}
                                    disabled={composeGeneratingSubject || !composeBody.trim()}
                                    className="flex items-center gap-1 text-[11px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                                    title="Generate subject from body"
                                >
                                    {composeGeneratingSubject ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                </button>
                            </div>
                            {/* Body */}
                            <textarea
                                value={composeBody}
                                onChange={(e) => setComposeBody(e.target.value)}
                                placeholder="Write your email..."
                                className="w-full h-48 text-[13px] text-gray-800 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-gray-300 placeholder:text-gray-400 resize-none transition-colors"
                            />

                            {/* Attached files preview */}
                            {composeFiles.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {composeFiles.map((file, idx) => (
                                        <div key={idx} className="flex items-center gap-1.5 bg-gray-100 rounded-lg px-2.5 py-1.5 text-xs text-gray-600 group">
                                            {file.type.startsWith("image/") ? (
                                                <img
                                                    src={URL.createObjectURL(file)}
                                                    alt={file.name}
                                                    className="w-8 h-8 rounded object-cover"
                                                />
                                            ) : (
                                                <FileText className="w-3.5 h-3.5 text-gray-400" />
                                            )}
                                            <span className="max-w-[120px] truncate">{file.name}</span>
                                            <span className="text-gray-400">{formatFileSize(file.size)}</span>
                                            <button
                                                onClick={() => handleRemoveComposeFile(idx)}
                                                className="text-gray-400 hover:text-red-500 transition-colors ml-0.5"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Compose footer */}
                        <div className="px-4 md:px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-1">
                                <input
                                    ref={composeFileInputRef}
                                    type="file"
                                    accept="image/*,.pdf,.doc,.docx,.txt"
                                    multiple
                                    onChange={handleComposeFileSelect}
                                    className="hidden"
                                />
                                <button
                                    onClick={() => composeFileInputRef.current?.click()}
                                    className="flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:text-gray-700 px-2 py-1.5 rounded-md hover:bg-gray-100 transition-colors"
                                    title="Attach files"
                                >
                                    <Paperclip className="w-3.5 h-3.5" />
                                    Attach
                                </button>
                                {composeShowDraftPrompt ? (
                                    <div className="flex items-center gap-1 ml-1">
                                        <input
                                            type="text"
                                            value={composeDraftPrompt}
                                            onChange={(e) => setComposeDraftPrompt(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === "Enter") handleComposeDraft(); if (e.key === "Escape") { setComposeShowDraftPrompt(false); setComposeDraftPrompt(""); } }}
                                            placeholder="e.g. write a billing follow-up..."
                                            className="text-[11px] px-2 py-1 border border-blue-200 rounded-md bg-blue-50/50 text-gray-700 placeholder:text-gray-400 outline-none focus:border-blue-300 w-44 md:w-56"
                                            autoFocus
                                        />
                                        <button
                                            onClick={handleComposeDraft}
                                            disabled={composeDrafting}
                                            className="flex items-center gap-1 text-[11px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-md transition-colors disabled:opacity-50"
                                        >
                                            {composeDrafting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                            Go
                                        </button>
                                        <button
                                            onClick={() => { setComposeShowDraftPrompt(false); setComposeDraftPrompt(""); }}
                                            className="text-gray-400 hover:text-gray-600 transition-colors"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setComposeShowDraftPrompt(true)}
                                        disabled={composeDrafting}
                                        className="flex items-center gap-1 text-[11px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-md transition-colors disabled:opacity-50"
                                    >
                                        {composeDrafting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                        AI Draft
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={handleSendCompose}
                                disabled={composeSending || !composeTo.trim() || !composeSubject.trim() || !composeBody.trim()}
                                className="flex items-center gap-1.5 bg-gray-900 text-white px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {composeSending ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Send className="w-3 h-3" /> Send</>}
                            </button>
                        </div>
                    </div>
                ) : selectedTicket ? (
                    /* ========== TICKET THREAD ========== */
                    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in" key={selectedTicket.id}>
                        {/* Header */}
                        <div className="px-4 md:px-5 py-3 md:py-4 border-b border-gray-100 flex justify-between items-start">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1.5">
                                    {/* Back button — mobile only */}
                                    <button
                                        onClick={handleBackToList}
                                        className="md:hidden p-1 -ml-1 text-gray-500 hover:text-gray-700 rounded-md"
                                        aria-label="Back to list"
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                    </button>
                                    <h2 className="text-sm md:text-base font-semibold text-gray-900 truncate">
                                        {selectedTicket.subject}
                                    </h2>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <TicketStatusDropdown
                                        status={selectedTicket.status}
                                        onChange={(s) => handleStatusChange(selectedTicket.id, s)}
                                    />
                                    <span className="text-[11px] text-gray-400 truncate">
                                        {selectedTicket.customer_email}
                                    </span>
                                    {selectedTicket.mailbox && (
                                        <span className="hidden sm:inline text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                            → {selectedTicket.mailbox}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-1 ml-2 shrink-0">
                                <button
                                    onClick={handleSummarize}
                                    disabled={summarizing}
                                    className="flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 px-2 py-1 rounded-md transition-colors disabled:opacity-50"
                                >
                                    {summarizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                    <span className="hidden sm:inline">Summarize</span>
                                </button>
                                <button
                                    onClick={handleExtractIssue}
                                    disabled={extracting}
                                    className="flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 px-2 py-1 rounded-md transition-colors disabled:opacity-50"
                                >
                                    {extracting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bug className="w-3 h-3" />}
                                    <span className="hidden sm:inline">Extract</span>
                                </button>
                                <button
                                    onClick={() => handleStatusChange(selectedTicket.id, "Spam")}
                                    className="flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 px-2 py-1 rounded-md transition-colors"
                                    title="Mark as spam"
                                >
                                    <ShieldAlert className="w-3 h-3" />
                                    <span className="hidden sm:inline">Spam</span>
                                </button>
                                <button
                                    onClick={() => handleDeleteTicket(selectedTicket.id)}
                                    className="flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:bg-red-50 hover:text-red-600 px-2 py-1 rounded-md transition-colors"
                                    title="Delete ticket"
                                >
                                    <Trash2 className="w-3 h-3" />
                                    <span className="hidden sm:inline">Delete</span>
                                </button>
                            </div>
                        </div>

                        {/* AI Summary */}
                        {selectedTicket.summary_text && (
                            <div className="px-4 md:px-5 py-3 bg-gray-50/80 border-b border-gray-100">
                                <div className="flex items-start gap-2.5">
                                    <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                                        <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">AI Summary</h4>
                                        <p className="text-[13px] text-gray-600 leading-relaxed whitespace-pre-wrap">{selectedTicket.summary_text}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Issue Banner */}
                        {selectedTicket.issues.length > 0 && (
                            <div className="px-4 md:px-5 py-3 bg-amber-50/50 border-b border-amber-100/50">
                                <div className="flex items-start gap-2.5">
                                    <div className="w-6 h-6 rounded-md bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                    </div>
                                    <div>
                                        <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">
                                            {selectedTicket.issues.length} Issue{selectedTicket.issues.length > 1 ? "s" : ""} Detected
                                        </h4>
                                        {selectedTicket.issues.map((iss) => (
                                            <p key={iss.id} className="text-[13px] text-amber-700">{iss.title}</p>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Messages — full content with attachments */}
                        <div className="flex-1 overflow-y-auto px-4 md:px-5 py-4 space-y-4">
                            {selectedTicket.messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={clsx(
                                        "flex flex-col max-w-[90%] md:max-w-[85%]",
                                        msg.direction === "outbound" ? "ml-auto items-end" : "mr-auto items-start"
                                    )}
                                >
                                    <div className="flex items-center gap-1.5 mb-1 px-0.5">
                                        <span className="text-xs font-medium text-gray-700">{msg.sender_name}</span>
                                        <span className="text-[10px] text-gray-400">{timeAgo(msg.sent_at)}</span>
                                    </div>
                                    <div
                                        className={clsx(
                                            "p-3.5 rounded-2xl text-[13px] whitespace-pre-wrap leading-relaxed",
                                            msg.direction === "outbound"
                                                ? "bg-gray-900 text-white rounded-tr-sm"
                                                : "bg-gray-100 text-gray-800 rounded-tl-sm"
                                        )}
                                    >
                                        {msg.body_text}
                                    </div>
                                    {/* Attached images & files */}
                                    {msg.attachments && msg.attachments.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {msg.attachments.map((att) => (
                                                att.content_type.startsWith("image/") ? (
                                                    <a
                                                        key={att.id}
                                                        href={`/api/attachments/${att.id}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="block"
                                                    >
                                                        <img
                                                            src={`/api/attachments/${att.id}`}
                                                            alt={att.filename}
                                                            className="max-w-[240px] max-h-[180px] rounded-lg border border-gray-200 object-cover hover:opacity-90 transition-opacity cursor-pointer"
                                                        />
                                                    </a>
                                                ) : (
                                                    <a
                                                        key={att.id}
                                                        href={`/api/attachments/${att.id}`}
                                                        download={att.filename}
                                                        className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 transition-colors"
                                                    >
                                                        <FileText className="w-3.5 h-3.5 text-gray-400" />
                                                        <span className="max-w-[150px] truncate">{att.filename}</span>
                                                        <span className="text-gray-400">{formatFileSize(att.size)}</span>
                                                    </a>
                                                )
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Reply — with from selector, subject, and file upload */}
                        <div className="px-3 md:px-4 py-3 border-t border-gray-100">
                            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden focus-within:border-gray-300 transition-colors">
                                <div className="px-3 py-2 border-b border-gray-100 flex flex-col gap-2">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Reply className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                            <span className="text-xs text-gray-500 truncate max-w-[140px] md:max-w-none">
                                                Reply to {selectedTicket.customer_email}
                                            </span>
                                            {/* From selector */}
                                            <div className="relative">
                                                <button
                                                    onClick={() => setShowFromPicker(!showFromPicker)}
                                                    className="flex items-center gap-1 text-[11px] font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded transition-colors"
                                                >
                                                    <Mail className="w-3 h-3" />
                                                    from: {replyFrom?.split("@")[0] || "select"}
                                                    <ChevronDown className="w-2.5 h-2.5" />
                                                </button>
                                                {showFromPicker && (
                                                    <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
                                                        {EMAIL_ACCOUNTS.map((email) => (
                                                            <button
                                                                key={email}
                                                                onClick={() => { setReplyFrom(email); setShowFromPicker(false); }}
                                                                className={clsx(
                                                                    "w-full text-left px-3 py-1.5 text-xs font-medium transition-colors",
                                                                    email === replyFrom ? "bg-gray-50 text-gray-900" : "text-gray-600 hover:bg-gray-50"
                                                                )}
                                                            >
                                                                {email}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {showDraftPrompt ? (
                                            <div className="flex items-center gap-1">
                                                <input
                                                    type="text"
                                                    value={draftPrompt}
                                                    onChange={(e) => setDraftPrompt(e.target.value)}
                                                    onKeyDown={(e) => { if (e.key === "Enter") handleGenerateDraft(); if (e.key === "Escape") { setShowDraftPrompt(false); setDraftPrompt(""); } }}
                                                    placeholder="e.g. friendly tone, ask for details..."
                                                    className="text-[11px] px-2 py-1 border border-blue-200 rounded-md bg-blue-50/50 text-gray-700 placeholder:text-gray-400 outline-none focus:border-blue-300 w-44 md:w-56"
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={handleGenerateDraft}
                                                    disabled={drafting}
                                                    className="flex items-center gap-1 text-[11px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-md transition-colors disabled:opacity-50"
                                                >
                                                    {drafting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                                    Go
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setShowDraftPrompt(true)}
                                                disabled={drafting}
                                                className="flex items-center gap-1 text-[11px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-md transition-colors disabled:opacity-50"
                                            >
                                                {drafting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                                AI Draft
                                            </button>
                                        )}
                                    </div>
                                    {/* Subject line */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] font-medium text-gray-400 shrink-0">Subject:</span>
                                        <input
                                            type="text"
                                            value={replySubject}
                                            onChange={(e) => setReplySubject(e.target.value)}
                                            className="flex-1 text-[12px] text-gray-600 bg-transparent border-none outline-none placeholder:text-gray-300 transition-colors"
                                            placeholder="Email subject"
                                        />
                                    </div>
                                </div>
                                <textarea
                                    className="w-full h-20 md:h-24 px-3 py-2.5 text-[13px] bg-transparent border-none focus:ring-0 resize-none outline-none text-gray-800 placeholder:text-gray-400"
                                    placeholder="Type your reply..."
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                />

                                {/* Attached files preview */}
                                {attachedFiles.length > 0 && (
                                    <div className="px-3 pb-2 flex flex-wrap gap-2">
                                        {attachedFiles.map((file, idx) => (
                                            <div key={idx} className="flex items-center gap-1.5 bg-gray-100 rounded-lg px-2.5 py-1.5 text-xs text-gray-600 group">
                                                {file.type.startsWith("image/") ? (
                                                    <img
                                                        src={URL.createObjectURL(file)}
                                                        alt={file.name}
                                                        className="w-8 h-8 rounded object-cover"
                                                    />
                                                ) : (
                                                    <FileText className="w-3.5 h-3.5 text-gray-400" />
                                                )}
                                                <span className="max-w-[120px] truncate">{file.name}</span>
                                                <span className="text-gray-400">{formatFileSize(file.size)}</span>
                                                <button
                                                    onClick={() => handleRemoveFile(idx)}
                                                    className="text-gray-400 hover:text-red-500 transition-colors ml-0.5"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="px-3 py-2 flex justify-between items-center border-t border-gray-50 bg-gray-50/50">
                                    <div className="flex items-center gap-1">
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*,.pdf,.doc,.docx,.txt"
                                            multiple
                                            onChange={handleFileSelect}
                                            className="hidden"
                                        />
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:text-gray-700 px-2 py-1.5 rounded-md hover:bg-gray-100 transition-colors"
                                            title="Attach image or file"
                                        >
                                            <Paperclip className="w-3.5 h-3.5" />
                                            <span className="hidden sm:inline">Attach</span>
                                        </button>
                                    </div>
                                    <button
                                        onClick={handleSendReply}
                                        disabled={sending || !replyText.trim()}
                                        className="flex items-center gap-1.5 bg-gray-900 text-white px-3.5 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Send className="w-3 h-3" /> Send</>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                            <InboxIcon className="w-5 h-5 text-gray-400" />
                        </div>
                        <p className="text-sm font-medium text-gray-900">No ticket selected</p>
                        <p className="text-xs text-gray-400 mt-0.5">Select a conversation from the left.</p>
                        <button
                            onClick={() => setShowCompose(true)}
                            className="mt-4 flex items-center gap-1.5 bg-gray-900 text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-gray-800 transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Compose New Email
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function InboxPage() {
    return (
        <Suspense fallback={
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
        }>
            <InboxContent />
        </Suspense>
    );
}
