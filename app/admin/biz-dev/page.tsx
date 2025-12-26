"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BizDevNav from "@/components/BizDevNav";
import { ADMIN_PERSONAS, ADMIN_SLUGS } from "@/lib/adminUsers";
import { BOSPayload, DEFAULT_BOS_PAYLOAD } from "@/lib/bos";

export default function BizDevOverviewPage() {
  const router = useRouter();
  const [authorizedAdmin, setAuthorizedAdmin] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bosData, setBosData] = useState<BOSPayload>(DEFAULT_BOS_PAYLOAD);

  const adminLabel = useMemo(() => {
    if (!authorizedAdmin) return undefined;
    const admin = ADMIN_PERSONAS.find((p) => p.slug === authorizedAdmin);
    return admin?.shortLabel ?? admin?.name ?? authorizedAdmin;
  }, [authorizedAdmin]);

  // Calculate completeness scores
  const scores = useMemo(() => {
    // North Star
    const northStarFields = [
      bosData.northStar.mission,
      bosData.northStar.vision,
      bosData.northStar.ifNotTrueTest,
    ];
    const northStarItems = [
      ...bosData.northStar.principles,
      ...bosData.northStar.unfairAdvantages,
    ];
    const northStarScore =
      (northStarFields.filter((f) => f?.trim()).length +
        Math.min(northStarItems.filter((i) => i?.trim()).length, 5)) /
      8;

    // Time Horizons
    const horizons = [
      bosData.timeHorizons.tenYear,
      bosData.timeHorizons.fiveYear,
      bosData.timeHorizons.threeYear,
      bosData.timeHorizons.oneYear,
    ];
    const timeHorizonsScore =
      horizons.filter((h) => h.narrative?.trim()).length / 4;

    // The Bet
    const betFields = [
      bosData.theBet.categoryOwned,
      bosData.theBet.dataAsset,
      bosData.theBet.behaviorsChanged,
      bosData.theBet.fullNarrative,
    ];
    const theBetScore = betFields.filter((f) => f?.trim()).length / 4;

    // The Proof
    const theProofScore = Math.min(bosData.theProof.signals.length, 5) / 5;

    // Quarterly
    const quarterlyFields = [
      bosData.quarterly.currentQuarter,
      bosData.quarterly.theme,
      bosData.quarterly.primaryLever,
      bosData.quarterly.successSignal,
      bosData.quarterly.failureSignal,
    ];
    const quarterlyScore = quarterlyFields.filter((f) => f?.trim()).length / 5;

    // Experiments
    const decidedExperiments = bosData.experiments.filter(
      (e) => e.decision !== "pending"
    ).length;
    const experimentsScore =
      bosData.experiments.length > 0
        ? decidedExperiments / bosData.experiments.length
        : 0;

    // Weekly
    const weeklyFields = [
      bosData.weekly.currentWeek,
      bosData.weekly.movedPrimaryLever,
      bosData.weekly.surprises,
      bosData.weekly.frictionIncreasing,
      bosData.weekly.founderDecisionNeeded,
    ];
    const weeklyScore = weeklyFields.filter((f) => f?.trim()).length / 5;

    // System Map
    const systemMapFields = [
      bosData.systemMap.mermaidDiagram,
      bosData.systemMap.leverageCompounds,
      bosData.systemMap.fragilityExists,
    ];
    const systemMapScore = systemMapFields.filter((f) => f?.trim()).length / 3;

    const overall = Math.round(
      ((northStarScore +
        timeHorizonsScore +
        theBetScore +
        theProofScore +
        quarterlyScore +
        weeklyScore +
        systemMapScore) /
        7) *
        100
    );

    return {
      northStar: Math.round(northStarScore * 100),
      timeHorizons: Math.round(timeHorizonsScore * 100),
      theBet: Math.round(theBetScore * 100),
      theProof: Math.round(theProofScore * 100),
      quarterly: Math.round(quarterlyScore * 100),
      experiments: Math.round(experimentsScore * 100),
      weekly: Math.round(weeklyScore * 100),
      systemMap: Math.round(systemMapScore * 100),
      overall,
    };
  }, [bosData]);

  // Experiment stats
  const experimentStats = useMemo(() => {
    const total = bosData.experiments.length;
    const pending = bosData.experiments.filter(
      (e) => e.decision === "pending"
    ).length;
    const doubleDown = bosData.experiments.filter(
      (e) => e.decision === "double_down"
    ).length;
    const adjust = bosData.experiments.filter(
      (e) => e.decision === "adjust"
    ).length;
    const kill = bosData.experiments.filter(
      (e) => e.decision === "kill"
    ).length;

    return { total, pending, doubleDown, adjust, kill };
  }, [bosData.experiments]);

  // Recommended actions
  const recommendations = useMemo(() => {
    const items: { text: string; href: string; priority: "high" | "medium" | "low" }[] = [];

    if (!bosData.quarterly.currentQuarter?.trim()) {
      items.push({
        text: "Set your current quarter",
        href: "/admin/biz-dev/quarterly",
        priority: "high",
      });
    }

    if (!bosData.quarterly.primaryLever?.trim()) {
      items.push({
        text: "Define your primary lever",
        href: "/admin/biz-dev/quarterly",
        priority: "high",
      });
    }

    if (!bosData.weekly.currentWeek?.trim()) {
      items.push({
        text: "Complete this week's check-in",
        href: "/admin/biz-dev/weekly",
        priority: "high",
      });
    }

    if (experimentStats.pending > 0) {
      items.push({
        text: `Decide on ${experimentStats.pending} pending experiment(s)`,
        href: "/admin/biz-dev/experiments",
        priority: "medium",
      });
    }

    if (scores.northStar < 80) {
      items.push({
        text: "Complete your North Star definition",
        href: "/admin/biz-dev/north-star",
        priority: "medium",
      });
    }

    if (scores.theProof < 60) {
      items.push({
        text: "Add more proof signals",
        href: "/admin/biz-dev/time-horizons",
        priority: "low",
      });
    }

    return items.slice(0, 4);
  }, [bosData, scores, experimentStats]);

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
          setAuthorizedAdmin(data.slug);
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

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/bos");
        if (response.ok) {
          const data = await response.json();
          if (data?.payload) {
            setBosData(data.payload);
          }
        }
      } catch (err) {
        console.error("Load failed:", err);
      } finally {
        setLoading(false);
      }
    };
    if (authorizedAdmin) void loadData();
  }, [authorizedAdmin]);

  if (!sessionChecked || loading) {
    return (
      <div className="min-h-screen bg-[#020202] text-[#f6e1bd] flex items-center justify-center">
        <p className="text-sm text-[#a3a3a3]">Loading...</p>
      </div>
    );
  }

  if (!authorizedAdmin) {
    return null;
  }

  const sections = [
    {
      href: "/admin/biz-dev/north-star",
      title: "North Star",
      description: "Mission, vision, principles, unfair advantages",
      preview: bosData.northStar.mission.slice(0, 80) + "...",
      icon: "★",
      score: scores.northStar,
    },
    {
      href: "/admin/biz-dev/time-horizons",
      title: "Time Horizons",
      description: "10 year → 1 year strategic stack + The Bet + The Proof",
      preview: `10Y: ${bosData.timeHorizons.tenYear.purpose}`,
      icon: "◎",
      score: scores.timeHorizons,
    },
    {
      href: "/admin/biz-dev/quarterly",
      title: "Quarterly",
      description: "Lever-based execution system",
      preview: bosData.quarterly.currentQuarter || "Set your quarter",
      accent: true,
      icon: "◆",
      score: scores.quarterly,
    },
    {
      href: "/admin/biz-dev/experiments",
      title: "Experiments",
      description: "Monthly hypothesis tracking",
      preview: `${experimentStats.total} experiment(s) • ${experimentStats.pending} pending`,
      icon: "⚗",
      score: scores.experiments,
    },
    {
      href: "/admin/biz-dev/weekly",
      title: "Weekly",
      description: "Founder control panel",
      preview: bosData.weekly.currentWeek || "Update weekly",
      icon: "▣",
      score: scores.weekly,
    },
    {
      href: "/admin/biz-dev/system-map",
      title: "System Map",
      description: "Visual leverage and fragility mapping",
      preview: "Vision → Data → Product → Revenue → Moat",
      icon: "⬡",
      score: scores.systemMap,
    },
  ];

  return (
    <div className="min-h-screen bg-[#020202] text-[#f6e1bd]">
      <BizDevNav adminLabel={adminLabel} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-semibold mb-2">
              Business Operating System
            </h1>
            <p className="text-[#a3a3a3]">
              Vision → Systems → Levers → Execution → Signal
            </p>
          </div>

          {/* Overall Score */}
          <div className="text-center">
            <div className="relative w-20 h-20">
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  stroke="#1a1a1a"
                  strokeWidth="6"
                  fill="none"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  stroke={scores.overall >= 80 ? "#22c55e" : "#cb6b1e"}
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={`${scores.overall * 2.01} 201`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-semibold">{scores.overall}%</span>
              </div>
            </div>
            <p className="text-xs text-[#737373] mt-1">Complete</p>
          </div>
        </div>

        {/* Current Quarter Focus - Hero Section */}
        <div className="mb-8 rounded-2xl border border-[#cb6b1e]/30 bg-gradient-to-br from-[#cb6b1e]/10 to-transparent p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">◆</span>
              <div>
                <p className="text-xs text-[#737373] uppercase tracking-wider">
                  Current Quarter
                </p>
                <p className="text-xl font-semibold text-[#cb6b1e]">
                  {bosData.quarterly.currentQuarter || "Not Set"}
                </p>
              </div>
            </div>
            <Link
              href="/admin/biz-dev/quarterly"
              className="rounded-lg border border-[#cb6b1e] px-4 py-2 text-sm text-[#cb6b1e] hover:bg-[#cb6b1e]/10"
            >
              Edit Quarter
            </Link>
          </div>

          {bosData.quarterly.theme && (
            <p className="text-sm text-[#a3a3a3] mb-4 italic">
              "{bosData.quarterly.theme}"
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl bg-[#0a0a0a]/50 p-4">
              <p className="text-xs text-[#737373] mb-1">Primary Lever</p>
              <p className="text-sm text-[#f6e1bd] line-clamp-2">
                {bosData.quarterly.primaryLever?.slice(0, 100) || "Not defined"}
              </p>
            </div>
            <div className="rounded-xl bg-green-950/20 p-4">
              <p className="text-xs text-green-400 mb-1">Success Signal</p>
              <p className="text-sm text-green-200/80 line-clamp-2">
                {bosData.quarterly.successSignal?.slice(0, 100) || "Not defined"}
              </p>
            </div>
            <div className="rounded-xl bg-red-950/20 p-4">
              <p className="text-xs text-red-400 mb-1">Failure Signal</p>
              <p className="text-sm text-red-200/80 line-clamp-2">
                {bosData.quarterly.failureSignal?.slice(0, 100) || "Not defined"}
              </p>
            </div>
          </div>
        </div>

        {/* Recommended Actions */}
        {recommendations.length > 0 && (
          <div className="mb-8 rounded-xl border border-yellow-900/30 bg-yellow-950/10 p-4">
            <p className="text-xs text-yellow-400 uppercase tracking-wider mb-3">
              Recommended Actions
            </p>
            <div className="flex flex-wrap gap-2">
              {recommendations.map((rec, idx) => (
                <Link
                  key={idx}
                  href={rec.href}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                    rec.priority === "high"
                      ? "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
                      : rec.priority === "medium"
                        ? "bg-[#1a1a1a] text-[#a3a3a3] hover:bg-[#2a2a2a]"
                        : "bg-[#0a0a0a] text-[#737373] hover:bg-[#1a1a1a]"
                  }`}
                >
                  <span className="text-xs">
                    {rec.priority === "high" ? "!" : rec.priority === "medium" ? "•" : "○"}
                  </span>
                  {rec.text}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Framework Diagram */}
        <div className="mb-8 rounded-2xl border border-[#262626] bg-[#0a0a0a] p-6">
          <p className="text-xs text-[#737373] uppercase tracking-wider mb-4">
            Time Horizon Stack
          </p>
          <div className="flex items-center justify-between flex-wrap gap-4">
            {[
              { label: "10 Year", sublabel: "World We Change" },
              { label: "5 Year", sublabel: "Company We Become" },
              { label: "3 Year", sublabel: "Platform We Own" },
              { label: "1 Year", sublabel: "Proof We Deliver" },
              { label: "Quarter", sublabel: "Levers We Pull", accent: true },
              { label: "Month", sublabel: "Experiments We Run" },
              { label: "Week", sublabel: "Moves We Make" },
            ].map((item, idx, arr) => (
              <div key={item.label} className="flex items-center gap-3">
                <div
                  className={`text-center ${item.accent ? "scale-110" : ""}`}
                >
                  <p
                    className={`text-sm font-semibold ${
                      item.accent ? "text-[#cb6b1e]" : "text-[#f6e1bd]"
                    }`}
                  >
                    {item.label}
                  </p>
                  <p className="text-[10px] text-[#737373]">{item.sublabel}</p>
                </div>
                {idx < arr.length - 1 && (
                  <span className="text-[#3a3a3a]">→</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Section Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {sections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className={`group relative rounded-xl border ${
                section.accent
                  ? "border-[#cb6b1e]/50 bg-[#cb6b1e]/5"
                  : "border-[#262626] bg-[#0a0a0a]"
              } p-5 transition-all hover:border-[#cb6b1e]/50 hover:bg-[#0f0f0f]`}
            >
              <div className="flex items-start justify-between mb-3">
                <span
                  className={`text-xl ${
                    section.accent ? "text-[#cb6b1e]" : "text-[#737373]"
                  }`}
                >
                  {section.icon}
                </span>
                <div className="flex items-center gap-2">
                  {/* Score indicator */}
                  <span
                    className={`text-xs ${
                      section.score >= 80
                        ? "text-green-400"
                        : section.score >= 50
                          ? "text-yellow-400"
                          : "text-[#737373]"
                    }`}
                  >
                    {section.score}%
                  </span>
                  <span className="text-[#cb6b1e] opacity-0 group-hover:opacity-100 transition-opacity">
                    →
                  </span>
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-1">{section.title}</h3>
              <p className="text-xs text-[#737373] mb-3">
                {section.description}
              </p>
              <p className="text-xs text-[#a3a3a3] italic truncate">
                {section.preview}
              </p>

              {/* Progress bar */}
              <div className="mt-3 h-1 rounded-full bg-[#1a1a1a] overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    section.score >= 80
                      ? "bg-green-500"
                      : section.score >= 50
                        ? "bg-yellow-500"
                        : "bg-[#cb6b1e]"
                  }`}
                  style={{ width: `${section.score}%` }}
                />
              </div>
            </Link>
          ))}
        </div>

        {/* Experiment Stats Row */}
        <div className="mb-8">
          <p className="text-xs text-[#737373] uppercase tracking-wider mb-3">
            Experiment Pipeline
          </p>
          <div className="grid grid-cols-5 gap-3">
            <div className="rounded-xl border border-[#262626] bg-[#0a0a0a] p-4 text-center">
              <p className="text-2xl font-semibold">{experimentStats.total}</p>
              <p className="text-xs text-[#737373]">Total</p>
            </div>
            <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4 text-center">
              <p className="text-2xl font-semibold text-[#737373]">
                {experimentStats.pending}
              </p>
              <p className="text-xs text-[#737373]">Pending</p>
            </div>
            <div className="rounded-xl border border-green-900/50 bg-green-950/30 p-4 text-center">
              <p className="text-2xl font-semibold text-green-400">
                {experimentStats.doubleDown}
              </p>
              <p className="text-xs text-green-400">Double Down</p>
            </div>
            <div className="rounded-xl border border-yellow-900/50 bg-yellow-950/30 p-4 text-center">
              <p className="text-2xl font-semibold text-yellow-400">
                {experimentStats.adjust}
              </p>
              <p className="text-xs text-yellow-400">Adjust</p>
            </div>
            <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-4 text-center">
              <p className="text-2xl font-semibold text-red-400">
                {experimentStats.kill}
              </p>
              <p className="text-xs text-red-400">Kill</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-[#262626] bg-[#0a0a0a] p-4">
            <p className="text-xs text-[#737373] uppercase tracking-wider">
              Principles
            </p>
            <p className="text-2xl font-semibold text-[#cb6b1e]">
              {bosData.northStar.principles.filter((p) => p?.trim()).length}
            </p>
          </div>
          <div className="rounded-xl border border-[#262626] bg-[#0a0a0a] p-4">
            <p className="text-xs text-[#737373] uppercase tracking-wider">
              Proof Signals
            </p>
            <p className="text-2xl font-semibold text-[#cb6b1e]">
              {bosData.theProof.signals.length}
            </p>
          </div>
          <div className="rounded-xl border border-[#262626] bg-[#0a0a0a] p-4">
            <p className="text-xs text-[#737373] uppercase tracking-wider">
              Supporting Levers
            </p>
            <p className="text-2xl font-semibold text-[#cb6b1e]">
              {bosData.quarterly.supportingLevers.filter((l) => l?.trim()).length}
            </p>
          </div>
          <div className="rounded-xl border border-[#262626] bg-[#0a0a0a] p-4">
            <p className="text-xs text-[#737373] uppercase tracking-wider">
              Kill List
            </p>
            <p className="text-2xl font-semibold text-red-400">
              {bosData.quarterly.killList.filter((k) => k?.trim()).length}
            </p>
          </div>
        </div>

        {/* Last Updated */}
        <p className="mt-8 text-center text-xs text-[#3a3a3a]">
          Last updated:{" "}
          {bosData.updatedAt
            ? new Date(bosData.updatedAt).toLocaleString()
            : "Never"}
        </p>
      </main>
    </div>
  );
}
