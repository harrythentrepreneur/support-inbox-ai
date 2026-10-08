"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";

const STATUSES = [
    { label: "Open", dotClass: "status-dot-open" },
    { label: "Pending", dotClass: "status-dot-pending" },
    { label: "On Hold", dotClass: "status-dot-onhold" },
    { label: "Solved", dotClass: "status-dot-solved" },
    { label: "Spam", dotClass: "status-dot-spam" },
];

interface TicketStatusDropdownProps {
    status: string;
    onChange: (newStatus: string) => void;
}

export default function TicketStatusDropdown({ status, onChange }: TicketStatusDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const current = STATUSES.find((s) => s.label === status) || STATUSES[0];

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md border border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors"
            >
                <span className={clsx("status-dot", current.dotClass)} style={{ width: 6, height: 6 }} />
                {status}
                <ChevronDown className={clsx("w-3 h-3 text-gray-400 transition-transform", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg border border-gray-200 shadow-lg py-1 z-50 animate-slide-down">
                    {STATUSES.map((s) => (
                        <button
                            key={s.label}
                            onClick={() => { onChange(s.label); setIsOpen(false); }}
                            className={clsx(
                                "w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-left transition-colors",
                                s.label === status ? "bg-gray-50 text-gray-900" : "text-gray-600 hover:bg-gray-50"
                            )}
                        >
                            <span className={clsx("status-dot", s.dotClass)} style={{ width: 6, height: 6 }} />
                            {s.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
