"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
    Search,
    Send,
    Loader2,
    ArrowLeft,
    X,
    FileText,
} from "lucide-react";
import clsx from "clsx";

interface Attachment {
    id: string;
    filename: string;
    content_type: string;
    size: number;
}

interface TicketContext {
    id: string;
    subject: string;
    customer_email: string;
    mailbox: string;
    status: string;
}

interface SentMessage {
    id: string;
    sender_name: string;
    body_text: string;
    direction: string;
    sent_at: string;
    attachments?: Attachment[];
    ticket: TicketContext;
}

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

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

export default function SentPage() {
    const [messages, setMessages] = useState<SentMessage[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchFocused, setSearchFocused] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const fetchSent = useCallback(async () => {
        try {
            const res = await fetch("/api/tickets/sent");
            if (!res.ok) return;
            const data = await res.json();
            setMessages(data);
            if (data.length > 0 && !selectedId) {
                setSelectedId(data[0].id);
            }
        } catch (err) {
            console.error("Failed to fetch sent messages:", err);
        } finally {
            setLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        fetchSent();
    }, [fetchSent]);

    // Filter messages based on search query
    const filtered = searchQuery.trim()
        ? messages.filter((m) => {
            const q = searchQuery.toLowerCase();
            return (
                m.ticket.customer_email.toLowerCase().includes(q) ||
                m.ticket.subject.toLowerCase().includes(q) ||
                m.body_text.toLowerCase().includes(q) ||
                m.sender_name.toLowerCase().includes(q)
            );
        })
        : messages;

    const selectedMessage = messages.find((m) => m.id === selectedId);

    const handleBackToList = () => {
        setSelectedId(null);
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="flex-1 flex h-full overflow-hidden">
            {/* Sent List — full width mobile, fixed 340px desktop */}
            <div
                className={clsx(
                    "border-r border-gray-100 bg-white flex flex-col shrink-0",
                    "w-full md:w-[340px]",
                    selectedId ? "hidden md:flex" : "flex"
                )}
            >
                <div className="px-4 py-3 border-b border-gray-100">
                    <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                            <Send className="w-4 h-4 text-gray-500" />
                            <h2 className="font-semibold text-sm text-gray-900">Sent</h2>
                        </div>
                    </div>
                    <span className="text-[11px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                        {filtered.length} email{filtered.length !== 1 ? "s" : ""}
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
                            placeholder="Search sent emails..."
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
                    {filtered.map((msg) => {
                        const isSelected = msg.id === selectedId;
                        return (
                            <div
                                key={msg.id}
                                onClick={() => setSelectedId(msg.id)}
                                className={clsx(
                                    "px-4 py-3 border-b border-gray-50 cursor-pointer transition-colors",
                                    isSelected ? "bg-blue-50/50" : "hover:bg-gray-50"
                                )}
                            >
                                <div className="flex justify-between items-start mb-0.5">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-5 h-5 rounded-full bg-gray-900 flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                                            <Send className="w-2.5 h-2.5" />
                                        </div>
                                        <span className={clsx("font-medium text-[13px] truncate", isSelected ? "text-gray-900" : "text-gray-700")}>
                                            To: {msg.ticket.customer_email}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">
                                        {timeAgo(msg.sent_at)}
                                    </span>
                                </div>
                                <h3 className={clsx("text-[13px] font-medium mb-0.5 truncate pl-7", isSelected ? "text-gray-800" : "text-gray-600")}>
                                    {msg.ticket.subject}
                                </h3>
                                <p className="text-xs text-gray-400 line-clamp-1 pl-7">
                                    {msg.body_text.slice(0, 120)}
                                </p>
                                <div className="flex items-center gap-1.5 mt-1.5 pl-7">
                                    {msg.ticket.mailbox && (
                                        <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded truncate max-w-[140px]">
                                            from {msg.ticket.mailbox.split("@")[0]}
                                        </span>
                                    )}
                                    {msg.attachments && msg.attachments.length > 0 && (
                                        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                            <FileText className="w-2.5 h-2.5" />
                                            {msg.attachments.length}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {filtered.length === 0 && (
                        <div className="p-8 text-center">
                            <p className="text-gray-400 text-xs">
                                {searchQuery ? "No sent emails match your search." : "No sent emails yet."}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Message Detail — full screen on mobile when selected */}
            <div
                className={clsx(
                    "flex-1 flex flex-col bg-white min-w-0",
                    selectedId ? "flex" : "hidden md:flex"
                )}
            >
                {selectedMessage ? (
                    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in" key={selectedMessage.id}>
                        {/* Header */}
                        <div className="px-4 md:px-5 py-3 md:py-4 border-b border-gray-100">
                            <div className="flex items-center gap-2 mb-2">
                                <button
                                    onClick={handleBackToList}
                                    className="md:hidden p-1 -ml-1 text-gray-500 hover:text-gray-700 rounded-md"
                                    aria-label="Back to list"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                </button>
                                <h2 className="text-sm md:text-base font-semibold text-gray-900 truncate">
                                    {selectedMessage.ticket.subject}
                                </h2>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                                    <Send className="w-3 h-3" />
                                    Sent
                                </span>
                                <span className="text-[11px] text-gray-400">
                                    {formatDate(selectedMessage.sent_at)}
                                </span>
                            </div>
                        </div>

                        {/* Meta info */}
                        <div className="px-4 md:px-5 py-3 border-b border-gray-100 space-y-1.5">
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-medium text-gray-400 w-10 shrink-0">From</span>
                                <span className="text-[13px] text-gray-700">
                                    {selectedMessage.ticket.mailbox || selectedMessage.sender_name}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-medium text-gray-400 w-10 shrink-0">To</span>
                                <span className="text-[13px] text-gray-700">
                                    {selectedMessage.ticket.customer_email}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-medium text-gray-400 w-10 shrink-0">Re</span>
                                <span className="text-[13px] text-gray-600">
                                    {selectedMessage.ticket.subject}
                                </span>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto px-4 md:px-5 py-4">
                            <div className="text-[13px] text-gray-800 leading-relaxed whitespace-pre-wrap">
                                {selectedMessage.body_text}
                            </div>

                            {/* Attachments */}
                            {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-gray-100">
                                    <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                        Attachments
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedMessage.attachments.map((att) => (
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
                                </div>
                            )}
                        </div>

                        {/* Footer — link to full ticket thread */}
                        <div className="px-4 md:px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                            <a
                                href={`/inbox?ticket=${selectedMessage.ticket.id}`}
                                className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 px-2.5 py-1.5 rounded-md transition-colors"
                            >
                                View full thread →
                            </a>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                            <Send className="w-5 h-5 text-gray-400" />
                        </div>
                        <p className="text-sm font-medium text-gray-900">No email selected</p>
                        <p className="text-xs text-gray-400 mt-0.5">Select a sent email from the left.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
