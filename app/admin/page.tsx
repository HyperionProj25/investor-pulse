"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ADMIN_SLUGS } from "@/lib/adminUsers";

export default function AdminHubPage() {
  const router = useRouter();
  const [sessionChecked, setSessionChecked] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const verifySession = async () => {
      try {
        const response = await fetch("/api/auth/session");
        if (!response.ok) {
          router.push("/?mode=admin");
          return;
        }
        const data = await response.json();
        if (data.role === "admin" && ADMIN_SLUGS.includes(data.slug)) {
          setAuthorized(true);
        } else {
          router.push("/?mode=admin");
        }
      } catch (err) {
        console.error("Session verification failed:", err);
        router.push("/?mode=admin");
      } finally {
        setSessionChecked(true);
      }
    };
    void verifySession();
  }, [router]);

  if (!sessionChecked) {
    return (
      <div className="min-h-screen bg-[#020202] text-[#f6e1bd] flex items-center justify-center">
        <p className="text-sm text-[#a3a3a3]">Loading...</p>
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#020202] text-[#f6e1bd]">
      {/* Header */}
      <header className="border-b border-[#1f1f1f] bg-[#060606]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-[#cb6b1e]">
                Admin Portal
              </p>
              <p className="text-xs text-[#a3a3a3]">Baseline Analytics</p>
            </div>
            <Link
              href="/"
              className="text-xs text-[#a3a3a3] underline-offset-4 hover:underline"
            >
              ← Back to Investor Pulse
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-semibold mb-2">Admin Hub</h1>
          <p className="text-[#a3a3a3]">Choose where you want to go</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Investor Pulse Card */}
          <Link
            href="/admin/investor-pulse"
            className="group relative rounded-2xl border border-[#262626] bg-[#0a0a0a] p-8 transition-all hover:border-[#cb6b1e]/50 hover:bg-[#0f0f0f]"
          >
            <div className="absolute top-4 right-4 text-[#cb6b1e] opacity-0 group-hover:opacity-100 transition-opacity">
              →
            </div>
            <div className="mb-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#cb6b1e]/10 text-[#cb6b1e]">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-semibold mb-2">Investor Pulse</h2>
            <p className="text-sm text-[#a3a3a3] mb-4">
              Manage investor content, pitch deck, funding progress, and the
              public-facing dashboard.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-[#1a1a1a] px-3 py-1 text-xs text-[#737373]">
                Update Site
              </span>
              <span className="rounded-full bg-[#1a1a1a] px-3 py-1 text-xs text-[#737373]">
                Investors
              </span>
              <span className="rounded-full bg-[#1a1a1a] px-3 py-1 text-xs text-[#737373]">
                Pitch Deck
              </span>
              <span className="rounded-full bg-[#1a1a1a] px-3 py-1 text-xs text-[#737373]">
                Schedule
              </span>
            </div>
          </Link>

          {/* Biz Dev Card */}
          <Link
            href="/admin/biz-dev"
            className="group relative rounded-2xl border border-[#262626] bg-[#0a0a0a] p-8 transition-all hover:border-[#cb6b1e]/50 hover:bg-[#0f0f0f]"
          >
            <div className="absolute top-4 right-4 text-[#cb6b1e] opacity-0 group-hover:opacity-100 transition-opacity">
              →
            </div>
            <div className="mb-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#cb6b1e]/10 text-[#cb6b1e]">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-semibold mb-2">Biz Dev</h2>
            <p className="text-sm text-[#a3a3a3] mb-4">
              Business Operating System. Vision, strategy, quarterly levers, and
              execution tracking.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-[#1a1a1a] px-3 py-1 text-xs text-[#737373]">
                North Star
              </span>
              <span className="rounded-full bg-[#1a1a1a] px-3 py-1 text-xs text-[#737373]">
                Quarterly
              </span>
              <span className="rounded-full bg-[#1a1a1a] px-3 py-1 text-xs text-[#737373]">
                Experiments
              </span>
              <span className="rounded-full bg-[#1a1a1a] px-3 py-1 text-xs text-[#737373]">
                System Map
              </span>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
