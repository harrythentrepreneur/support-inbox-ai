"use client";

import { useState, useEffect } from "react";
import {
    Mail,
    Sparkles,
    Database,
    Loader2,
    CheckCircle2,
    XCircle,
    Server,
    BarChart3,
    Shield,
} from "lucide-react";

interface EmailAccount {
    email: string;
    host: string;
    imapPort: number;
    smtpPort: number;
}

interface SettingsData {
    emailAccounts: EmailAccount[];
    ai: {
        configured: boolean;
        keyPreview: string;
        model: string;
    };
    stats: {
        tickets: number;
        messages: number;
        issues: number;
    };
}

export default function SettingsPage() {
    const [settings, setSettings] = useState<SettingsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchSettings() {
            try {
                const res = await fetch("/api/settings");
                if (!res.ok) throw new Error("Failed to load settings");
                const data = await res.json();
                setSettings(data);
            } catch (err) {
                console.error("Settings fetch error:", err);
                setError("Could not load settings. Please try again.");
            } finally {
                setLoading(false);
            }
        }
        fetchSettings();
    }, []);

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
            {/* Header */}
            <div className="px-4 md:px-5 py-3 md:py-4 border-b border-gray-100 shrink-0">
                <h1 className="text-sm md:text-base font-semibold text-gray-900">Settings</h1>
                <p className="text-xs text-gray-400 mt-0.5">
                    Manage your workspace configuration
                </p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-2xl mx-auto px-4 md:px-5 py-5 md:py-6 space-y-5">

                    {/* Workspace Stats */}
                    <section>
                        <div className="flex items-center gap-1.5 mb-3">
                            <BarChart3 className="w-3.5 h-3.5 text-gray-400" />
                            <h2 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                                Workspace Overview
                            </h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {[
                                { label: "Tickets", value: settings?.stats.tickets ?? 0 },
                                { label: "Messages", value: settings?.stats.messages ?? 0 },
                                { label: "Issues", value: settings?.stats.issues ?? 0 },
                            ].map((stat) => (
                                <div
                                    key={stat.label}
                                    className="bg-gray-50 border border-gray-200/60 rounded-xl p-4 text-center"
                                >
                                    <p className="text-2xl font-semibold text-gray-900 tabular-nums">
                                        {stat.value.toLocaleString()}
                                    </p>
                                    <p className="text-[11px] font-medium text-gray-400 mt-0.5">
                                        {stat.label}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Email Accounts */}
                    <section>
                        <div className="flex items-center gap-1.5 mb-3">
                            <Mail className="w-3.5 h-3.5 text-gray-400" />
                            <h2 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                                Connected Email Accounts
                            </h2>
                        </div>
                        <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
                            {settings?.emailAccounts.length ? (
                                settings.emailAccounts.map((account) => (
                                    <div
                                        key={account.email}
                                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-4 py-3.5 bg-white hover:bg-gray-50/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                                                <Mail className="w-4 h-4 text-blue-500" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[13px] font-medium text-gray-800 truncate">
                                                    {account.email}
                                                </p>
                                                <p className="text-[11px] text-gray-400">
                                                    {account.host} · IMAP {account.imapPort} · SMTP {account.smtpPort}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md shrink-0">
                                            <CheckCircle2 className="w-3 h-3" />
                                            Connected
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <div className="px-4 py-6 text-center">
                                    <p className="text-xs text-gray-400">
                                        No email accounts configured. Add credentials to your .env file.
                                    </p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* AI Configuration */}
                    <section>
                        <div className="flex items-center gap-1.5 mb-3">
                            <Sparkles className="w-3.5 h-3.5 text-gray-400" />
                            <h2 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                                AI Configuration
                            </h2>
                        </div>
                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-4 py-3.5 bg-white">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                                        <Sparkles className="w-4 h-4 text-violet-500" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[13px] font-medium text-gray-800">
                                            OpenAI API
                                        </p>
                                        <p className="text-[11px] text-gray-400 font-mono">
                                            {settings?.ai.keyPreview}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 ml-11 sm:ml-0">
                                    <span className="text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                                        {settings?.ai.model}
                                    </span>
                                    {settings?.ai.configured ? (
                                        <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                                            <CheckCircle2 className="w-3 h-3" />
                                            Active
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-[11px] font-medium text-red-500 bg-red-50 px-2 py-1 rounded-md">
                                            <XCircle className="w-3 h-3" />
                                            Missing
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Database */}
                    <section>
                        <div className="flex items-center gap-1.5 mb-3">
                            <Database className="w-3.5 h-3.5 text-gray-400" />
                            <h2 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                                Database
                            </h2>
                        </div>
                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3.5 bg-white">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center shrink-0">
                                        <Server className="w-4 h-4 text-cyan-500" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[13px] font-medium text-gray-800">
                                            PostgreSQL (Neon)
                                        </p>
                                        <p className="text-[11px] text-gray-400">
                                            Managed serverless Postgres
                                        </p>
                                    </div>
                                </div>
                                <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md shrink-0">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Connected
                                </span>
                            </div>
                        </div>
                    </section>

                    {/* Environment Info */}
                    <section>
                        <div className="flex items-center gap-1.5 mb-3">
                            <Shield className="w-3.5 h-3.5 text-gray-400" />
                            <h2 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                                Environment
                            </h2>
                        </div>
                        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white divide-y divide-gray-100">
                            {[
                                { label: "Runtime", value: "Next.js 16" },
                                { label: "ORM", value: "Prisma 6" },
                                { label: "Node.js", value: typeof process !== "undefined" ? process.version || "—" : "—" },
                            ].map((item) => (
                                <div
                                    key={item.label}
                                    className="flex items-center justify-between px-4 py-2.5"
                                >
                                    <span className="text-[13px] text-gray-500">{item.label}</span>
                                    <span className="text-[13px] font-medium text-gray-800 font-mono">
                                        {item.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </section>

                </div>
            </div>
        </div>
    );
}
