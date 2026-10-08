"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    Kanban,
    Settings,
    AlertCircle,
    ShieldX,
    Clock,
    CheckCircle2,
    InboxIcon,
    MessageSquareWarning,
    LogOut,
    X,
    Send,
} from "lucide-react";
import clsx from "clsx";

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [counts, setCounts] = useState<Record<string, number>>({});

    useEffect(() => {
        let cancelled = false;
        const doFetch = async () => {
            try {
                const res = await fetch("/api/tickets/counts");
                if (res.ok && !cancelled) {
                    const data = await res.json();
                    setCounts(data);
                }
            } catch (err) {
                console.error("Failed to fetch ticket counts:", err);
            }
        };
        doFetch();
        const interval = setInterval(doFetch, 30000);
        return () => { cancelled = true; clearInterval(interval); };
    }, []);

    const primaryNav = [
        { name: "Inbox", href: "/inbox", icon: InboxIcon },
        { name: "Sent", href: "/sent", icon: Send },
        { name: "Issues", href: "/issues", icon: Kanban },
    ];

    const inboxQueues = [
        { name: "Open", status: "Open", href: "/inbox?queue=open", icon: MessageSquareWarning, dotClass: "status-dot-open" },
        { name: "Pending", status: "Pending", href: "/inbox?queue=pending", icon: Clock, dotClass: "status-dot-pending" },
        { name: "On Hold", status: "On Hold", href: "/inbox?queue=onhold", icon: AlertCircle, dotClass: "status-dot-onhold" },
        { name: "Solved", status: "Solved", href: "/inbox?queue=solved", icon: CheckCircle2, dotClass: "status-dot-solved" },
        { name: "Spam", status: "Spam", href: "/inbox?queue=spam", icon: ShieldX, dotClass: "status-dot-spam" },
    ];

    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
    };

    const handleNavClick = () => {
        // Close sidebar on mobile after navigation
        onClose?.();
    };

    const sidebarContent = (
        <aside className="w-[240px] border-r border-gray-100 bg-gray-50/60 flex flex-col shrink-0 h-full">
            {/* Brand */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-gray-900 flex items-center justify-center">
                        <span className="text-white font-semibold text-xs">S</span>
                    </div>
                    <span className="font-semibold text-sm text-gray-900 tracking-tight">Support Inbox</span>
                </div>
                {/* Close button — mobile only */}
                {onClose && (
                    <button
                        onClick={onClose}
                        className="md:hidden p-1 text-gray-400 hover:text-gray-600 rounded-md"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Nav */}
            <div className="flex-1 overflow-y-auto">
                <nav className="p-2 space-y-0.5">
                    {primaryNav.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={handleNavClick}
                                className={clsx(
                                    "flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium rounded-lg transition-colors",
                                    isActive
                                        ? "bg-gray-200/70 text-gray-900"
                                        : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                                )}
                            >
                                <item.icon className="w-4 h-4" />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                {pathname.startsWith("/inbox") && (
                    <div className="px-2 pb-2">
                        <h2 className="px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 mt-3">
                            Queues
                        </h2>
                        <nav className="space-y-0.5">
                            {inboxQueues.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={handleNavClick}
                                    className="flex items-center gap-2.5 px-3 py-1.5 text-[13px] font-medium rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                                >
                                    <span className={clsx("status-dot", item.dotClass)} />
                                    <span className="flex-1 truncate">{item.name}</span>
                                    {(counts[item.status] || 0) > 0 && (
                                        <span className="text-[10px] font-semibold text-gray-400 bg-gray-200/80 px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                            {counts[item.status]}
                                        </span>
                                    )}
                                </Link>
                            ))}
                        </nav>
                    </div>
                )}
            </div>

            {/* Bottom */}
            <div className="p-2 border-t border-gray-100">
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-gray-100/80 mb-1">
                    <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-[10px] font-bold text-gray-600">
                        S
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700 truncate">Support Team</p>
                    </div>
                </div>
                <Link
                    href="/settings"
                    onClick={handleNavClick}
                    className="flex items-center gap-2.5 px-3 py-1.5 text-[13px] font-medium rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                >
                    <Settings className="w-3.5 h-3.5" />
                    Settings
                </Link>
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] font-medium rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                    <LogOut className="w-3.5 h-3.5" />
                    Log out
                </button>
            </div>
        </aside>
    );

    // Desktop: render inline as before
    // Mobile: render as overlay drawer (controlled by isOpen)
    return (
        <>
            {/* Desktop sidebar — always visible */}
            <div className="hidden md:flex h-full">
                {sidebarContent}
            </div>

            {/* Mobile sidebar — slide-out drawer */}
            {isOpen && (
                <div className="md:hidden fixed inset-0 z-50 flex">
                    {/* Overlay */}
                    <div
                        className="fixed inset-0 bg-black/30"
                        onClick={onClose}
                    />
                    {/* Drawer */}
                    <div className="relative z-10 animate-slide-in-left">
                        {sidebarContent}
                    </div>
                </div>
            )}
        </>
    );
}
