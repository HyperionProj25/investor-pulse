"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import BaselineLogo from "../components/BaselineLogo";
import AccessPortal from "../components/AccessPortal";
import { ADMIN_PERSONAS } from "../lib/adminUsers";
import { formatPitchDeckText } from "../lib/formatPitchDeckText";
import {
  BASELINE_UPDATE,
  buildContentFromQuestionnaire,
} from "../lib/questionnaire";
import { PitchDeckContent } from "../lib/pitchDeck";

const defaultContent = buildContentFromQuestionnaire(BASELINE_UPDATE);

type Countdown = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

const getTimeRemaining = (target: number): Countdown => {
  const targetTime = Number.isFinite(target) ? target : Date.now();
  const now = Date.now();
  const diff = targetTime - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return { days, hours, minutes, seconds };
};

const fallbackSnapshot = {
  label: "Snapshot pending",
  asOf: "TBD",
  facilities: 0,
  teams: 0,
  players: 0,
  events: 0,
  dataPoints: 0,
  highlights: [
    "Snapshot data will populate once the questionnaire is updated.",
  ],
};

export default function Home() {
  const searchParams = useSearchParams();
  const investorSlugFromParams = searchParams.get("investor");
  const [content, setContent] = useState(defaultContent);
  const [pitchDeck, setPitchDeck] = useState<PitchDeckContent | null>(null);
  const [authenticatedSlug, setAuthenticatedSlug] = useState<string | null>(
    null
  );
  const [checkingStoredInvestor, setCheckingStoredInvestor] = useState(true);
  const [bootstrapComplete, setBootstrapComplete] = useState(false);

  const initialTarget = Number.isFinite(defaultContent.metadata.launchTimestamp)
    ? defaultContent.metadata.launchTimestamp
    : Date.now();
  const [countdownTarget, setCountdownTarget] = useState(initialTarget);
  const [countdown, setCountdown] = useState<Countdown>(
    getTimeRemaining(initialTarget)
  );

  const { hero, metadata, funding, snapshots, investors } = content;
  const lastUpdated = metadata.lastUpdatedDisplay;

  const pitchDeckPersona = useMemo(() => {
    const fromPayload = investors.find((inv) => inv.slug === "pre-pitch-deck");
    if (fromPayload) {
      return fromPayload;
    }
    return BASELINE_UPDATE.investors.find(
      (inv) => inv.slug === "pre-pitch-deck"
    ) ?? null;
  }, [investors]);
  const investorProfiles = useMemo(
    () => investors.filter((inv) => inv.slug !== "pre-pitch-deck"),
    [investors]
  );
  const activeInvestor =
    investorProfiles.find((inv) => inv.slug === authenticatedSlug) ?? null;

  const latestSnapshot =
    snapshots[snapshots.length - 1] ?? snapshots[0] ?? fallbackSnapshot;

  useEffect(() => {
    const loadState = async () => {
      try {
        const response = await fetch("/api/site-state");
        if (!response.ok) {
          throw new Error("Failed to load site state");
        }
        const data = await response.json();
        if (data?.payload) {
          setContent(buildContentFromQuestionnaire(data.payload));
        }
      } catch (error) {
        console.error("Unable to fetch site state", error);
      }
    };
    loadState();
  }, []);

  useEffect(() => {
    const loadDeck = async () => {
      try {
        const response = await fetch("/api/pitch-deck");
        if (!response.ok) {
          throw new Error("Failed to load pitch deck");
        }
        const data = await response.json();
        if (data?.payload) {
          setPitchDeck(data.payload);
        }
      } catch (error) {
        console.error("Unable to fetch pitch deck", error);
      }
    };
    loadDeck();
  }, []);

  useEffect(() => {
    const fallbackTarget = Number.isFinite(metadata.launchTimestamp)
      ? metadata.launchTimestamp
      : Date.now();
    const deckTarget = pitchDeck?.countdown?.targetDate
      ? Date.parse(pitchDeck.countdown.targetDate)
      : NaN;
    setCountdownTarget(Number.isNaN(deckTarget) ? fallbackTarget : deckTarget);
  }, [pitchDeck?.countdown?.targetDate, metadata.launchTimestamp]);

  useEffect(() => {
    setCountdown(getTimeRemaining(countdownTarget));
    const interval = setInterval(() => {
      setCountdown(getTimeRemaining(countdownTarget));
    }, 1000);

    return () => clearInterval(interval);
  }, [countdownTarget]);

  useEffect(() => {
    if (!investorProfiles.length) {
      setCheckingStoredInvestor(false);
      return;
    }
    if (bootstrapComplete) {
      return;
    }

    if (
      investorSlugFromParams &&
      investorProfiles.some((inv) => inv.slug === investorSlugFromParams)
    ) {
      setAuthenticatedSlug(investorSlugFromParams);
      setBootstrapComplete(true);
      setCheckingStoredInvestor(false);
      return;
    }

    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("baseline-investor-slug");
      if (stored && investorProfiles.some((inv) => inv.slug === stored)) {
        setAuthenticatedSlug(stored);
        setBootstrapComplete(true);
        setCheckingStoredInvestor(false);
        return;
      }
    }

    setBootstrapComplete(true);
    setCheckingStoredInvestor(false);
  }, [investorSlugFromParams, investorProfiles, bootstrapComplete]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const isValid =
      authenticatedSlug &&
      investorProfiles.some((inv) => inv.slug === authenticatedSlug);
    const url = new URL(window.location.href);
    if (isValid && authenticatedSlug) {
      window.localStorage.setItem("baseline-investor-slug", authenticatedSlug);
      url.searchParams.set("investor", authenticatedSlug);
    } else {
      window.localStorage.removeItem("baseline-investor-slug");
      url.searchParams.delete("investor");
    }
    window.history.replaceState({}, "", url.toString());
  }, [authenticatedSlug, investorProfiles]);

  const heroTitleHtml = formatPitchDeckText(
    pitchDeck?.title ||
      `# ${hero.h1Lead} ${hero.h1Accent} ${hero.h1Trail}`.trim()
  );
  const heroTaglineHtml = formatPitchDeckText(
    pitchDeck?.tagline || hero.mission
  );
  const countdownLabel =
    pitchDeck?.countdown?.label || metadata.milestoneLabel;

  const fundingSummary = [
    { label: "Round type", value: funding.roundType },
    {
      label: "Target raise",
      value: `$${funding.target.toLocaleString()}`,
    },
    {
      label: "Committed",
      value: `$${funding.committed.toLocaleString()}`,
    },
    { label: "Min check", value: funding.minCheck },
  ];

  const snapshotMetrics = [
    { label: "Facilities", value: latestSnapshot.facilities },
    { label: "Teams", value: latestSnapshot.teams },
    {
      label: "Players tracked",
      value: latestSnapshot.players.toLocaleString(),
    },
    {
      label: "Data points collected",
      value: latestSnapshot.dataPoints.toLocaleString(),
    },
  ];

  const handleLogout = () => {
    setAuthenticatedSlug(null);
  };

  const handleInvestorAuthenticated = (slug: string) => {
    setAuthenticatedSlug(slug);
  };

  if (!activeInvestor) {
    if (checkingStoredInvestor) {
      return (
        <div className="min-h-screen bg-[#050505] text-[#f6e1bd] flex items-center justify-center">
          <p className="text-sm text-[#a3a3a3]">Loading secure access…</p>
        </div>
      );
    }

    return (
      <AccessPortal
        investors={investorProfiles}
        adminUsers={ADMIN_PERSONAS}
        pitchDeckPersona={pitchDeckPersona}
        initialInvestorSlug={investorSlugFromParams}
        onInvestorAuthenticated={handleInvestorAuthenticated}
      />
    );
  }

  const scrollToSection = (id: string) => {
    if (typeof document === "undefined") {
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#f6e1bd]">
      <nav className="sticky top-0 z-50 bg-[#0A0A0A]/90 backdrop-blur border-b border-[#262626]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#141414] border border-[#262626]">
              <BaselineLogo size="w-7 h-7" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-wide">
                Baseline
              </span>
              <span className="text-xs text-[#a3a3a3]">Investor Pulse</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <button
              onClick={() => scrollToSection("overview")}
              className="hidden md:inline-flex hover:text-[#cb6b1e] transition-colors"
            >
              Overview
            </button>
            <button
              onClick={() => scrollToSection("snapshot")}
              className="hidden md:inline-flex hover:text-[#cb6b1e] transition-colors"
            >
              Snapshot
            </button>
            <a
              href="/updateschedule.html"
              className="hidden md:inline-flex hover:text-[#cb6b1e] transition-colors"
            >
              Update schedule
            </a>
            <div className="hidden sm:flex items-center gap-2 text-[11px] text-[#a3a3a3]">
              <span>
                Logged in as{" "}
                <span className="text-[#f6e1bd] font-semibold">
                  {activeInvestor.name}
                </span>
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center rounded-lg border border-[#262626] px-3 py-1 text-xs hover:text-[#f6e1bd]"
            >
              Log out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">
        <section
          id="overview"
          className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start"
        >
          <div className="space-y-6">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#141414] border border-[#262626] text-[10px] font-semibold uppercase tracking-[0.15em] text-[#cb6b1e]">
              {hero.kicker}
            </div>
            <div className="space-y-4 text-left">
              <div
                className="pitch-title space-y-4"
                dangerouslySetInnerHTML={{ __html: heroTitleHtml }}
              />
              <div
                className="text-sm md:text-base text-[#d4d4d4] leading-relaxed space-y-2"
                dangerouslySetInnerHTML={{ __html: heroTaglineHtml }}
              />
              <p className="text-xs text-[#737373]">{hero.descriptor}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#141414] border border-[#262626] rounded-xl p-4">
                <p className="text-[11px] text-[#a3a3a3] mb-1">Current round</p>
                <p className="text-xl font-semibold text-[#cb6b1e]">
                  {funding.roundType}
                </p>
                <p className="text-[11px] text-[#737373] mt-1">
                  {funding.useOfFunds}
                </p>
              </div>
              <div className="bg-[#141414] border border-[#262626] rounded-xl p-4">
                <p className="text-[11px] text-[#a3a3a3] mb-1">Last updated</p>
                <p className="text-xl font-semibold">{lastUpdated}</p>
                <p className="text-[11px] text-[#737373] mt-1">
                  Personalized investor feeds refresh as soon as data changes.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {fundingSummary.map((item) => (
                <div
                  key={item.label}
                  className="bg-[#141414] border border-[#262626] rounded-xl p-4"
                >
                  <p className="text-[10px] text-[#a3a3a3] mb-1">
                    {item.label}
                  </p>
                  <p className="text-sm font-semibold">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#cb6b1e]/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-[#141414] rounded-full blur-3xl pointer-events-none" />

            <div className="relative bg-[#141414] border border-[#262626] rounded-2xl p-6 space-y-6 shadow-xl">
              <h2 className="text-sm font-semibold text-[#f6e1bd] mb-1">
                Countdown to {countdownLabel}
              </h2>
              <p className="text-[11px] text-[#a3a3a3] mb-4">
                Pulls from the shared pitch deck milestone.
              </p>
              <div className="flex justify-between items-center gap-4">
                {[
                  { label: "Days", value: countdown.days },
                  { label: "Hours", value: countdown.hours },
                  { label: "Minutes", value: countdown.minutes },
                  { label: "Seconds", value: countdown.seconds },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex-1 bg-[#0f0f0f] border border-[#262626] rounded-lg py-3 text-center"
                  >
                    <div className="text-2xl font-mono font-semibold">
                      {String(item.value).padStart(2, "0")}
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.16em] text-[#a3a3a3] mt-1">
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          id="snapshot"
          className="bg-[#141414] border border-[#262626] rounded-2xl p-6 space-y-5"
        >
          <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Latest investor snapshot</h2>
              <p className="text-xs text-[#a3a3a3] mt-1">
                {latestSnapshot.label} &middot; as of {latestSnapshot.asOf}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border border-[#262626] bg-[#0f0f0f] text-[#a3a3a3]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
              Live internal view
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {snapshotMetrics.map((metric) => (
              <div
                key={metric.label}
                className="bg-[#0f0f0f] border border-[#262626] rounded-lg p-3"
              >
                <p className="text-[10px] text-[#a3a3a3] mb-1">
                  {metric.label}
                </p>
                <p className="text-xl font-semibold">{metric.value}</p>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.16em] text-[#a3a3a3]">
              Highlights
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-[#d4d4d4]">
              {latestSnapshot.highlights.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        </section>

        <footer className="pt-4 pb-10 text-[11px] text-[#737373] flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-t border-[#262626]">
          <span>Baseline / Investor Pulse</span>
          <span>Built for private investor updates, not public marketing.</span>
        </footer>
      </main>
    </div>
  );
}
