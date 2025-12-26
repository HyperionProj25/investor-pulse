"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import BizDevNav from "@/components/BizDevNav";
import { ADMIN_PERSONAS, ADMIN_SLUGS } from "@/lib/adminUsers";
import { BOSPayload, DEFAULT_BOS_PAYLOAD, Quarterly } from "@/lib/bos";

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];
const YEARS = ["2024", "2025", "2026", "2027"];

export default function QuarterlyPage() {
  const router = useRouter();
  const [authorizedAdmin, setAuthorizedAdmin] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bosData, setBosData] = useState<BOSPayload>(DEFAULT_BOS_PAYLOAD);
  const [form, setForm] = useState<Quarterly>(DEFAULT_BOS_PAYLOAD.quarterly);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [focusMode, setFocusMode] = useState(false);

  const adminLabel = useMemo(() => {
    if (!authorizedAdmin) return undefined;
    const admin = ADMIN_PERSONAS.find((p) => p.slug === authorizedAdmin);
    return admin?.shortLabel ?? admin?.name ?? authorizedAdmin;
  }, [authorizedAdmin]);

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
            setForm(data.payload.quarterly);
            if (data.payload.updatedAt) {
              setLastSaved(new Date(data.payload.updatedAt));
            }
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

  const updateForm = useCallback((updates: Partial<Quarterly>) => {
    setForm((prev) => ({ ...prev, ...updates }));
    setHasChanges(true);
  }, []);

  const updateSupportingLever = useCallback((index: number, value: string) => {
    setForm((prev) => ({
      ...prev,
      supportingLevers: prev.supportingLevers.map((l, i) =>
        i === index ? value : l
      ),
    }));
    setHasChanges(true);
  }, []);

  const addSupportingLever = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      supportingLevers: [...prev.supportingLevers, ""],
    }));
    setHasChanges(true);
  }, []);

  const removeSupportingLever = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      supportingLevers: prev.supportingLevers.filter((_, i) => i !== index),
    }));
    setHasChanges(true);
  }, []);

  const moveSupportingLever = useCallback(
    (index: number, direction: "up" | "down") => {
      setForm((prev) => {
        const newLevers = [...prev.supportingLevers];
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newLevers.length) return prev;
        [newLevers[index], newLevers[targetIndex]] = [
          newLevers[targetIndex],
          newLevers[index],
        ];
        return { ...prev, supportingLevers: newLevers };
      });
      setHasChanges(true);
    },
    []
  );

  const updateKillItem = useCallback((index: number, value: string) => {
    setForm((prev) => ({
      ...prev,
      killList: prev.killList.map((k, i) => (i === index ? value : k)),
    }));
    setHasChanges(true);
  }, []);

  const addKillItem = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      killList: [...prev.killList, ""],
    }));
    setHasChanges(true);
  }, []);

  const removeKillItem = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      killList: prev.killList.filter((_, i) => i !== index),
    }));
    setHasChanges(true);
  }, []);

  const handleSave = async () => {
    if (!authorizedAdmin) {
      toast.error("Admin access required");
      return;
    }

    setSaving(true);
    try {
      const payload: BOSPayload = {
        ...bosData,
        quarterly: form,
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
      setHasChanges(false);
      setLastSaved(new Date());
      toast.success("Quarterly saved!");
    } catch (err) {
      console.error("Save failed:", err);
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
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
    "w-full rounded-lg border border-[#2a2a2a] bg-[#090909] px-3 py-2 text-sm text-[#f6e1bd] focus:border-[#cb6b1e] focus:outline-none transition-colors";

  const filledLevers = form.supportingLevers.filter((l) => l.trim()).length;
  const filledKills = form.killList.filter((k) => k.trim()).length;

  // Focus Mode - clean view for meetings
  if (focusMode) {
    return (
      <div className="min-h-screen bg-[#020202] text-[#f6e1bd]">
        <div className="fixed top-4 right-4 z-50">
          <button
            onClick={() => setFocusMode(false)}
            className="rounded-lg bg-[#1a1a1a] px-4 py-2 text-sm text-[#a3a3a3] hover:bg-[#262626] transition-colors"
          >
            Exit Focus Mode
          </button>
        </div>

        <main className="mx-auto max-w-4xl px-8 py-16">
          {/* Quarter Badge */}
          <div className="text-center mb-12">
            <span className="inline-block rounded-full bg-[#cb6b1e] px-6 py-2 text-lg font-bold text-black">
              {form.currentQuarter || "Quarter Not Set"}
            </span>
            {form.theme && (
              <p className="mt-4 text-xl text-[#a3a3a3] italic">"{form.theme}"</p>
            )}
          </div>

          {/* Primary Lever - Hero */}
          <div className="mb-16">
            <p className="text-center text-xs uppercase tracking-[0.3em] text-[#cb6b1e] mb-4">
              Primary Lever
            </p>
            <div className="rounded-3xl border-2 border-[#cb6b1e] bg-gradient-to-br from-[#cb6b1e]/10 to-transparent p-8">
              <p className="text-2xl text-center leading-relaxed">
                {form.primaryLever || (
                  <span className="text-[#3a3a3a] italic">Not defined</span>
                )}
              </p>
            </div>
          </div>

          {/* Supporting Levers */}
          {filledLevers > 0 && (
            <div className="mb-12">
              <p className="text-center text-xs uppercase tracking-[0.3em] text-[#737373] mb-6">
                Supporting Levers
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {form.supportingLevers
                  .filter((l) => l.trim())
                  .map((lever, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-[#262626] bg-[#0a0a0a] p-4 text-center"
                    >
                      <span className="text-xs text-[#cb6b1e] font-semibold">
                        {idx + 1}
                      </span>
                      <p className="text-sm text-[#a3a3a3] mt-2">{lever}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Success / Failure */}
          <div className="grid grid-cols-2 gap-8 mb-12">
            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.2em] text-[#22c55e] mb-3">
                Success Looks Like
              </p>
              <p className="text-sm text-[#a3a3a3]">
                {form.successSignal || "—"}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.2em] text-[#ef4444] mb-3">
                Failure Looks Like
              </p>
              <p className="text-sm text-[#a3a3a3]">
                {form.failureSignal || "—"}
              </p>
            </div>
          </div>

          {/* Kill List */}
          {filledKills > 0 && (
            <div className="border-t border-[#262626] pt-8">
              <p className="text-center text-xs uppercase tracking-[0.3em] text-red-400 mb-4">
                Not This Quarter
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {form.killList
                  .filter((k) => k.trim())
                  .map((kill, idx) => (
                    <span
                      key={idx}
                      className="rounded-full border border-red-900/50 bg-red-950/20 px-4 py-1 text-xs text-red-400"
                    >
                      {kill}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020202] text-[#f6e1bd]">
      <BizDevNav adminLabel={adminLabel} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">◆</span>
              <h1 className="text-2xl font-semibold">Quarterly Lever System</h1>
              <span className="rounded-full bg-[#cb6b1e]/20 px-3 py-1 text-xs text-[#cb6b1e] font-semibold">
                Center of Gravity
              </span>
            </div>
            <p className="text-sm text-[#a3a3a3]">
              The levers we pull. Everything else supports this.
            </p>
            {lastSaved && (
              <p className="text-xs text-[#3a3a3a] mt-1">
                Last saved: {lastSaved.toLocaleString()}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setFocusMode(true)}
              className="rounded-lg border border-[#262626] px-4 py-2 text-sm text-[#a3a3a3] hover:border-[#cb6b1e] hover:text-[#cb6b1e] transition-colors"
            >
              Focus Mode
            </button>
            {hasChanges && (
              <span className="text-xs text-[#cb6b1e]">Unsaved changes</span>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="rounded-lg bg-[#cb6b1e] px-6 py-2 text-sm font-semibold text-black hover:bg-[#e37a2e] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quarter Selector & Theme */}
            <div className="rounded-2xl border border-[#cb6b1e]/30 bg-gradient-to-br from-[#cb6b1e]/5 to-transparent p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#cb6b1e]/20 text-[#cb6b1e] text-lg font-bold">
                  Q
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Quarter & Theme</h2>
                  <p className="text-xs text-[#737373]">
                    What quarter is this and what's the narrative?
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {QUARTERS.map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      const year =
                        form.currentQuarter.match(/\d{4}/)?.[0] ||
                        new Date().getFullYear().toString();
                      updateForm({ currentQuarter: `${q} ${year}` });
                    }}
                    className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
                      form.currentQuarter.startsWith(q)
                        ? "bg-[#cb6b1e] text-black"
                        : "bg-[#1a1a1a] text-[#a3a3a3] hover:bg-[#262626]"
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 mb-4">
                {YEARS.map((y) => (
                  <button
                    key={y}
                    onClick={() => {
                      const quarter =
                        form.currentQuarter.match(/Q[1-4]/)?.[0] || "Q1";
                      updateForm({ currentQuarter: `${quarter} ${y}` });
                    }}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                      form.currentQuarter.includes(y)
                        ? "bg-[#cb6b1e]/20 text-[#cb6b1e]"
                        : "bg-[#1a1a1a] text-[#737373] hover:bg-[#262626]"
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>

              <div>
                <label className="flex items-center justify-between text-xs text-[#a3a3a3] mb-1">
                  <span>Quarter Theme (the story)</span>
                  <span className="text-[#3a3a3a]">{form.theme.length} chars</span>
                </label>
                <textarea
                  rows={2}
                  className={inputClass}
                  value={form.theme}
                  onChange={(e) => updateForm({ theme: e.target.value })}
                  placeholder="What's the narrative? e.g., 'The quarter we prove product-market fit'"
                />
              </div>
            </div>

            {/* Primary Lever - THE HERO */}
            <div className="rounded-2xl border-2 border-[#cb6b1e] bg-gradient-to-br from-[#cb6b1e]/10 via-[#0b0b0b] to-[#0b0b0b] p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#cb6b1e]/5 rounded-full blur-3xl" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#cb6b1e] text-black text-2xl font-bold">
                    ◆
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[#cb6b1e]">
                      Primary Lever
                    </h2>
                    <p className="text-xs text-[#737373]">
                      The ONE thing. Everything else supports this or gets killed.
                    </p>
                  </div>
                </div>
                <textarea
                  rows={4}
                  className={`${inputClass} border-[#cb6b1e]/30 text-base`}
                  value={form.primaryLever}
                  onChange={(e) => updateForm({ primaryLever: e.target.value })}
                  placeholder="What is the single most important lever you're pulling this quarter? Be specific. This should be the answer to 'What matters most right now?'"
                />
              </div>
            </div>

            {/* Supporting Levers */}
            <div className="rounded-2xl border border-[#1f1f1f] bg-[#0b0b0b] p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#262626] text-[#a3a3a3] text-sm">
                    ↳
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Supporting Levers</h2>
                    <p className="text-xs text-[#737373]">
                      Max 3. Each must directly support the primary lever.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#3a3a3a]">
                    {filledLevers}/{form.supportingLevers.length}
                  </span>
                  <button
                    onClick={addSupportingLever}
                    disabled={form.supportingLevers.length >= 5}
                    className="rounded-lg border border-[#2a2a2a] px-3 py-1.5 text-xs text-[#a3a3a3] hover:border-[#cb6b1e] hover:text-[#cb6b1e] disabled:opacity-50 transition-colors"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {form.supportingLevers.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#262626] p-6 text-center">
                  <p className="text-sm text-[#737373]">No supporting levers.</p>
                  <p className="text-xs text-[#3a3a3a] mt-1">
                    What else needs to happen to enable the primary lever?
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {form.supportingLevers.map((lever, idx) => (
                    <div
                      key={idx}
                      className="group flex items-center gap-2 rounded-lg border border-[#1a1a1a] bg-[#050505] p-3 hover:border-[#262626] transition-colors"
                    >
                      <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => moveSupportingLever(idx, "up")}
                          disabled={idx === 0}
                          className="text-[10px] text-[#737373] hover:text-[#cb6b1e] disabled:opacity-30"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => moveSupportingLever(idx, "down")}
                          disabled={idx === form.supportingLevers.length - 1}
                          className="text-[10px] text-[#737373] hover:text-[#cb6b1e] disabled:opacity-30"
                        >
                          ▼
                        </button>
                      </div>
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold ${
                          lever.trim()
                            ? "bg-[#cb6b1e]/10 text-[#cb6b1e]"
                            : "bg-[#1a1a1a] text-[#737373]"
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <input
                        className="flex-1 bg-transparent text-sm text-[#f6e1bd] focus:outline-none placeholder:text-[#3a3a3a]"
                        value={lever}
                        onChange={(e) => updateSupportingLever(idx, e.target.value)}
                        placeholder={`Supporting lever ${idx + 1} → How does this enable the primary?`}
                      />
                      <button
                        onClick={() => removeSupportingLever(idx)}
                        className="rounded p-1 text-xs text-[#737373] opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 transition-all"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Kill List */}
            <div className="rounded-2xl border border-red-900/30 bg-gradient-to-br from-red-950/20 to-transparent p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-900/30 text-red-400 text-lg">
                    ✕
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-red-400">
                      Kill List
                    </h2>
                    <p className="text-xs text-[#737373]">
                      Explicit non-goals. What we're saying NO to this quarter.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#3a3a3a]">
                    {filledKills} items
                  </span>
                  <button
                    onClick={addKillItem}
                    className="rounded-lg border border-red-900/50 px-3 py-1.5 text-xs text-red-400 hover:bg-red-900/20 transition-colors"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {form.killList.length === 0 ? (
                <div className="rounded-xl border border-dashed border-red-900/30 p-6 text-center">
                  <p className="text-sm text-[#737373]">Nothing on the kill list.</p>
                  <p className="text-xs text-[#3a3a3a] mt-1">
                    What good ideas are you explicitly NOT pursuing?
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {form.killList.map((item, idx) => (
                    <div
                      key={idx}
                      className="group flex items-center gap-2 rounded-lg border border-red-900/20 bg-red-950/10 p-3 hover:border-red-900/40 transition-colors"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-900/30 text-xs text-red-400">
                        ✕
                      </span>
                      <input
                        className="flex-1 bg-transparent text-sm text-[#f6e1bd] focus:outline-none placeholder:text-[#5a3a3a]"
                        value={item}
                        onChange={(e) => updateKillItem(idx, e.target.value)}
                        placeholder="What are you NOT doing? Be specific."
                      />
                      <button
                        onClick={() => removeKillItem(idx)}
                        className="rounded p-1 text-xs text-[#737373] opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 transition-all"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Success & Failure Signals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-green-900/30 bg-gradient-to-br from-green-950/20 to-transparent p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-900/30 text-green-400 text-lg">
                    ✓
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-green-400">
                      Success Signal
                    </h2>
                    <p className="text-xs text-[#737373]">
                      What does winning look like?
                    </p>
                  </div>
                </div>
                <textarea
                  rows={4}
                  className={`${inputClass} border-green-900/30`}
                  value={form.successSignal}
                  onChange={(e) => updateForm({ successSignal: e.target.value })}
                  placeholder="At the end of this quarter, we'll know we won if..."
                />
              </div>

              <div className="rounded-2xl border border-red-900/30 bg-gradient-to-br from-red-950/20 to-transparent p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-900/30 text-red-400 text-lg">
                    !
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-red-400">
                      Failure Signal
                    </h2>
                    <p className="text-xs text-[#737373]">
                      What does losing look like?
                    </p>
                  </div>
                </div>
                <textarea
                  rows={4}
                  className={`${inputClass} border-red-900/30`}
                  value={form.failureSignal}
                  onChange={(e) => updateForm({ failureSignal: e.target.value })}
                  placeholder="We'll know we failed if..."
                />
              </div>
            </div>
          </div>

          {/* Right Column - Preview */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24 space-y-4">
              {/* Quarter Summary Card */}
              <div className="rounded-2xl border border-[#cb6b1e]/30 bg-gradient-to-br from-[#cb6b1e]/5 to-[#050505] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-[#cb6b1e] uppercase tracking-wider">
                    {form.currentQuarter || "Quarter"} Summary
                  </h3>
                </div>

                {/* Primary Lever Preview */}
                <div className="mb-6">
                  <p className="text-[10px] uppercase tracking-wider text-[#737373] mb-2">
                    Primary Lever
                  </p>
                  <div className="rounded-lg border border-[#cb6b1e]/30 bg-[#cb6b1e]/5 p-3">
                    <p className="text-sm text-[#f6e1bd] leading-relaxed">
                      {form.primaryLever || (
                        <span className="text-[#3a3a3a] italic">Not defined</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Supporting Levers Preview */}
                <div className="mb-6">
                  <p className="text-[10px] uppercase tracking-wider text-[#737373] mb-2">
                    Supporting ({filledLevers})
                  </p>
                  {filledLevers > 0 ? (
                    <ul className="space-y-1">
                      {form.supportingLevers
                        .filter((l) => l.trim())
                        .map((l, i) => (
                          <li
                            key={i}
                            className="text-xs text-[#a3a3a3] flex items-start gap-2"
                          >
                            <span className="text-[#cb6b1e]">{i + 1}.</span>
                            <span className="line-clamp-1">{l}</span>
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-[#3a3a3a] italic">None</p>
                  )}
                </div>

                {/* Kill List Preview */}
                {filledKills > 0 && (
                  <div className="mb-6 pt-4 border-t border-[#262626]">
                    <p className="text-[10px] uppercase tracking-wider text-red-400 mb-2">
                      Kill List ({filledKills})
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {form.killList
                        .filter((k) => k.trim())
                        .slice(0, 3)
                        .map((k, i) => (
                          <span
                            key={i}
                            className="rounded bg-red-900/20 px-2 py-0.5 text-[10px] text-red-400"
                          >
                            {k.length > 20 ? k.slice(0, 20) + "..." : k}
                          </span>
                        ))}
                      {filledKills > 3 && (
                        <span className="text-[10px] text-[#3a3a3a]">
                          +{filledKills - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Signals Preview */}
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[#262626]">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-green-400 mb-1">
                      Win
                    </p>
                    <p className="text-[10px] text-[#a3a3a3] line-clamp-2">
                      {form.successSignal || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-red-400 mb-1">
                      Lose
                    </p>
                    <p className="text-[10px] text-[#a3a3a3] line-clamp-2">
                      {form.failureSignal || "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Completeness */}
              <div className="rounded-xl border border-[#262626] bg-[#050505] p-4">
                <p className="text-xs text-[#737373] mb-3">Completeness</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#a3a3a3]">Quarter Set</span>
                    <span
                      className={
                        form.currentQuarter &&
                        !form.currentQuarter.includes("_")
                          ? "text-[#22c55e]"
                          : "text-[#3a3a3a]"
                      }
                    >
                      {form.currentQuarter && !form.currentQuarter.includes("_")
                        ? "✓"
                        : "○"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#a3a3a3]">Primary Lever</span>
                    <span
                      className={
                        form.primaryLever ? "text-[#22c55e]" : "text-[#3a3a3a]"
                      }
                    >
                      {form.primaryLever ? "✓" : "○"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#a3a3a3]">Supporting Levers</span>
                    <span
                      className={
                        filledLevers >= 1 ? "text-[#22c55e]" : "text-[#eab308]"
                      }
                    >
                      {filledLevers}/3
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#a3a3a3]">Kill List</span>
                    <span
                      className={
                        filledKills >= 1 ? "text-[#22c55e]" : "text-[#eab308]"
                      }
                    >
                      {filledKills} items
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#a3a3a3]">Success Signal</span>
                    <span
                      className={
                        form.successSignal ? "text-[#22c55e]" : "text-[#3a3a3a]"
                      }
                    >
                      {form.successSignal ? "✓" : "○"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#a3a3a3]">Failure Signal</span>
                    <span
                      className={
                        form.failureSignal ? "text-[#22c55e]" : "text-[#3a3a3a]"
                      }
                    >
                      {form.failureSignal ? "✓" : "○"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="rounded-xl border border-[#262626] bg-[#050505] p-4">
                <p className="text-xs text-[#737373] mb-3">Quick Actions</p>
                <button
                  onClick={() => setFocusMode(true)}
                  className="w-full rounded-lg border border-[#262626] py-2 text-xs text-[#a3a3a3] hover:border-[#cb6b1e] hover:text-[#cb6b1e] transition-colors"
                >
                  Enter Focus Mode (for meetings)
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
