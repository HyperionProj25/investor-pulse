"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import BaselineLogo from "../components/BaselineLogo";
import AccessPortal from "../components/AccessPortal";
import BrainTrustAgreement from "../components/BrainTrustAgreement";
import DickheadCounter from "../components/DickheadCounter";
import {
  buildContentFromQuestionnaire,
  type DerivedContent,
  type QuestionnaireAnswers,
} from "../lib/questionnaire";
import { PitchDeckContent } from "../lib/pitchDeck";
import { DATABASE_ERRORS } from "../lib/errorMessages";
import { toast } from "react-hot-toast";

const EMPTY_ANSWERS: QuestionnaireAnswers = {
  hero: {
    kicker: "",
    h1Lead: "",
    h1Accent: "",
    h1Trail: "",
    mission: "",
    descriptor: "",
  },
  metadata: {
    lastUpdated: new Date().toISOString(),
    launchTarget: new Date().toISOString(),
    milestoneLabel: "",
  },
  funding: {
    roundType: "",
    target: 0,
    committed: 0,
    minCheck: "",
    closeDate: "",
    useOfFunds: "",
  },
  snapshots: [],
  tractionNarrative: "",
  investors: [],
  updatePrompts: [],
  mvpSnapshot: {
    title: "",
    ctaLabel: "",
    previous: {
      label: "",
      title: "",
      description: "",
      statusLabel: "",
    },
    next: {
      label: "",
      title: "",
      description: "",
      statusLabel: "",
    },
  },
};

const EMPTY_CONTENT = buildContentFromQuestionnaire(EMPTY_ANSWERS);
const EMPTY_LAUNCH_TARGET = Number.isFinite(EMPTY_CONTENT.metadata.launchTimestamp)
  ? EMPTY_CONTENT.metadata.launchTimestamp
  : Date.now();

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

const SkeletonBlock = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse rounded-lg bg-[#181818] ${className}`} />
);

const OverviewSkeleton = () => (
  <div
    className="space-y-6 animate-pulse"
    role="status"
    aria-live="polite"
    aria-label="Loading investor overview"
  >
    <SkeletonBlock className="h-4 w-32" />
    <SkeletonBlock className="h-10 w-3/4" />
    <SkeletonBlock className="h-24 w-full" />
    <div className="grid grid-cols-2 gap-4">
      <SkeletonBlock className="h-28" />
      <SkeletonBlock className="h-28" />
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[...Array(4)].map((_, idx) => (
        <SkeletonBlock key={idx} className="h-20" />
      ))}
    </div>
  </div>
);

const CountdownSkeleton = () => (
  <div
    className="space-y-4 animate-pulse"
    role="status"
    aria-live="polite"
    aria-label="Loading countdown"
  >
    <SkeletonBlock className="h-4 w-48" />
    <div className="grid grid-cols-4 gap-3">
      {[...Array(4)].map((_, idx) => (
        <SkeletonBlock key={idx} className="h-16" />
      ))}
    </div>
  </div>
);

