"use client";

import { useState, useEffect, FormEvent } from "react";
import {
  ArrowRight,
  Inbox,
  Sparkles,
  Shield,
  CheckCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check if user has an auth cookie (client-readable check)  1
  useEffect(() => {
    fetch("/api/tickets", { method: "HEAD" }).then((res) => {
      setIsLoggedIn(res.ok);
    }).catch(() => setIsLoggedIn(false));
  }, []);

  const handleWaitlist = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setStatus("success");
        setEmail("");
      } else {
        const data = await res.json();
        setErrorMessage(data.error || "Something went wrong");
        setStatus("error");
      }
    } catch {
      setErrorMessage("Something went wrong. Please try again.");
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Nav */}
      <header className="relative z-10 w-full px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center">
            <span className="text-white font-semibold text-sm">S</span>
          </div>
          <span className="font-semibold text-[15px] text-gray-900 tracking-tight">
            Support Inbox
          </span>
        </div>
        {isLoggedIn ? (
          <a
            href="/inbox"
            className="flex items-center gap-1.5 text-[13px] font-medium text-white bg-gray-900 hover:bg-gray-800 px-4 py-2 rounded-lg transition-colors"
          >
            Go to Inbox
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        ) : (
          <a
            href="/login"
            className="text-[13px] font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg transition-colors"
          >
            Log in
          </a>
        )}
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 -mt-16">
        <div className="max-w-xl w-full text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full mb-6 uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-gray-400" />
            AI-Powered Support
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight leading-[1.1] mb-4">
            Your support inbox,
            <br />
            <span className="text-gray-400">made intelligent.</span>
          </h1>

          {/* Subheadline */}
          <p className="text-base sm:text-lg text-gray-500 leading-relaxed mb-10 max-w-md mx-auto">
            AI-powered email triage, smart replies, and automatic issue extraction — all in one clean inbox.
          </p>

          {/* Waitlist Form */}
          <div className="max-w-sm mx-auto mb-12">
            {status === "success" ? (
              <div className="flex items-center gap-2.5 justify-center text-sm font-medium text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl px-5 py-4 animate-fade-in">
                <CheckCircle className="w-4 h-4 shrink-0" />
                You&apos;re on the list! We&apos;ll be in touch.
              </div>
            ) : (
              <form onSubmit={handleWaitlist} className="space-y-3">
                {status === "error" && (
                  <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5 animate-fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {errorMessage}
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    id="waitlist-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    className="flex-1 px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all placeholder:text-gray-400"
                  />
                  <button
                    type="submit"
                    disabled={status === "loading" || !email.trim()}
                    className="flex items-center justify-center gap-2 bg-gray-900 text-white px-5 py-3 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {status === "loading" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Join Waitlist
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Feature Pills */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              { icon: Inbox, label: "Smart Triage" },
              { icon: Sparkles, label: "AI Replies" },
              { icon: Shield, label: "Issue Detection" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2 text-[12px] font-medium text-gray-500 bg-gray-50 border border-gray-100 px-3.5 py-2 rounded-lg"
              >
                <item.icon className="w-3.5 h-3.5 text-gray-400" />
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full px-6 py-5 text-center">
        <p className="text-[11px] text-gray-400">
          © {new Date().getFullYear()} Support Inbox. Built for modern support teams.
        </p>
      </footer>
    </div>
  );
}
