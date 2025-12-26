"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import BizDevNav from "@/components/BizDevNav";
import { ADMIN_PERSONAS, ADMIN_SLUGS } from "@/lib/adminUsers";
import {
  BOSPayload,
  DEFAULT_BOS_PAYLOAD,
  Experiment,
  generateBOSId,
} from "@/lib/bos";

type FilterType = "all" | "pending" | "double_down" | "adjust" | "kill";
type ViewType = "cards" | "timeline";

export default function ExperimentsPage() {
  const router = useRouter();
  const [authorizedAdmin, setAuthorizedAdmin] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bosData, setBosData] = useState<BOSPayload>(DEFAULT_BOS_PAYLOAD);
  const [experiments, setExperiments] = useState<Experiment[]>(
    DEFAULT_BOS_PAYLOAD.experiments
  );
  const [originalExperiments, setOriginalExperiments] = useState<Experiment[]>(
    DEFAULT_BOS_PAYLOAD.experiments
  );
  const [filter, setFilter] = useState<FilterType>("all");
  const [viewType, setViewType] = useState<ViewType>("cards");
  const [focusMode, setFocusMode] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  const adminLabel = useMemo(() => {
    if (!authorizedAdmin) return undefined;
    const admin = ADMIN_PERSONAS.find((p) => p.slug === authorizedAdmin);
    return admin?.shortLabel ?? admin?.name ?? authorizedAdmin;
  }, [authorizedAdmin]);

  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(experiments) !== JSON.stringify(originalExperiments);
  }, [experiments, originalExperiments]);

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
            setExperiments(data.payload.experiments);
            setOriginalExperiments(data.payload.experiments);
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

  const addExperiment = () => {
    setExperiments((prev) => [
      ...prev,
      {
        id: generateBOSId("exp"),
        month: "",
        hypothesis: "",
        action: "",
        signal: "",
        decision: "pending",
      },
    ]);
  };

  const updateExperiment = (
    id: string,
    field: keyof Experiment,
    value: string
  ) => {
    setExperiments((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  };

  const removeExperiment = (id: string) => {
    setExperiments((prev) => prev.filter((e) => e.id !== id));
  };

  const moveExperiment = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= experiments.length) return;
    const newExperiments = [...experiments];
    [newExperiments[index], newExperiments[newIndex]] = [
      newExperiments[newIndex],
      newExperiments[index],
    ];
    setExperiments(newExperiments);
  };

  const handleSave = async () => {
    if (!authorizedAdmin) {
      toast.error("Admin access required");
      return;
    }

    setSaving(true);
    try {
      const payload: BOSPayload = {
        ...bosData,
        experiments,
        updatedAt: new Date().toISOString(),
      };

      const response = await fetch("/api/bos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload }),
      });

      if (!response.ok) {
        throw new Error("Failed to save changes");
      }

      setBosData(payload);
      setOriginalExperiments(experiments);
      toast.success("Experiments saved!");
    } catch (err) {
      console.error("Save failed:", err);
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const filteredExperiments = useMemo(() => {
    if (filter === "all") return experiments;
    return experiments.filter((e) => e.decision === filter);
  }, [experiments, filter]);

  const stats = useMemo(() => {
    return {
      total: experiments.length,
      pending: experiments.filter((e) => e.decision === "pending").length,
      double_down: experiments.filter((e) => e.decision === "double_down")
        .length,
      adjust: experiments.filter((e) => e.decision === "adjust").length,
      kill: experiments.filter((e) => e.decision === "kill").length,
    };
  }, [experiments]);

  const completenessScore = useMemo(() => {
    if (experiments.length === 0) return 0;
    const decidedCount = experiments.filter(
      (e) => e.decision !== "pending"
    ).length;
    return Math.round((decidedCount / experiments.length) * 100);
  }, [experiments]);

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

  const inputClass =
    "w-full rounded-lg border border-[#2a2a2a] bg-[#090909] px-3 py-2 text-sm text-[#f6e1bd] focus:border-[#cb6b1e] focus:outline-none";

  const decisionColors: Record<Experiment["decision"], string> = {
    pending: "border-[#2a2a2a] bg-[#1a1a1a] text-[#737373]",
    double_down: "border-green-900/50 bg-green-950/30 text-green-400",
    adjust: "border-yellow-900/50 bg-yellow-950/30 text-yellow-400",
    kill: "border-red-900/50 bg-red-950/30 text-red-400",
  };

  const decisionLabels: Record<Experiment["decision"], string> = {
    pending: "Pending",
    double_down: "Double Down",
    adjust: "Adjust",
    kill: "Kill",
  };

  const decisionIcons: Record<Experiment["decision"], string> = {
    pending: "⏳",
    double_down: "🚀",
    adjust: "🔄",
    kill: "🛑",
  };

  // Focus Mode View
  if (focusMode) {
    return (
      <div className="min-h-screen bg-[#020202] text-[#f6e1bd]">
        {/* Minimal Header */}
        <div className="border-b border-[#1a1a1a] px-6 py-4">
          <div className="mx-auto max-w-5xl flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">Experiment Log</h1>
              <p className="text-sm text-[#737373]">
                {stats.total} experiments • {completenessScore}% decided
              </p>
            </div>
            <button
              onClick={() => setFocusMode(false)}
              className="rounded-lg border border-[#2a2a2a] px-4 py-2 text-sm text-[#737373] hover:border-[#cb6b1e] hover:text-[#cb6b1e]"
            >
              Exit Focus
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="border-b border-[#1a1a1a] px-6 py-4">
          <div className="mx-auto max-w-5xl flex items-center justify-center gap-8">
            {(["pending", "double_down", "adjust", "kill"] as const).map(
              (decision) => (
                <div key={decision} className="text-center">
                  <span className="text-2xl">{decisionIcons[decision]}</span>
                  <p className="text-2xl font-semibold mt-1">
                    {stats[decision]}
                  </p>
                  <p className="text-xs text-[#737373]">
                    {decisionLabels[decision]}
                  </p>
                </div>
              )
            )}
          </div>
        </div>

        {/* Experiments Grid */}
        <main className="mx-auto max-w-5xl px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {experiments.map((exp) => (
              <div
                key={exp.id}
                className={`rounded-2xl border p-6 ${decisionColors[exp.decision]}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs uppercase tracking-wider opacity-60">
                    {exp.month || "Undated"}
                  </span>
                  <span className="text-lg">{decisionIcons[exp.decision]}</span>
                </div>
                <h3 className="font-semibold mb-2 line-clamp-2">
                  {exp.hypothesis || "No hypothesis"}
                </h3>
                <p className="text-sm opacity-80 line-clamp-2">
                  {exp.action || "No action defined"}
                </p>
                {exp.signal && (
                  <p className="text-xs mt-3 opacity-60 italic">
                    Signal: {exp.signal}
                  </p>
                )}
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020202] text-[#f6e1bd]">
      <BizDevNav adminLabel={adminLabel} />

      <div className="flex">
        {/* Main Content */}
        <main
          className={`flex-1 px-4 py-8 sm:px-6 lg:px-8 transition-all ${
            showPreview ? "mr-80" : ""
          }`}
        >
          <div className="mx-auto max-w-4xl">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-semibold">
                    Monthly Experiment Log
                  </h1>
                  {hasUnsavedChanges && (
                    <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-400">
                      Unsaved
                    </span>
                  )}
                </div>
                <p className="text-sm text-[#a3a3a3]">
                  Hypothesis → Action → Signal → Decision. This is R&D, not
                  task tracking.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setFocusMode(true)}
                  className="rounded-lg border border-[#2a2a2a] px-4 py-2 text-sm text-[#737373] hover:border-[#cb6b1e] hover:text-[#cb6b1e]"
                >
                  Focus Mode
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !hasUnsavedChanges}
                  className="rounded-lg bg-[#cb6b1e] px-6 py-2 text-sm font-semibold text-black hover:bg-[#e37a2e] disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="mb-6 grid grid-cols-5 gap-3">
              <button
                onClick={() => setFilter("all")}
                className={`rounded-xl border p-4 text-center transition-all ${
                  filter === "all"
                    ? "border-[#cb6b1e] bg-[#cb6b1e]/10"
                    : "border-[#2a2a2a] bg-[#0b0b0b] hover:border-[#3a3a3a]"
                }`}
              >
                <p className="text-2xl font-semibold">{stats.total}</p>
                <p className="text-xs text-[#737373]">All</p>
              </button>
              {(["pending", "double_down", "adjust", "kill"] as const).map(
                (decision) => (
                  <button
                    key={decision}
                    onClick={() => setFilter(decision)}
                    className={`rounded-xl border p-4 text-center transition-all ${
                      filter === decision
                        ? decisionColors[decision]
                        : "border-[#2a2a2a] bg-[#0b0b0b] hover:border-[#3a3a3a]"
                    }`}
                  >
                    <p className="text-2xl font-semibold">{stats[decision]}</p>
                    <p className="text-xs">{decisionLabels[decision]}</p>
                  </button>
                )
              )}
            </div>

            {/* Controls */}
            <div className="mb-6 flex items-center justify-between">
              <button
                onClick={addExperiment}
                className="rounded-lg border border-[#cb6b1e] px-4 py-2 text-sm text-[#cb6b1e] hover:bg-[#cb6b1e]/10"
              >
                + New Experiment
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewType("cards")}
                  className={`rounded-lg px-3 py-1.5 text-xs ${
                    viewType === "cards"
                      ? "bg-[#cb6b1e]/20 text-[#cb6b1e]"
                      : "text-[#737373] hover:text-[#a3a3a3]"
                  }`}
                >
                  Cards
                </button>
                <button
                  onClick={() => setViewType("timeline")}
                  className={`rounded-lg px-3 py-1.5 text-xs ${
                    viewType === "timeline"
                      ? "bg-[#cb6b1e]/20 text-[#cb6b1e]"
                      : "text-[#737373] hover:text-[#a3a3a3]"
                  }`}
                >
                  Timeline
                </button>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="rounded-lg px-3 py-1.5 text-xs text-[#737373] hover:text-[#a3a3a3]"
                >
                  {showPreview ? "Hide" : "Show"} Preview
                </button>
              </div>
            </div>

            {/* Timeline View */}
            {viewType === "timeline" && (
              <div className="space-y-4">
                {/* Group by month */}
                {Array.from(
                  new Set(
                    filteredExperiments.map((e) => e.month || "Undated")
                  )
                ).map((month) => (
                  <div key={month} className="mb-8">
                    <h3 className="text-sm font-semibold text-[#cb6b1e] mb-3 uppercase tracking-wider">
                      {month}
                    </h3>
                    <div className="space-y-3 pl-4 border-l-2 border-[#2a2a2a]">
                      {filteredExperiments
                        .filter((e) => (e.month || "Undated") === month)
                        .map((exp) => (
                          <div
                            key={exp.id}
                            className={`-ml-[9px] pl-6 py-2 relative ${decisionColors[exp.decision]} rounded-r-lg border-l-0`}
                          >
                            <div
                              className={`absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 ${
                                exp.decision === "pending"
                                  ? "bg-[#1a1a1a] border-[#3a3a3a]"
                                  : exp.decision === "double_down"
                                    ? "bg-green-500 border-green-400"
                                    : exp.decision === "adjust"
                                      ? "bg-yellow-500 border-yellow-400"
                                      : "bg-red-500 border-red-400"
                              }`}
                            />
                            <p className="text-sm font-medium">
                              {exp.hypothesis || "No hypothesis"}
                            </p>
                            <p className="text-xs opacity-60 mt-1">
                              {exp.action || "No action"}
                            </p>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Cards View */}
            {viewType === "cards" && (
              <div className="space-y-6">
                {filteredExperiments.map((exp, idx) => {
                  // Find actual index in full list for reordering
                  const actualIdx = experiments.findIndex(
                    (e) => e.id === exp.id
                  );
                  return (
                    <div
                      key={exp.id}
                      className={`rounded-2xl border p-6 ${
                        exp.decision === "pending"
                          ? "border-[#1f1f1f] bg-[#0b0b0b]"
                          : decisionColors[exp.decision]
                      }`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">
                            {decisionIcons[exp.decision]}
                          </span>
                          <input
                            className={`${inputClass} w-32`}
                            value={exp.month}
                            onChange={(e) =>
                              updateExperiment(exp.id, "month", e.target.value)
                            }
                            placeholder="Month"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Reorder buttons */}
                          <div className="flex gap-1">
                            <button
                              onClick={() => moveExperiment(actualIdx, "up")}
                              disabled={actualIdx === 0}
                              className="rounded px-2 py-1 text-xs text-[#737373] hover:text-[#cb6b1e] disabled:opacity-30"
                            >
                              ↑
                            </button>
                            <button
                              onClick={() => moveExperiment(actualIdx, "down")}
                              disabled={actualIdx === experiments.length - 1}
                              className="rounded px-2 py-1 text-xs text-[#737373] hover:text-[#cb6b1e] disabled:opacity-30"
                            >
                              ↓
                            </button>
                          </div>
                          <select
                            className={`${inputClass} w-36`}
                            value={exp.decision}
                            onChange={(e) =>
                              updateExperiment(
                                exp.id,
                                "decision",
                                e.target.value as Experiment["decision"]
                              )
                            }
                          >
                            <option value="pending">Pending</option>
                            <option value="double_down">Double Down</option>
                            <option value="adjust">Adjust</option>
                            <option value="kill">Kill</option>
                          </select>
                          <button
                            onClick={() => removeExperiment(exp.id)}
                            className="rounded-lg border border-[#2a2a2a] px-3 py-2 text-xs text-[#737373] hover:border-red-500 hover:text-red-500"
                          >
                            ×
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-[#a3a3a3]">
                            Hypothesis
                          </label>
                          <textarea
                            rows={2}
                            className={inputClass}
                            value={exp.hypothesis}
                            onChange={(e) =>
                              updateExperiment(
                                exp.id,
                                "hypothesis",
                                e.target.value
                              )
                            }
                            placeholder="If we... then..."
                          />
                        </div>
                        <div>
                          <label className="text-xs text-[#a3a3a3]">
                            Action
                          </label>
                          <textarea
                            rows={2}
                            className={inputClass}
                            value={exp.action}
                            onChange={(e) =>
                              updateExperiment(exp.id, "action", e.target.value)
                            }
                            placeholder="What we did..."
                          />
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="text-xs text-[#a3a3a3]">Signal</label>
                        <input
                          className={inputClass}
                          value={exp.signal}
                          onChange={(e) =>
                            updateExperiment(exp.id, "signal", e.target.value)
                          }
                          placeholder="What we observed..."
                        />
                      </div>
                    </div>
                  );
                })}

                {filteredExperiments.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-[#262626] p-12 text-center">
                    <p className="text-[#737373]">
                      {filter === "all"
                        ? "No experiments yet."
                        : `No ${decisionLabels[filter].toLowerCase()} experiments.`}
                    </p>
                    <p className="text-xs text-[#3a3a3a] mt-1">
                      {filter === "all"
                        ? 'Click "New Experiment" to start tracking.'
                        : 'Try a different filter or add new experiments.'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        {/* Preview Panel */}
        {showPreview && (
          <aside className="fixed right-0 top-0 h-full w-80 border-l border-[#1a1a1a] bg-[#050505] overflow-y-auto pt-20 pb-8 px-4">
            <h2 className="text-sm font-semibold text-[#cb6b1e] uppercase tracking-wider mb-4">
              Experiment Summary
            </h2>

            {/* Progress Ring */}
            <div className="flex justify-center mb-6">
              <div className="relative w-24 h-24">
                <svg className="w-full h-full -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="#1a1a1a"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="#cb6b1e"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${completenessScore * 2.51} 251`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-semibold">
                    {completenessScore}%
                  </span>
                  <span className="text-xs text-[#737373]">Decided</span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#737373]">Total Experiments</span>
                <span className="font-semibold">{stats.total}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#737373]">🚀 Double Down</span>
                <span className="font-semibold text-green-400">
                  {stats.double_down}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#737373]">🔄 Adjust</span>
                <span className="font-semibold text-yellow-400">
                  {stats.adjust}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#737373]">🛑 Kill</span>
                <span className="font-semibold text-red-400">{stats.kill}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#737373]">⏳ Pending</span>
                <span className="font-semibold text-[#737373]">
                  {stats.pending}
                </span>
              </div>
            </div>

            {/* Quarter Context */}
            <div className="border-t border-[#1a1a1a] pt-4 mb-4">
              <p className="text-xs text-[#737373] uppercase tracking-wider mb-2">
                Current Quarter
              </p>
              <p className="text-sm text-[#cb6b1e]">
                {bosData.quarterly.currentQuarter || "Not set"}
              </p>
              <p className="text-xs text-[#737373] mt-2 line-clamp-3">
                Primary: {bosData.quarterly.primaryLever?.slice(0, 80) || "—"}
                {bosData.quarterly.primaryLever?.length > 80 ? "..." : ""}
              </p>
            </div>

            {/* Recent Experiments */}
            <div className="border-t border-[#1a1a1a] pt-4">
              <p className="text-xs text-[#737373] uppercase tracking-wider mb-3">
                Latest Activity
              </p>
              <div className="space-y-2">
                {experiments.slice(0, 3).map((exp) => (
                  <div
                    key={exp.id}
                    className={`rounded-lg p-2 text-xs ${decisionColors[exp.decision]}`}
                  >
                    <span className="mr-1">{decisionIcons[exp.decision]}</span>
                    {exp.hypothesis?.slice(0, 40) || "No hypothesis"}
                    {exp.hypothesis?.length > 40 ? "..." : ""}
                  </div>
                ))}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