function HomeContent() {
  const searchParams = useSearchParams();
  const investorSlugFromParams = searchParams.get("investor");
  const [content, setContent] = useState<DerivedContent>(EMPTY_CONTENT);
  const [pitchDeck, setPitchDeck] = useState<PitchDeckContent | null>(null);
  const [authenticatedSlug, setAuthenticatedSlug] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [siteLoading, setSiteLoading] = useState(true);
  const [siteError, setSiteError] = useState<string | null>(null);
  const [deckLoading, setDeckLoading] = useState(true);
  const [deckError, setDeckError] = useState<string | null>(null);
  const [countdownAnnouncement, setCountdownAnnouncement] = useState("");
  const [loadingAnnouncement, setLoadingAnnouncement] = useState("");
  const [progressAnimated, setProgressAnimated] = useState(false);

  // Public investor list for login dropdown (fetched without auth)
  const [publicInvestorList, setPublicInvestorList] = useState<
    Array<{ slug: string; name: string; firm: string; title: string }>
  >([]);

  const [countdownTarget, setCountdownTarget] = useState(EMPTY_LAUNCH_TARGET);
  const [countdown, setCountdown] = useState<Countdown>(
    getTimeRemaining(EMPTY_LAUNCH_TARGET)
  );

  // Dickhead Counter state
  const [isDickheadCounterOpen, setIsDickheadCounterOpen] = useState(false);

  // Brain Trust Agreement state
  const [hasAgreed, setHasAgreed] = useState<boolean | null>(null); // null = checking, true/false = known
  const [checkingAgreement, setCheckingAgreement] = useState(true);

  const { hero, metadata, funding, snapshots, investors, mvpSnapshot } = content;
  const lastUpdated = metadata.lastUpdatedDisplay;
  const heroHeadingSegments = [
    { text: hero.h1Lead, accent: false },
    { text: hero.h1Accent, accent: true },
    { text: hero.h1Trail, accent: false },
  ].filter((segment) => segment.text && segment.text.trim().length > 0);
  const displayHeroSegments =
    heroHeadingSegments.length > 0
      ? heroHeadingSegments
      : [{ text: "Baseline Analytics", accent: false }];
  const heroMissionText = hero.mission?.trim() ?? "";
  const heroDescriptorText = hero.descriptor?.trim() ?? "";

  const investorProfiles = useMemo(
    () => investors.filter((inv) => inv.slug !== "pre-pitch-deck"),
    [investors]
  );
  const activeInvestor =
    investorProfiles.find((inv) => inv.slug === authenticatedSlug) ?? null;

  // Check if current investor has reported today
  const hasReportedToday = useMemo(() => {
    if (!activeInvestor) return false;

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const storageKey = `dickhead-report-${activeInvestor.slug}`;
    const lastReportDate = localStorage.getItem(storageKey);

    return lastReportDate === today;
  }, [activeInvestor]);

  const latestSnapshot =
    snapshots[snapshots.length - 1] ?? snapshots[0] ?? fallbackSnapshot;

  // Use ecosystemStats if available, otherwise fall back to snapshot data
  const ecosystemStats = content.ecosystemStats;
  const organizations = Number.isFinite(ecosystemStats?.organizationsValue)
    ? ecosystemStats?.organizationsValue ?? 0
    : Number.isFinite(latestSnapshot.facilities)
    ? latestSnapshot.facilities
    : 0;
  const reports = Number.isFinite(ecosystemStats?.reportsValue)
    ? ecosystemStats?.reportsValue ?? 0
    : Number.isFinite(latestSnapshot.events)
    ? latestSnapshot.events
    : 0;
  const organizationsLabel = ecosystemStats?.organizationsLabel || "Organizations";
  const organizationsSubtext = ecosystemStats?.organizationsSubtext || "Tracking facility growth";
  const reportsLabel = ecosystemStats?.reportsLabel || "Reports";
  const reportsSubtext = ecosystemStats?.reportsSubtext || "Generated across all teams";

  const fetchSiteContent = useCallback(async () => {
    setSiteLoading(true);
    setSiteError(null);
    try {
      const response = await fetch("/api/site-state");
      if (!response.ok) {
        // Don't show error toast for 401 (unauthenticated) - this is expected on initial load
        if (response.status === 401) {
          setSiteLoading(false);
          return;
        }
        throw new Error(DATABASE_ERRORS.SITE_STATE_FETCH);
      }
      const data = await response.json();
      if (data?.payload) {
        setContent(buildContentFromQuestionnaire(data.payload));
      }
    } catch (error) {
      console.error(DATABASE_ERRORS.SITE_STATE_FETCH, error);
      setSiteError(DATABASE_ERRORS.SITE_STATE_FETCH);
      toast.error(DATABASE_ERRORS.SITE_STATE_FETCH);
    } finally {
      setSiteLoading(false);
    }
  }, []);

  const fetchDeckContent = useCallback(async () => {
    setDeckLoading(true);
    setDeckError(null);
    try {
      const response = await fetch("/api/pitch-deck");
      if (!response.ok) {
        throw new Error(DATABASE_ERRORS.PITCH_DECK_FETCH);
      }
      const data = await response.json();
      if (data?.payload) {
        setPitchDeck(data.payload);
      }
    } catch (error) {
      console.error(DATABASE_ERRORS.PITCH_DECK_FETCH, error);
      setDeckError(DATABASE_ERRORS.PITCH_DECK_FETCH);
      toast.error(DATABASE_ERRORS.PITCH_DECK_FETCH);
    } finally {
      setDeckLoading(false);
    }
  }, []);

  const fetchPublicInvestorList = useCallback(async () => {
    try {
      const response = await fetch("/api/investors/list");
      if (!response.ok) {
        throw new Error("Failed to load investor list");
      }
      const data = await response.json();
      if (data?.investors) {
        setPublicInvestorList(data.investors);
      }
    } catch (error) {
      console.error("Failed to load investor list", error);
      // Don't show error toast here - this is a silent background fetch
      // The user will see the "no investors configured" message if it fails
    }
  }, []);

  useEffect(() => {
    void fetchSiteContent();
  }, [fetchSiteContent]);

  useEffect(() => {
    void fetchDeckContent();
  }, [fetchDeckContent]);

  useEffect(() => {
    void fetchPublicInvestorList();
  }, [fetchPublicInvestorList]);

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
  if (siteLoading) {
    setLoadingAnnouncement("Loading investor overview and snapshot.");
    } else if (deckLoading) {
      setLoadingAnnouncement("Loading countdown data from the pitch deck.");
    } else if (siteError) {
      setLoadingAnnouncement("Investor content failed to load.");
    } else if (deckError) {
      setLoadingAnnouncement("Pitch deck countdown failed to load.");
    } else {
      setLoadingAnnouncement("");
    }
  }, [siteLoading, deckLoading, siteError, deckError]);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch("/api/auth/session");
        if (!response.ok) {
          setAuthenticatedSlug(null);
          return;
        }
        const data = await response.json();
        if (data.role === "investor") {
          setAuthenticatedSlug(data.slug);
        } else {
          setAuthenticatedSlug(null);
        }
      } catch (error) {
        console.error("Failed to load session info", error);
        setAuthenticatedSlug(null);
      } finally {
        setCheckingSession(false);
      }
    };
    fetchSession();
  }, []);

  // Check if investor has agreed to Brain Trust terms
  useEffect(() => {
    const checkAgreement = async () => {
      if (!authenticatedSlug) {
        setCheckingAgreement(false);
        return;
      }

      try {
        const response = await fetch("/api/investor/agree-terms");
        if (!response.ok) {
          setHasAgreed(false);
          return;
        }
        const data = await response.json();
        setHasAgreed(data.hasAgreed);
      } catch (error) {
        console.error("Failed to check agreement status", error);
        setHasAgreed(false);
      } finally {
        setCheckingAgreement(false);
      }
    };
    checkAgreement();
  }, [authenticatedSlug]);

  useEffect(() => {
    if (!investorSlugFromParams || typeof window === "undefined") {
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.set("investor", investorSlugFromParams);
    window.history.replaceState({}, "", url.toString());
  }, [investorSlugFromParams]);

const countdownLabel =
  metadata.milestoneLabel || pitchDeck?.countdown?.label || "Launch";

useEffect(() => {
  const message = `Countdown to ${countdownLabel}: ${countdown.days} days ${countdown.hours} hours ${countdown.minutes} minutes and ${countdown.seconds} seconds remaining.`;
  setCountdownAnnouncement(message);
}, [countdown, countdownLabel]);

  useEffect(() => {
    if (siteLoading) {
      setProgressAnimated(false);
      return;
    }
    const frame = requestAnimationFrame(() => setProgressAnimated(true));
    return () => cancelAnimationFrame(frame);
  }, [siteLoading, funding.committed, funding.target]);

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
  const rawProgress =
    funding.target > 0 ? (funding.committed / funding.target) * 100 : 0;
  const fundingProgress = Math.min(Math.max(rawProgress, 0), 100);
  const fundingProgressRounded = Math.round(fundingProgress);
  const committedDisplay = `$${funding.committed.toLocaleString()}`;
  const targetDisplay = `$${funding.target.toLocaleString()}`;
  const ecosystemStatsDisplay = [
    { label: organizationsLabel, value: organizations, subtext: organizationsSubtext },
    { label: reportsLabel, value: reports, subtext: reportsSubtext },
  ];

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/session", { method: "DELETE" });
    } catch (error) {
      console.error("Failed to clear session", error);
    } finally {
      setAuthenticatedSlug(null);
    }
  };

  const handleInvestorAuthenticated = (slug: string) => {
    setAuthenticatedSlug(slug);
    // Fetch full site content now that we're authenticated
    void fetchSiteContent();
  };

  const handleAgree = async () => {
    try {
      const response = await fetch("/api/investor/agree-terms", {
        method: "POST",
      });
      if (!response.ok) {
        toast.error("Failed to record agreement");
        return;
      }
      setHasAgreed(true);
      toast.success("Welcome to the Brain Trust!");
    } catch (error) {
      console.error("Failed to record agreement", error);
      toast.error("Failed to record agreement");
    }
  };

  if (!activeInvestor) {
    if (checkingSession) {
      return (
        <div className="min-h-screen bg-[#050505] text-[#f6e1bd] flex items-center justify-center">
          <p className="text-sm text-[#a3a3a3]">Loading secure access…</p>
        </div>
      );
    }

    return (
      <AccessPortal
        investors={publicInvestorList}
        initialInvestorSlug={investorSlugFromParams}
        onInvestorAuthenticated={handleInvestorAuthenticated}
      />
    );
  }

  // If authenticated but still checking agreement status, show loading
  if (checkingAgreement) {
    return (
      <div className="min-h-screen bg-[#050505] text-[#f6e1bd] flex items-center justify-center">
        <p className="text-sm text-[#a3a3a3]">Loading…</p>
      </div>
    );
  }

  // If authenticated but hasn't agreed to Brain Trust terms, show agreement page
  if (hasAgreed === false) {
    return <BrainTrustAgreement onAgree={handleAgree} />;
  }

  const scrollToSection = (id: string) => {
    if (typeof document === "undefined") {
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const handleLogoClick = () => {
    if (activeInvestor?.showDickheadCounter) {
      setIsDickheadCounterOpen(true);
    }
  };

  const handleSelfReport = async () => {
    if (!activeInvestor || hasReportedToday) return;

    try {
      // Increment the count locally
      const updatedCount = (activeInvestor.dickheadCount || 0) + 1;

      // Update via API
      const response = await fetch("/api/investor/self-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          investorSlug: activeInvestor.slug,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update count");
      }

      // Mark as reported for today in localStorage
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const storageKey = `dickhead-report-${activeInvestor.slug}`;
      localStorage.setItem(storageKey, today);

      // Refresh the site content to get updated count
      await fetchSiteContent();

      toast.success("Count updated!");
    } catch (error) {
      console.error("Self-report failed:", error);
      toast.error("Failed to update count");
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#f6e1bd]">
      <nav className="sticky top-0 z-50 bg-[#0A0A0A]/90 backdrop-blur border-b border-[#262626]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
          </div>
          <div className="flex items-center gap-4 text-xs">
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

      <main
        id="main-content"
        tabIndex={-1}
        className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16"
      >
        {loadingAnnouncement && (
          <div className="sr-only" role="status" aria-live="polite">
            {loadingAnnouncement}
          </div>
        )}
        {siteError && (
          <div
            className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
            role="alert"
            aria-live="assertive"
          >
            <span>{siteError}</span>
            <button
              onClick={() => void fetchSiteContent()}
              className="rounded-lg border border-red-400/60 px-3 py-1 text-xs font-semibold text-red-100 hover:bg-red-500/20"
            >
              Retry
            </button>
          </div>
        )}

        <section
          id="overview"
          className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center"
        >
          <div className="space-y-6">
            {siteLoading ? (
              <OverviewSkeleton />
            ) : (
              <>
                <header className="space-y-5">
                  <div className="flex items-center gap-6">
                    <div
                      className={`w-32 h-32 md:w-40 md:h-40 flex items-center justify-center rounded-2xl bg-[#121212] border border-[#262626] ${
                        activeInvestor?.showDickheadCounter ? "cursor-pointer hover:border-[#cb6b1e] transition-colors" : ""
                      }`}
                      onClick={handleLogoClick}
                      role={activeInvestor?.showDickheadCounter ? "button" : undefined}
                      aria-label={activeInvestor?.showDickheadCounter ? "Open Dickhead Counter" : undefined}
                    >
                      <BaselineLogo size="w-28 h-28 md:w-36 md:h-36" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] uppercase tracking-[0.2em] text-[#a3a3a3]">
                        Baseline Analytics
                      </span>
                      <span className="text-xs text-[#737373]">
                        Investor intelligence
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold leading-tight">
                      {displayHeroSegments.map((segment, index) => (
                        <span
                          key={`${segment.text}-${index}`}
                          className={segment.accent ? "text-[#cb6b1e]" : undefined}
                        >
                          {segment.text}
                          {index < displayHeroSegments.length - 1 ? " " : ""}
                        </span>
                      ))}
                    </h1>
                    {heroMissionText && (
                      <p className="text-lg sm:text-xl text-[#f6e1bd]/90">
                        {heroMissionText}
                      </p>
                    )}
                    {heroDescriptorText && (
                      <p className="text-sm text-[#a3a3a3] leading-relaxed">
                        {heroDescriptorText}
                      </p>
                    )}
                  </div>
                </header>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#141414] border border-[#262626] rounded-xl p-4">
                    <p className="text-[11px] text-[#a3a3a3] mb-1">
                      Current round
                    </p>
                    <p className="text-xl font-semibold text-[#cb6b1e]">
                      {funding.roundType}
                    </p>
                    <p className="text-[11px] text-[#d4d4d4] mt-1">
                      {funding.useOfFunds}
                    </p>
                  </div>
                  <div className="bg-[#141414] border border-[#262626] rounded-xl p-4">
                    <p className="text-[11px] text-[#a3a3a3] mb-1">
                      Last updated
                    </p>
                    <p className="text-xl font-semibold">{lastUpdated}</p>
                    <p className="text-[11px] text-[#d4d4d4] mt-1">
                      Personalized investor feeds refresh as soon as data
                      changes.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="relative space-y-6">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#cb6b1e]/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-[#141414] rounded-full blur-3xl pointer-events-none" />

            <div
              className="relative bg-[#141414] border border-[#262626] rounded-2xl p-10 space-y-6 shadow-xl"
              aria-live="polite"
            >
              {deckLoading ? (
                <CountdownSkeleton />
              ) : (
                <>
                  <h2 className="text-lg font-semibold text-[#f6e1bd] mb-1 text-center">
                    Countdown to {countdownLabel}
                  </h2>
                  <p className="text-[11px] text-[#a3a3a3] mb-4">
                  </p>
                  <div className="flex justify-between items-center gap-6">
                    {[
                      { label: "Days", value: countdown.days },
                      { label: "Hours", value: countdown.hours },
                      { label: "Minutes", value: countdown.minutes },
                      { label: "Seconds", value: countdown.seconds },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="flex-1 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg py-8 text-center shadow-inner"
                      >
                        <div className="text-5xl md:text-6xl lg:text-7xl font-mono font-semibold text-[#cb6b1e]">
                          {String(item.value).padStart(2, "0")}
                        </div>
                        <div className="text-[10px] uppercase tracking-[0.16em] text-[#a3a3a3] mt-1">
                          {item.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
              <div className="sr-only" role="status" aria-live="polite">
                {countdownAnnouncement}
              </div>
              {deckError && (
                <div
                  className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-100 flex items-center justify-between gap-3"
                  role="alert"
                  aria-live="assertive"
                >
                  <span>{deckError}</span>
                  <button
                    onClick={() => void fetchDeckContent()}
                    className="rounded border border-yellow-300/40 px-2 py-1 text-[10px]"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Funding Progress Bar - Full Width, FLASHY */}
        <section className="w-full">
          {siteLoading ? (
            <SkeletonBlock className="h-40 w-full" />
          ) : (
            <div className="bg-gradient-to-r from-[#141414] to-[#1a1a1a] border border-[#262626] rounded-2xl p-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm uppercase tracking-wider text-[#a3a3a3] mb-1">
                    Funding Progress
                  </h3>
                  <p className="text-2xl font-bold">
                    <span className="text-[#cb6b1e]">{committedDisplay}</span>
                    <span className="text-[#737373]"> / {targetDisplay}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-bold text-[#cb6b1e]">
                    {fundingProgressRounded}%
                  </p>
                  <p className="text-xs text-[#a3a3a3]">of target reached</p>
                </div>
              </div>

              <div
                className="relative w-full bg-[#0f0f0f] rounded-full h-6 border border-[#262626] overflow-hidden"
                role="progressbar"
                aria-label="Funding progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={fundingProgressRounded}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[#cb6b1e]/20 to-transparent opacity-50" />
                <div
                  className="relative h-full bg-gradient-to-r from-[#cb6b1e] to-[#e37a2e] rounded-full transition-all duration-[2000ms] ease-out shadow-lg shadow-[#cb6b1e]/50"
                  style={{ width: progressAnimated ? `${fundingProgress}%` : "0%" }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                </div>
              </div>

              <p className="text-xs text-[#737373] mt-3">
                {funding.closeDate} target close
              </p>
            </div>
          )}
        </section>

        {/* MVP Snapshot */}
        <section className="w-full">
          <div className="relative overflow-hidden rounded-2xl border border-[#262626] bg-gradient-to-r from-[#111111] via-[#141414] to-[#191919] p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[#a3a3a3]">
                  {mvpSnapshot.title || "MVP Snapshot"}
                </p>
                <p className="text-sm text-[#d4d4d4]">
                  Tracking the last milestone shipped and the next target in the build.
                </p>
              </div>
              <a
                href="/update-schedule"
                className="self-start rounded-full border border-[#262626] px-4 py-2 text-xs uppercase tracking-[0.2em] text-[#f6e1bd] hover:border-[#cb6b1e] hover:text-[#cb6b1e] transition-colors"
              >
                {mvpSnapshot.ctaLabel || "Update schedule"}
              </a>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              {[mvpSnapshot.previous, mvpSnapshot.next].map((task, index) => (
                <div
                  key={`${task?.label || index}-${index}`}
                  className="relative rounded-2xl border border-[#262626] bg-[#0b0b0b]/80 p-6 shadow-[0_0_30px_rgba(11,11,11,0.6)]"
                >
                  <p className="text-[11px] uppercase tracking-[0.3em] text-[#a3a3a3]">
                    {(task?.label || (index === 0 ? "Previous task" : "Next task")).toUpperCase()}
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold text-[#f6e1bd]">
                    {task?.title || "To be announced"}
                  </h3>
                  <p className="mt-2 text-sm text-[#a3a3a3] leading-relaxed">
                    {task?.description || "Stay tuned for the latest milestone details."}
                  </p>
                  <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#262626] px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-[#cb6b1e]">
                    <span>{task?.statusLabel || (index === 0 ? "Completed" : "Target TBD")}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Ecosystem Card - Full Width, FLASHY */}
        <section className="w-full">
          {siteLoading ? (
            <SkeletonBlock className="h-48 w-full" />
          ) : (
            <div className="bg-gradient-to-br from-[#141414] via-[#1a1a1a] to-[#141414] border border-[#262626] rounded-2xl p-8">
              <h3 className="text-2xl font-bold mb-2">The Baseline Ecosystem</h3>
              <p className="text-sm text-[#a3a3a3] mb-6">
                Real-time metrics from our growing network
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="group relative bg-[#0f0f0f] border border-[#262626] rounded-xl p-6 transition-all duration-300 hover:scale-[1.02] hover:border-[#cb6b1e] hover:shadow-xl hover:shadow-[#cb6b1e]/20 cursor-default">
                  <div className="absolute inset-0 bg-gradient-to-r from-[#cb6b1e]/0 to-[#cb6b1e]/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative">
                    <p className="text-5xl md:text-6xl font-bold text-white group-hover:text-[#cb6b1e] transition-colors duration-300">
                      {organizations}
                    </p>
                    <p className="text-sm uppercase tracking-wider text-[#a3a3a3] mt-2 group-hover:text-white transition-colors duration-300">
                      {organizationsLabel}
                    </p>
                    <p className="text-xs text-[#737373] mt-1">
                      {organizationsSubtext}
                    </p>
                  </div>
                </div>

                <div className="group relative bg-[#0f0f0f] border border-[#262626] rounded-xl p-6 transition-all duration-300 hover:scale-[1.02] hover:border-[#cb6b1e] hover:shadow-xl hover:shadow-[#cb6b1e]/20 cursor-default">
                  <div className="absolute inset-0 bg-gradient-to-r from-[#cb6b1e]/0 to-[#cb6b1e]/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative">
                    <p className="text-5xl md:text-6xl font-bold text-white group-hover:text-[#cb6b1e] transition-colors duration-300">
                      {reports}
                    </p>
                    <p className="text-sm uppercase tracking-wider text-[#a3a3a3] mt-2 group-hover:text-white transition-colors duration-300">
                      {reportsLabel}
                    </p>
                    <p className="text-xs text-[#737373] mt-1">
                      {reportsSubtext}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
        <footer className="pt-4 pb-10 text-[11px] text-[#d4d4d4] flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-t border-[#262626]">
          <span>Baseline / Investor Pulse</span>
          <span>Built for private investor updates, not public marketing.</span>
          <span>
            Accessibility: We are committed to WCAG 2.1 AA compliance. Contact{" "}
            <a
              href="mailto:accessibility@baseline.com"
              className="underline text-[#f6e1bd]"
            >
              accessibility@baseline.com
            </a>{" "}
            with any issues.
          </span>
        </footer>
      </main>

      {/* Dickhead Counter Modal */}
      {activeInvestor && activeInvestor.showDickheadCounter && (
        <DickheadCounter
          isOpen={isDickheadCounterOpen}
          onClose={() => setIsDickheadCounterOpen(false)}
          currentInvestor={activeInvestor}
          allInvestors={investors}
          onSelfReport={handleSelfReport}
          hasReportedThisSession={hasReportedToday}
        />
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<OverviewSkeleton />}>
      <HomeContent />
    </Suspense>
  );
}
