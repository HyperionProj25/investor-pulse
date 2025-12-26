"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import BizDevNav from "@/components/BizDevNav";
import { ADMIN_PERSONAS, ADMIN_SLUGS } from "@/lib/adminUsers";
import { BOSPayload, DEFAULT_BOS_PAYLOAD, Weekly } from "@/lib/bos";

interface WeeklyHistoryEntry {
  id: string;
  weekLabel: string;
  data: Weekly;
  createdAt: string;
}

export default function WeeklyPage() {
  const router = useRouter();
  const [authorizedAdmin, setAuthorizedAdmin] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bosData, setBosData] = useState<BOSPayload>(DEFAULT_BOS_PAYLOAD);
  const [form, setForm] = useState<Weekly>(DEFAULT_BOS_PAYLOAD.weekly);
  const [originalForm, setOriginalForm] = useState<Weekly>(
    DEFAULT_BOS_PAYLOAD.weekly
  );
  const [focusMode, setFocusMode] = useState(false);
  const [weekHistory, setWeekHistory] = useState<WeeklyHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const adminLabel = useMemo(() => {
    if (!authorizedAdmin) return undefined;
    const admin = ADMIN_PERSONAS.find((p) => p.slug === authorizedAdmin);
    return admin?.shortLabel ?? admin?.name ?? authorizedAdmin;
  }, [authorizedAdmin]);

  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(originalForm);
  }, [form, originalForm]);

  const completenessScore = useMemo(() => {
    const fields = [
      form.currentWeek,
      form.movedPrimaryLever,
      form.surprises,
      form.frictionIncreasing,
      form.founderDecisionNeeded,
    ];
    const filledCount = fields.filter((f) => f && f.trim().length > 0).length;
    return Math.round((filledCount / fields.length) * 100);
  }, [form]);

  const completenessItems = useMemo(() => {
    return [
      { label: "Week label", complete: !!form.currentWeek?.trim() },
      { label: "Primary lever progress", complete: !!form.movedPrimaryLever?.trim() },
      { label: "Surprises", complete: !!form.surprises?.trim() },
      { label: "Friction points", complete: !!form.frictionIncreasing?.trim() },
      { label: "Founder decisions", complete: !!form.founderDecisionNeeded?.trim() },
    ];
  }, [form]);

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
            setForm(data.payload.weekly);
            setOriginalForm(data.payload.weekly);
          }
        }
        // Load week history from localStorage
        const savedHistory = localStorage.getItem("bos-weekly-history");
        if (savedHistory) {
          setWeekHistory(JSON.parse(savedHistory));
        }
      } catch (err) {
        console.error("Load failed:", err);
      } finally {
        setLoading(false);
      }
    };
    if (authorizedAdmin) void loadData();
  }, [authorizedAdmin]);

  const archiveCurrentWeek = () => {
    if (!form.currentWeek?.trim()) {
      toast.error("Please add a week label before archiving");
      return;
    }

    const entry: WeeklyHistoryEntry = {
      id: `week-${Date.now()}`,
      weekLabel: form.currentWeek,
      data: { ...form },
      createdAt: new Date().toISOString(),
    };

    const newHistory = [entry, ...weekHistory].slice(0, 12); // Keep last 12 weeks
    setWeekHistory(newHistory);
    localStorage.setItem("bos-weekly-history", JSON.stringify(newHistory));
    toast.success("Week archived to history");
  };

  const loadFromHistory = (entry: WeeklyHistoryEntry) => {
    setForm(entry.data);
    setShowHistory(false);
    toast.success(`Loaded: ${entry.weekLabel}`);
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
        weekly: form,
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
      setOriginalForm(form);
      toast.success("Weekly saved!");
    } catch (err) {
      console.error("Save failed:", err);
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const clearWeekly = () => {
    setForm({
      currentWeek: "",
      movedPrimaryLever: "",
      surprises: "",
      frictionIncreasing: "",
      founderDecisionNeeded: "",
    });
  };

  const startNewWeek = () => {
    // Archive current if it has content
    if (form.currentWeek?.trim() && form.movedPrimaryLever?.trim()) {
      archiveCurrentWeek();
    }

    // Generate new week label
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const newWeekLabel = `Week of ${monthNames[weekStart.getMonth()]} ${weekStart.getDate()}, ${weekStart.getFullYear()}`;

    setForm({
      currentWeek: newWeekLabel,
      movedPrimaryLever: "",
      surprises: "",
      frictionIncreasing: "",
      founderDecisionNeeded: "",
    });
  };

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

  // Focus Mode View - Clean presentation for meetings
  if (focusMode) {
    return (
      <div className="min-h-screen bg-[#020202] text-[#f6e1bd]">
        {/* Minimal Header */}
        <div className="border-b border-[#1a1a1a] px-6 py-4">
          <div className="mx-auto max-w-4xl flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">Weekly Check-In</h1>
              <p className="text-sm text-[#cb6b1e]">
                {form.currentWeek || "No week set"}
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

        {/* Quarter Context */}
        <div className="border-b border-[#1a1a1a] px-6 py-3 bg-[#0a0a0a]">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-xs text-[#737373] uppercase tracking-wider">
              {bosData.quarterly.currentQuarter || "Current Quarter"} Primary Lever
            </p>
            <p className="text-sm text-[#f6e1bd] mt-1">
              {bosData.quarterly.primaryLever?.slice(0, 150) || "Not defined"}
              {bosData.quarterly.primaryLever?.length > 150 ? "..." : ""}
            </p>
          </div>
        </div>

        {/* Focus Content */}
        <main className="mx-auto max-w-4xl px-6 py-8">
          <div className="space-y-8">
            {/* Question 1 - Primary Focus */}
            <div className="rounded-2xl border border-[#cb6b1e]/30 bg-gradient-to-br from-[#cb6b1e]/10 to-transparent p-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#cb6b1e] text-lg font-semibold text-black">
                  1
                </span>
                <h2 className="text-xl font-semibold">
                  What moved the primary lever?
                </h2>
              </div>
              <p className="text-[#f6e1bd] whitespace-pre-wrap text-lg leading-relaxed">
                {form.movedPrimaryLever || "No progress recorded"}
              </p>
            </div>

            {/* Question 2 */}
            <div className="rounded-2xl border border-[#1f1f1f] bg-[#0b0b0b] p-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1a1a1a] text-lg font-semibold text-[#cb6b1e]">
                  2
                </span>
                <h2 className="text-xl font-semibold">What surprised us?</h2>
              </div>
              <p className="text-[#a3a3a3] whitespace-pre-wrap text-lg leading-relaxed">
                {form.surprises || "Nothing recorded"}
              </p>
            </div>

            {/* Question 3 */}
            <div className="rounded-2xl border border-yellow-900/30 bg-yellow-950/10 p-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-900/50 text-lg font-semibold text-yellow-400">
                  3
                </span>
                <h2 className="text-xl font-semibold text-yellow-400">
                  Where is friction increasing?
                </h2>
              </div>
              <p className="text-yellow-200/80 whitespace-pre-wrap text-lg leading-relaxed">
                {form.frictionIncreasing || "Nothing recorded"}
              </p>
            </div>

            {/* Question 4 */}
            <div className="rounded-2xl border border-red-900/30 bg-red-950/10 p-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-900/50 text-lg font-semibold text-red-400">
                  4
                </span>
                <h2 className="text-xl font-semibold text-red-400">
                  What requires a founder decision?
                </h2>
              </div>
              <p className="text-red-200/80 whitespace-pre-wrap text-lg leading-relaxed">
                {form.founderDecisionNeeded || "No decisions pending"}
              </p>
            </div>
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
        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8 mr-80">
          <div className="mx-auto max-w-3xl">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-semibold">
                    Weekly Founder Control Panel
                  </h1>
                  {hasUnsavedChanges && (
                    <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-400">
                      Unsaved
                    </span>
                  )}
                </div>
                <p className="text-sm text-[#a3a3a3]">
                  Four questions. No task lists. Clarity only.
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
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>

            {/* Week Controls */}
            <div className="mb-6 flex items-center gap-3">
              <input
                className={`${inputClass} flex-1 text-center text-lg font-semibold`}
                value={form.currentWeek}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, currentWeek: e.target.value }))
                }
                placeholder="Week of January 1, 2025"
              />
              <button
                onClick={startNewWeek}
                className="rounded-lg border border-green-900/50 bg-green-950/20 px-4 py-2 text-sm text-green-400 hover:bg-green-950/40"
              >
                New Week
              </button>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="rounded-lg border border-[#2a2a2a] px-4 py-2 text-sm text-[#737373] hover:border-[#cb6b1e] hover:text-[#cb6b1e]"
              >
                History
              </button>
              <button
                onClick={clearWeekly}
                className="rounded-lg border border-[#2a2a2a] px-3 py-2 text-sm text-[#737373] hover:border-red-500 hover:text-red-400"
              >
                Clear
              </button>
            </div>

            {/* Week History Panel */}
            {showHistory && weekHistory.length > 0 && (
              <div className="mb-6 rounded-xl border border-[#2a2a2a] bg-[#0a0a0a] p-4">
                <h3 className="text-sm font-semibold text-[#cb6b1e] mb-3">
                  Previous Weeks
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {weekHistory.map((entry) => (
                    <button
                      key={entry.id}
                      onClick={() => loadFromHistory(entry)}
                      className="w-full text-left rounded-lg border border-[#1a1a1a] bg-[#050505] p-3 hover:border-[#cb6b1e] transition-colors"
                    >
                      <p className="text-sm font-medium">{entry.weekLabel}</p>
                      <p className="text-xs text-[#737373] mt-1 line-clamp-1">
                        {entry.data.movedPrimaryLever || "No progress recorded"}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showHistory && weekHistory.length === 0 && (
              <div className="mb-6 rounded-xl border border-dashed border-[#262626] bg-[#0a0a0a] p-4 text-center">
                <p className="text-sm text-[#737373]">No previous weeks archived</p>
                <p className="text-xs text-[#3a3a3a] mt-1">
                  Click "New Week" to archive the current week and start fresh
                </p>
              </div>
            )}

            {/* The Four Questions */}
            <div className="space-y-6">
              {/* Question 1 */}
              <div className="rounded-2xl border border-[#cb6b1e]/30 bg-[#cb6b1e]/5 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#cb6b1e] text-sm font-semibold text-black">
                    1
                  </span>
                  <h2 className="text-lg font-semibold">
                    What moved the primary lever?
                  </h2>
                </div>
                <p className="text-xs text-[#737373] mb-3">
                  Reference your quarterly primary lever. What concrete progress
                  was made?
                </p>
                <textarea
                  rows={4}
                  className={inputClass}
                  value={form.movedPrimaryLever}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      movedPrimaryLever: e.target.value,
                    }))
                  }
                  placeholder="This week, we..."
                />
                <p className="text-xs text-[#3a3a3a] mt-2 text-right">
                  {form.movedPrimaryLever?.length || 0} characters
                </p>
              </div>

              {/* Question 2 */}
              <div className="rounded-2xl border border-[#1f1f1f] bg-[#0b0b0b] p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1a1a1a] text-sm font-semibold text-[#cb6b1e]">
                    2
                  </span>
                  <h2 className="text-lg font-semibold">What surprised us?</h2>
                </div>
                <p className="text-xs text-[#737373] mb-3">
                  Unexpected learnings, customer feedback, market signals. Good
                  or bad.
                </p>
                <textarea
                  rows={4}
                  className={inputClass}
                  value={form.surprises}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, surprises: e.target.value }))
                  }
                  placeholder="We didn't expect..."
                />
                <p className="text-xs text-[#3a3a3a] mt-2 text-right">
                  {form.surprises?.length || 0} characters
                </p>
              </div>

              {/* Question 3 */}
              <div className="rounded-2xl border border-yellow-900/30 bg-yellow-950/10 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-900/50 text-sm font-semibold text-yellow-400">
                    3
                  </span>
                  <h2 className="text-lg font-semibold text-yellow-400">
                    Where is friction increasing?
                  </h2>
                </div>
                <p className="text-xs text-[#737373] mb-3">
                  Bottlenecks, slowdowns, frustrations. Where is the system
                  straining?
                </p>
                <textarea
                  rows={4}
                  className={inputClass}
                  value={form.frictionIncreasing}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      frictionIncreasing: e.target.value,
                    }))
                  }
                  placeholder="Friction is building around..."
                />
                <p className="text-xs text-[#3a3a3a] mt-2 text-right">
                  {form.frictionIncreasing?.length || 0} characters
                </p>
              </div>

              {/* Question 4 */}
              <div className="rounded-2xl border border-red-900/30 bg-red-950/10 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-900/50 text-sm font-semibold text-red-400">
                    4
                  </span>
                  <h2 className="text-lg font-semibold text-red-400">
                    What requires a founder decision?
                  </h2>
                </div>
                <p className="text-xs text-[#737373] mb-3">
                  Decisions that can't be delegated. Strategic choices only the
                  founder can make.
                </p>
                <textarea
                  rows={4}
                  className={inputClass}
                  value={form.founderDecisionNeeded}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      founderDecisionNeeded: e.target.value,
                    }))
                  }
                  placeholder="I need to decide..."
                />
                <p className="text-xs text-[#3a3a3a] mt-2 text-right">
                  {form.founderDecisionNeeded?.length || 0} characters
                </p>
              </div>
            </div>
          </div>
        </main>

        {/* Preview Panel */}
        <aside className="fixed right-0 top-0 h-full w-80 border-l border-[#1a1a1a] bg-[#050505] overflow-y-auto pt-20 pb-8 px-4">
          <h2 className="text-sm font-semibold text-[#cb6b1e] uppercase tracking-wider mb-4">
            Weekly Summary
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
                  stroke={completenessScore === 100 ? "#22c55e" : "#cb6b1e"}
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${completenessScore * 2.51} 251`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-semibold">{completenessScore}%</span>
                <span className="text-xs text-[#737373]">Complete</span>
              </div>
            </div>
          </div>

          {/* Completeness Checklist */}
          <div className="space-y-2 mb-6">
            {completenessItems.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2 text-sm"
              >
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded-full text-xs ${
                    item.complete
                      ? "bg-green-500/20 text-green-400"
                      : "bg-[#1a1a1a] text-[#3a3a3a]"
                  }`}
                >
                  {item.complete ? "✓" : "○"}
                </span>
                <span
                  className={item.complete ? "text-[#a3a3a3]" : "text-[#737373]"}
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          {/* Quarter Context */}
          <div className="border-t border-[#1a1a1a] pt-4 mb-4">
            <p className="text-xs text-[#737373] uppercase tracking-wider mb-2">
              Current Quarter Context
            </p>
            <p className="text-sm text-[#cb6b1e]">
              {bosData.quarterly.currentQuarter || "Not set"}
            </p>
            <p className="text-sm text-[#a3a3a3] mt-2">
              <span className="text-[#737373]">Primary Lever:</span>
            </p>
            <p className="text-xs text-[#737373] mt-1 line-clamp-4">
              {bosData.quarterly.primaryLever?.slice(0, 150) || "Not set"}
              {bosData.quarterly.primaryLever?.length > 150 ? "..." : ""}
            </p>
          </div>

          {/* Preview Snippets */}
          <div className="border-t border-[#1a1a1a] pt-4 space-y-4">
            <div>
              <p className="text-xs text-[#cb6b1e] mb-1">Lever Progress</p>
              <p className="text-xs text-[#a3a3a3] line-clamp-2">
                {form.movedPrimaryLever || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#737373] mb-1">Surprises</p>
              <p className="text-xs text-[#a3a3a3] line-clamp-2">
                {form.surprises || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-yellow-400 mb-1">Friction</p>
              <p className="text-xs text-[#a3a3a3] line-clamp-2">
                {form.frictionIncreasing || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-red-400 mb-1">Decisions Needed</p>
              <p className="text-xs text-[#a3a3a3] line-clamp-2">
                {form.founderDecisionNeeded || "—"}
              </p>
            </div>
          </div>

          {/* Week History Count */}
          {weekHistory.length > 0 && (
            <div className="border-t border-[#1a1a1a] pt-4 mt-4">
              <p className="text-xs text-[#737373]">
                {weekHistory.length} week{weekHistory.length !== 1 ? "s" : ""} archived
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
