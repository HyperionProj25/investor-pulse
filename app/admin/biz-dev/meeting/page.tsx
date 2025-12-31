"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ADMIN_PERSONAS, ADMIN_SLUGS } from "@/lib/adminUsers";
import { BOSPayload, DEFAULT_BOS_PAYLOAD } from "@/lib/bos";

type SectionId =
  | "north-star"
  | "time-horizons"
  | "the-bet"
  | "the-proof"
  | "quarterly"
  | "experiments"
  | "weekly"
  | "system-map";

type ViewMode = "slide" | "scroll";

const SECTIONS: { id: SectionId; label: string; icon: string }[] = [
  { id: "north-star", label: "North Star", icon: "★" },
  { id: "time-horizons", label: "Time Horizons", icon: "◎" },
  { id: "the-bet", label: "The Bet", icon: "⚡" },
  { id: "the-proof", label: "The Proof", icon: "✓" },
  { id: "quarterly", label: "Quarterly", icon: "◆" },
  { id: "experiments", label: "Experiments", icon: "⚗" },
  { id: "weekly", label: "Weekly", icon: "▣" },
  { id: "system-map", label: "System Map", icon: "⬡" },
];

export default function MeetingModePage() {
  const router = useRouter();
  const [authorizedAdmin, setAuthorizedAdmin] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bosData, setBosData] = useState<BOSPayload>(DEFAULT_BOS_PAYLOAD);

  // Meeting state
  const [inMeeting, setInMeeting] = useState(false);
  const [selectedSections, setSelectedSections] = useState<SectionId[]>([
    "north-star",
    "quarterly",
  ]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("slide");

  // Refs for scroll mode
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

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

  // Keyboard navigation
  useEffect(() => {
    if (!inMeeting) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setInMeeting(false);
        return;
      }

      if (viewMode === "slide") {
        if (e.key === "ArrowRight" || e.key === " ") {
          e.preventDefault();
          setCurrentSlide((prev) =>
            Math.min(prev + 1, selectedSections.length - 1)
          );
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          setCurrentSlide((prev) => Math.max(prev - 1, 0));
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [inMeeting, viewMode, selectedSections.length]);

  const toggleSection = (id: SectionId) => {
    setSelectedSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedSections(SECTIONS.map((s) => s.id));
  };

  const clearAll = () => {
    setSelectedSections([]);
  };

  const startMeeting = () => {
    if (selectedSections.length === 0) return;
    setCurrentSlide(0);
    setInMeeting(true);
  };

  const exitMeeting = () => {
    setInMeeting(false);
  };

  const scrollToSection = (id: SectionId) => {
    const el = sectionRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  // Get ordered sections based on selection
  const orderedSections = useMemo(() => {
    return SECTIONS.filter((s) => selectedSections.includes(s.id));
  }, [selectedSections]);

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

  // ============ SETUP SCREEN ============
  if (!inMeeting) {
    return (
      <div className="min-h-screen bg-[#020202] text-[#f6e1bd]">
        <div className="mx-auto max-w-3xl px-4 py-12">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-semibold mb-2">Meeting Mode</h1>
            <p className="text-[#a3a3a3]">
              Select the sections you want to present
            </p>
          </div>

          {/* Section Selection Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {SECTIONS.map((section) => {
              const isSelected = selectedSections.includes(section.id);
              return (
                <button
                  key={section.id}
                  onClick={() => toggleSection(section.id)}
                  className={`rounded-xl border p-4 text-center transition-all ${
                    isSelected
                      ? "border-[#cb6b1e] bg-[#cb6b1e]/10"
                      : "border-[#262626] bg-[#0a0a0a] hover:border-[#3a3a3a]"
                  }`}
                >
                  <span className="text-2xl block mb-2">{section.icon}</span>
                  <span
                    className={`text-sm ${
                      isSelected ? "text-[#cb6b1e]" : "text-[#a3a3a3]"
                    }`}
                  >
                    {section.label}
                  </span>
                  {isSelected && (
                    <span className="block mt-2 text-xs text-[#cb6b1e]">
                      #{selectedSections.indexOf(section.id) + 1}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="flex justify-center gap-4 mb-8">
            <button
              onClick={selectAll}
              className="rounded-lg border border-[#2a2a2a] px-4 py-2 text-sm text-[#a3a3a3] hover:border-[#cb6b1e] hover:text-[#cb6b1e]"
            >
              Select All
            </button>
            <button
              onClick={clearAll}
              className="rounded-lg border border-[#2a2a2a] px-4 py-2 text-sm text-[#a3a3a3] hover:border-[#cb6b1e] hover:text-[#cb6b1e]"
            >
              Clear
            </button>
          </div>

          {/* Start Button */}
          <div className="text-center">
            <button
              onClick={startMeeting}
              disabled={selectedSections.length === 0}
              className="rounded-xl bg-[#cb6b1e] px-8 py-4 text-lg font-semibold text-black hover:bg-[#e37a2e] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start Meeting ({selectedSections.length} sections)
            </button>
          </div>

          {/* Back Link */}
          <div className="mt-8 text-center">
            <button
              onClick={() => router.push("/admin/biz-dev")}
              className="text-sm text-[#737373] hover:text-[#cb6b1e]"
            >
              ← Back to Biz Dev
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============ PRESENTATION VIEW ============
  const currentSectionId = orderedSections[currentSlide]?.id;

  return (
    <div className="min-h-screen bg-[#020202] text-[#f6e1bd]">
      {/* Floating Controls */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-3">
        <button
          onClick={() => setViewMode(viewMode === "slide" ? "scroll" : "slide")}
          className="rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] px-3 py-2 text-xs text-[#a3a3a3] hover:border-[#cb6b1e] hover:text-[#cb6b1e]"
        >
          {viewMode === "slide" ? "≡ Scroll" : "⊞ Slides"}
        </button>
        <button
          onClick={exitMeeting}
          className="rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] px-4 py-2 text-sm text-[#737373] hover:border-red-500 hover:text-red-400"
        >
          Exit
        </button>
      </div>

      {/* SLIDE MODE */}
      {viewMode === "slide" && (
        <>
          {/* Current Section Content */}
          <div className="min-h-screen flex items-center justify-center px-8 py-16">
            <div className="w-full max-w-5xl">
              <SectionContent
                sectionId={currentSectionId}
                bosData={bosData}
              />
            </div>
          </div>

          {/* Bottom Navigation */}
          <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#020202] to-transparent pt-16 pb-6">
            <div className="flex items-center justify-center gap-4">
              {/* Previous */}
              <button
                onClick={() => setCurrentSlide((prev) => Math.max(prev - 1, 0))}
                disabled={currentSlide === 0}
                className="rounded-lg border border-[#2a2a2a] px-4 py-2 text-[#a3a3a3] hover:border-[#cb6b1e] hover:text-[#cb6b1e] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ←
              </button>

              {/* Dots */}
              <div className="flex items-center gap-2">
                {orderedSections.map((section, idx) => (
                  <button
                    key={section.id}
                    onClick={() => goToSlide(idx)}
                    className={`w-3 h-3 rounded-full transition-all ${
                      idx === currentSlide
                        ? "bg-[#cb6b1e] scale-125"
                        : "bg-[#3a3a3a] hover:bg-[#5a5a5a]"
                    }`}
                    title={section.label}
                  />
                ))}
              </div>

              {/* Next */}
              <button
                onClick={() =>
                  setCurrentSlide((prev) =>
                    Math.min(prev + 1, orderedSections.length - 1)
                  )
                }
                disabled={currentSlide === orderedSections.length - 1}
                className="rounded-lg border border-[#2a2a2a] px-4 py-2 text-[#a3a3a3] hover:border-[#cb6b1e] hover:text-[#cb6b1e] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                →
              </button>
            </div>

            {/* Section Label */}
            <p className="text-center text-xs text-[#737373] mt-3">
              {orderedSections[currentSlide]?.icon}{" "}
              {orderedSections[currentSlide]?.label} ({currentSlide + 1}/
              {orderedSections.length})
            </p>
          </div>
        </>
      )}

      {/* SCROLL MODE */}
      {viewMode === "scroll" && (
        <>
          {/* Jump Menu */}
          <div className="fixed left-4 top-1/2 -translate-y-1/2 z-40">
            <div className="rounded-xl border border-[#2a2a2a] bg-[#0a0a0a] p-2 space-y-1">
              {orderedSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-left text-xs text-[#a3a3a3] hover:bg-[#1a1a1a] hover:text-[#cb6b1e]"
                >
                  <span>{section.icon}</span>
                  <span className="hidden md:inline">{section.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="ml-16 md:ml-48 px-8 py-16">
            <div className="max-w-4xl mx-auto space-y-24">
              {orderedSections.map((section) => (
                <div
                  key={section.id}
                  ref={(el) => {
                    sectionRefs.current[section.id] = el;
                  }}
                  className="scroll-mt-8"
                >
                  <SectionContent sectionId={section.id} bosData={bosData} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============ SECTION CONTENT COMPONENTS ============

function SectionContent({
  sectionId,
  bosData,
}: {
  sectionId: SectionId;
  bosData: BOSPayload;
}) {
  switch (sectionId) {
    case "north-star":
      return <NorthStarSection data={bosData.northStar} />;
    case "time-horizons":
      return <TimeHorizonsSection data={bosData.timeHorizons} />;
    case "the-bet":
      return <TheBetSection data={bosData.theBet} />;
    case "the-proof":
      return <TheProofSection data={bosData.theProof} />;
    case "quarterly":
      return <QuarterlySection data={bosData.quarterly} />;
    case "experiments":
      return <ExperimentsSection data={bosData.experiments} />;
    case "weekly":
      return <WeeklySection data={bosData.weekly} />;
    case "system-map":
      return <SystemMapSection data={bosData.systemMap} />;
    default:
      return null;
  }
}

function NorthStarSection({ data }: { data: BOSPayload["northStar"] }) {
  return (
    <div className="space-y-8">
      <div className="text-center mb-12">
        <span className="text-4xl">★</span>
        <h2 className="text-3xl font-semibold mt-4">North Star</h2>
      </div>

      <div className="rounded-2xl border border-[#cb6b1e]/30 bg-[#cb6b1e]/5 p-8">
        <p className="text-xs text-[#cb6b1e] uppercase tracking-wider mb-2">
          Mission
        </p>
        <p className="text-xl leading-relaxed">{data.mission || "—"}</p>
      </div>

      <div className="rounded-2xl border border-[#1f1f1f] bg-[#0b0b0b] p-8">
        <p className="text-xs text-[#737373] uppercase tracking-wider mb-2">
          Vision
        </p>
        <p className="text-lg leading-relaxed text-[#a3a3a3]">
          {data.vision || "—"}
        </p>
      </div>

      {data.principles.filter((p) => p?.trim()).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.principles
            .filter((p) => p?.trim())
            .map((principle, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-[#262626] bg-[#0a0a0a] p-4"
              >
                <span className="text-xs text-[#cb6b1e]">
                  Principle {idx + 1}
                </span>
                <p className="text-sm mt-1">{principle}</p>
              </div>
            ))}
        </div>
      )}

      {data.unfairAdvantages.filter((a) => a?.trim()).length > 0 && (
        <div>
          <p className="text-xs text-[#737373] uppercase tracking-wider mb-3">
            Unfair Advantages
          </p>
          <div className="flex flex-wrap gap-2">
            {data.unfairAdvantages
              .filter((a) => a?.trim())
              .map((advantage, idx) => (
                <span
                  key={idx}
                  className="rounded-full border border-green-900/50 bg-green-950/30 px-4 py-2 text-sm text-green-400"
                >
                  {advantage}
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TimeHorizonsSection({ data }: { data: BOSPayload["timeHorizons"] }) {
  const horizons = [
    { key: "tenYear", label: "10 Year", sublabel: "World We Change", data: data.tenYear },
    { key: "fiveYear", label: "5 Year", sublabel: "Company We Become", data: data.fiveYear },
    { key: "threeYear", label: "3 Year", sublabel: "Platform We Own", data: data.threeYear },
    { key: "oneYear", label: "1 Year", sublabel: "Proof We Deliver", data: data.oneYear },
  ];

  return (
    <div className="space-y-8">
      <div className="text-center mb-12">
        <span className="text-4xl">◎</span>
        <h2 className="text-3xl font-semibold mt-4">Time Horizons</h2>
      </div>

      <div className="space-y-6">
        {horizons.map((horizon, idx) => (
          <div
            key={horizon.key}
            className="rounded-2xl border border-[#1f1f1f] bg-[#0b0b0b] p-6"
          >
            <div className="flex items-center gap-4 mb-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#cb6b1e] text-lg font-semibold text-black">
                {horizon.label.split(" ")[0]}
              </span>
              <div>
                <p className="font-semibold">{horizon.label}</p>
                <p className="text-xs text-[#737373]">{horizon.sublabel}</p>
              </div>
            </div>
            <p className="text-lg text-[#a3a3a3] whitespace-pre-wrap">
              {horizon.data.narrative || "—"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TheBetSection({ data }: { data: BOSPayload["theBet"] }) {
  return (
    <div className="space-y-8">
      <div className="text-center mb-12">
        <span className="text-4xl">⚡</span>
        <h2 className="text-3xl font-semibold mt-4">The Bet</h2>
      </div>

      <div className="rounded-2xl border border-[#cb6b1e]/30 bg-[#cb6b1e]/5 p-8">
        <p className="text-lg leading-relaxed whitespace-pre-wrap">
          {data.fullNarrative || "—"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-[#262626] bg-[#0a0a0a] p-4">
          <p className="text-xs text-[#737373] mb-1">Category We Own</p>
          <p className="text-sm">{data.categoryOwned || "—"}</p>
        </div>
        <div className="rounded-xl border border-[#262626] bg-[#0a0a0a] p-4">
          <p className="text-xs text-[#737373] mb-1">Data Asset</p>
          <p className="text-sm">{data.dataAsset || "—"}</p>
        </div>
        <div className="rounded-xl border border-[#262626] bg-[#0a0a0a] p-4">
          <p className="text-xs text-[#737373] mb-1">Behaviors Changed</p>
          <p className="text-sm">{data.behaviorsChanged || "—"}</p>
        </div>
      </div>
    </div>
  );
}

function TheProofSection({ data }: { data: BOSPayload["theProof"] }) {
  return (
    <div className="space-y-8">
      <div className="text-center mb-12">
        <span className="text-4xl">✓</span>
        <h2 className="text-3xl font-semibold mt-4">The Proof</h2>
        <p className="text-[#737373] mt-2">Signals that validate our bet</p>
      </div>

      <div className="space-y-4">
        {data.signals.length === 0 ? (
          <p className="text-center text-[#737373]">No proof signals defined</p>
        ) : (
          data.signals.map((signal, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-green-900/30 bg-green-950/10 p-6"
            >
              <div className="flex items-start gap-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-900/50 text-sm font-semibold text-green-400">
                  {idx + 1}
                </span>
                <div>
                  <p className="font-semibold text-green-400">{signal.signal}</p>
                  <p className="text-sm text-[#a3a3a3] mt-2">
                    {signal.whyMatters}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function QuarterlySection({ data }: { data: BOSPayload["quarterly"] }) {
  return (
    <div className="space-y-8">
      <div className="text-center mb-12">
        <span className="text-4xl">◆</span>
        <h2 className="text-3xl font-semibold mt-4">
          {data.currentQuarter || "Quarterly"}
        </h2>
        {data.theme && (
          <p className="text-[#a3a3a3] mt-2 italic">"{data.theme}"</p>
        )}
      </div>

      {/* Primary Lever */}
      <div className="rounded-2xl border-2 border-[#cb6b1e] bg-gradient-to-br from-[#cb6b1e]/10 to-transparent p-8">
        <p className="text-xs text-[#cb6b1e] uppercase tracking-wider mb-2">
          Primary Lever
        </p>
        <p className="text-2xl leading-relaxed">{data.primaryLever || "—"}</p>
      </div>

      {/* Supporting Levers */}
      {data.supportingLevers.filter((l) => l?.trim()).length > 0 && (
        <div>
          <p className="text-xs text-[#737373] uppercase tracking-wider mb-3">
            Supporting Levers
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.supportingLevers
              .filter((l) => l?.trim())
              .map((lever, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-[#262626] bg-[#0a0a0a] p-4"
                >
                  <span className="text-xs text-[#cb6b1e]">{idx + 1}</span>
                  <p className="text-sm mt-1">{lever}</p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Signals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-green-900/30 bg-green-950/10 p-6">
          <p className="text-xs text-green-400 uppercase tracking-wider mb-2">
            Success Signal
          </p>
          <p className="text-green-200/80">{data.successSignal || "—"}</p>
        </div>
        <div className="rounded-2xl border border-red-900/30 bg-red-950/10 p-6">
          <p className="text-xs text-red-400 uppercase tracking-wider mb-2">
            Failure Signal
          </p>
          <p className="text-red-200/80">{data.failureSignal || "—"}</p>
        </div>
      </div>

      {/* Kill List */}
      {data.killList.filter((k) => k?.trim()).length > 0 && (
        <div>
          <p className="text-xs text-red-400 uppercase tracking-wider mb-3">
            Kill List
          </p>
          <div className="flex flex-wrap gap-2">
            {data.killList
              .filter((k) => k?.trim())
              .map((item, idx) => (
                <span
                  key={idx}
                  className="rounded-full border border-red-900/50 bg-red-950/30 px-4 py-2 text-sm text-red-400"
                >
                  {item}
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ExperimentsSection({ data }: { data: BOSPayload["experiments"] }) {
  const stats = {
    total: data.length,
    pending: data.filter((e) => e.decision === "pending").length,
    doubleDown: data.filter((e) => e.decision === "double_down").length,
    adjust: data.filter((e) => e.decision === "adjust").length,
    kill: data.filter((e) => e.decision === "kill").length,
  };

  const decisionColors = {
    pending: "border-[#2a2a2a] bg-[#1a1a1a] text-[#737373]",
    double_down: "border-green-900/50 bg-green-950/30 text-green-400",
    adjust: "border-yellow-900/50 bg-yellow-950/30 text-yellow-400",
    kill: "border-red-900/50 bg-red-950/30 text-red-400",
  };

  const decisionIcons = {
    pending: "⏳",
    double_down: "🚀",
    adjust: "🔄",
    kill: "🛑",
  };

  return (
    <div className="space-y-8">
      <div className="text-center mb-12">
        <span className="text-4xl">⚗</span>
        <h2 className="text-3xl font-semibold mt-4">Experiments</h2>
      </div>

      {/* Stats */}
      <div className="flex justify-center gap-8">
        {[
          { label: "Total", value: stats.total, icon: "" },
          { label: "Pending", value: stats.pending, icon: "⏳" },
          { label: "Double Down", value: stats.doubleDown, icon: "🚀" },
          { label: "Adjust", value: stats.adjust, icon: "🔄" },
          { label: "Kill", value: stats.kill, icon: "🛑" },
        ].map((stat) => (
          <div key={stat.label} className="text-center">
            <p className="text-3xl font-semibold">{stat.value}</p>
            <p className="text-xs text-[#737373]">
              {stat.icon} {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Experiment Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.slice(0, 6).map((exp) => (
          <div
            key={exp.id}
            className={`rounded-xl border p-4 ${decisionColors[exp.decision]}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs opacity-60">{exp.month || "—"}</span>
              <span className="text-lg">{decisionIcons[exp.decision]}</span>
            </div>
            <p className="font-medium line-clamp-2">{exp.hypothesis || "—"}</p>
            <p className="text-sm opacity-80 mt-1 line-clamp-1">
              {exp.action || "—"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function WeeklySection({ data }: { data: BOSPayload["weekly"] }) {
  const questions = [
    {
      num: 1,
      question: "What moved the primary lever?",
      answer: data.movedPrimaryLever,
      color: "border-[#cb6b1e]/30 bg-[#cb6b1e]/5",
      textColor: "text-[#f6e1bd]",
    },
    {
      num: 2,
      question: "What surprised us?",
      answer: data.surprises,
      color: "border-[#1f1f1f] bg-[#0b0b0b]",
      textColor: "text-[#a3a3a3]",
    },
    {
      num: 3,
      question: "Where is friction increasing?",
      answer: data.frictionIncreasing,
      color: "border-yellow-900/30 bg-yellow-950/10",
      textColor: "text-yellow-200/80",
    },
    {
      num: 4,
      question: "What requires a founder decision?",
      answer: data.founderDecisionNeeded,
      color: "border-red-900/30 bg-red-950/10",
      textColor: "text-red-200/80",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="text-center mb-12">
        <span className="text-4xl">▣</span>
        <h2 className="text-3xl font-semibold mt-4">Weekly Check-In</h2>
        <p className="text-[#cb6b1e] mt-2">{data.currentWeek || "—"}</p>
      </div>

      <div className="space-y-6">
        {questions.map((q) => (
          <div key={q.num} className={`rounded-2xl border ${q.color} p-6`}>
            <div className="flex items-center gap-3 mb-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#cb6b1e] text-sm font-semibold text-black">
                {q.num}
              </span>
              <p className="font-semibold">{q.question}</p>
            </div>
            <p className={`${q.textColor} whitespace-pre-wrap`}>
              {q.answer || "—"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SystemMapSection({ data }: { data: BOSPayload["systemMap"] }) {
  return (
    <div className="space-y-8">
      <div className="text-center mb-12">
        <span className="text-4xl">⬡</span>
        <h2 className="text-3xl font-semibold mt-4">System Map</h2>
      </div>

      {/* Diagram placeholder - would need mermaid rendering */}
      {data.mermaidDiagram && (
        <div className="rounded-2xl border border-[#1f1f1f] bg-[#0b0b0b] p-8">
          <p className="text-xs text-[#737373] uppercase tracking-wider mb-4">
            System Diagram
          </p>
          <pre className="text-sm text-[#a3a3a3] overflow-x-auto">
            {data.mermaidDiagram}
          </pre>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-green-900/30 bg-green-950/10 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl text-green-400">↑</span>
            <p className="font-semibold text-green-400">
              Where Leverage Compounds
            </p>
          </div>
          <p className="text-green-200/80 whitespace-pre-wrap">
            {data.leverageCompounds || "—"}
          </p>
        </div>

        <div className="rounded-2xl border border-red-900/30 bg-red-950/10 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl text-red-400">⚠</span>
            <p className="font-semibold text-red-400">Where Fragility Exists</p>
          </div>
          <p className="text-red-200/80 whitespace-pre-wrap">
            {data.fragilityExists || "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
