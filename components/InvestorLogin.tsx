"use client";

import React, { useMemo, useState } from "react";
import type { InvestorPersona } from "../lib/questionnaire";

type InvestorLoginProps = {
  investors: InvestorPersona[];
  initialSlug?: string | null;
  onAuthenticated: (slug: string) => void;
};

const ANIMATION_GRID = Array.from({ length: 60 }, (_, index) => index);

const InvestorLogin: React.FC<InvestorLoginProps> = ({
  investors,
  onAuthenticated,
  initialSlug,
}) => {
  const firstSlug = useMemo(() => {
    if (
      initialSlug &&
      investors.some((investor) => investor.slug === initialSlug)
    ) {
      return initialSlug;
    }
    return investors[0]?.slug ?? "";
  }, [initialSlug, investors]);

  const [selectedSlug, setSelectedSlug] = useState(firstSlug);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "animating">("idle");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedSlug) {
      setError("Select an investor profile to continue.");
      return;
    }
    const profile = investors.find((investor) => investor.slug === selectedSlug);
    if (!profile) {
      setError("We couldn't find that investor profile.");
      return;
    }
    if (profile.pin !== pin.trim()) {
      setError("Incorrect PIN. Check your secure text and try again.");
      return;
    }
    setError("");
    setStatus("animating");
    setTimeout(() => {
      onAuthenticated(profile.slug);
    }, 1400);
  };

  if (!investors.length) {
    return (
      <div className="min-h-screen bg-[#050505] text-[#f6e1bd] flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-lg font-semibold">No investor profiles yet.</p>
          <p className="text-sm text-[#a3a3a3]">
            Add at least one investor to the questionnaire to enable login.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020202] text-[#f6e1bd] flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#050505] to-[#0f0f0f] opacity-80" />
      <div className="relative w-full max-w-md space-y-6 rounded-3xl border border-[#1f1f1f] bg-[#0b0b0b]/80 p-8 shadow-2xl">
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#cb6b1e]">
            Investor access
          </p>
          <h1 className="text-2xl font-semibold">Enter your PIN</h1>
          <p className="text-sm text-[#a3a3a3]">
            Choose your profile, enter the secure PIN we shared out-of-band, and
            the personalized view will unlock.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-2 text-sm">
            <span className="text-[#a3a3a3]">Select investor</span>
            <div className="relative">
              <select
                value={selectedSlug}
                onChange={(event) => setSelectedSlug(event.target.value)}
                className="w-full appearance-none rounded-xl border border-[#262626] bg-[#050505] px-4 py-3 pr-10 text-[#f6e1bd] focus:border-[#cb6b1e] focus:outline-none"
                disabled={status === "animating"}
              >
                {investors.map((investor) => (
                  <option key={investor.slug} value={investor.slug}>
                    {investor.name} &mdash; {investor.firm}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#6b6b6b]">
                v
              </span>
            </div>
          </label>

          <label className="block space-y-2 text-sm">
            <span className="text-[#a3a3a3]">PIN</span>
            <input
              type="password"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              placeholder="0000"
              className="w-full rounded-xl border border-[#262626] bg-[#050505] px-4 py-3 text-[#f6e1bd] focus:border-[#cb6b1e] focus:outline-none"
              inputMode="numeric"
              autoComplete="one-time-code"
              disabled={status === "animating"}
            />
          </label>

          {error && (
            <p className="text-xs text-[#f87171]" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={status === "animating"}
            className="w-full rounded-xl bg-[#cb6b1e] py-3 text-sm font-semibold text-black transition-colors hover:bg-[#e37a2e] disabled:opacity-60"
          >
            {status === "animating" ? "Unlocking..." : "Unlock investor hub"}
          </button>
        </form>
      </div>

      {status === "animating" && (
        <div className="unlock-overlay pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/80" />
          <div className="relative z-10 flex flex-col items-center gap-6">
            <div className="grid grid-cols-10 gap-2">
              {ANIMATION_GRID.map((index) => (
                <span
                  key={index}
                  className="unlock-pixel"
                  style={{
                    animationDelay: `${(index % 10) * 0.04 + Math.floor(index / 10) * 0.08}s`,
                  }}
                />
              ))}
            </div>
            <p className="unlock-text text-sm font-mono tracking-[0.4em] text-[#cb6b1e]">
              ACCESS GRANTED
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvestorLogin;
