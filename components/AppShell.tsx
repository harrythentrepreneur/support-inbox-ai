"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import Sidebar from "@/components/Sidebar";

// Pages that should NOT show the sidebar
const NO_SIDEBAR_PATHS = ["/", "/login"];

export default function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const showSidebar = !NO_SIDEBAR_PATHS.includes(pathname);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    if (!showSidebar) {
        return <>{children}</>;
    }

    return (
        <div className="flex flex-col md:flex-row h-full">
            {/* Mobile top bar */}
            <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white shrink-0">
                <button
                    onClick={() => setSidebarOpen(true)}
                    className="p-1.5 -ml-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                    aria-label="Open menu"
                >
                    <Menu className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-gray-900 flex items-center justify-center">
                        <span className="text-white font-semibold text-[10px]">S</span>
                    </div>
                    <span className="font-semibold text-sm text-gray-900 tracking-tight">
                        Support Inbox
                    </span>
                </div>
                {/* Spacer to balance hamburger */}
                <div className="w-8" />
            </div>

            <Sidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {children}
            </main>
        </div>
    );
}
