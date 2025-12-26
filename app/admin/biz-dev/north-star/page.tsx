"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import BizDevNav from "@/components/BizDevNav";
import { ADMIN_PERSONAS, ADMIN_SLUGS } from "@/lib/adminUsers";
import { BOSPayload, DEFAULT_BOS_PAYLOAD, NorthStar } from "@/lib/bos";

export default function NorthStarPage() {
  const router = useRouter();
  const [authorizedAdmin, setAuthorizedAdmin] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bosData, setBosData] = useState<BOSPayload>(DEFAULT_BOS_PAYLOAD);
  const [form, setForm] = useState<NorthStar>(DEFAULT_BOS_PAYLOAD.northStar);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

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
            setForm(data.payload.northStar);
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

  const updateForm = useCallback((updates: Partial<NorthStar>) => {
    setForm((prev) => ({ ...prev, ...updates }));
    setHasChanges(true);
  }, []);

  const updatePrinciple = useCallback((index: number, value: string) => {
    setForm((prev) => ({
      ...prev,
      principles: prev.principles.map((p, i) => (i === index ? value : p)),
    }));
    setHasChanges(true);
  }, []);

  const addPrinciple = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      principles: [...prev.principles, ""],
    }));
    setHasChanges(true);
  }, []);

  const removePrinciple = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      principles: prev.principles.filter((_, i) => i !== index),
    }));
    setHasChanges(true);
  }, []);

  const movePrinciple = useCallback((index: number, direction: "up" | "down") => {
    setForm((prev) => {
      const newPrinciples = [...prev.principles];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newPrinciples.length) return prev;
      [newPrinciples[index], newPrinciples[targetIndex]] = [
        newPrinciples[targetIndex],
        newPrinciples[index],
      ];
      return { ...prev, principles: newPrinciples };
    });
    setHasChanges(true);
  }, []);

  const updateAdvantage = useCallback((index: number, value: string) => {
    setForm((prev) => ({
      ...prev,
      unfairAdvantages: prev.unfairAdvantages.map((a, i) =>
        i === index ? value : a
      ),
    }));
    setHasChanges(true);
  }, []);

  const addAdvantage = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      unfairAdvantages: [...prev.unfairAdvantages, ""],
    }));
    setHasChanges(true);
  }, []);

  const removeAdvantage = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      unfairAdvantages: prev.unfairAdvantages.filter((_, i) => i !== index),
    }));
    setHasChanges(true);
  }, []);

  const moveAdvantage = useCallback((index: number, direction: "up" | "down") => {
    setForm((prev) => {
      const newAdvantages = [...prev.unfairAdvantages];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newAdvantages.length) return prev;
      [newAdvantages[index], newAdvantages[targetIndex]] = [
        newAdvantages[targetIndex],
        newAdvantages[index],
      ];
      return { ...prev, unfairAdvantages: newAdvantages };
    });
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
        northStar: form,
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
      toast.success("North Star saved!");
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

  const filledPrinciples = form.principles.filter((p) => p.trim()).length;
  const filledAdvantages = form.unfairAdvantages.filter((a) => a.trim()).length;

  return (
    <div className="min-h-screen bg-[#020202] text-[#f6e1bd]">
      <BizDevNav adminLabel={adminLabel} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">★</span>
              <h1 className="text-2xl font-semibold">North Star</h1>
            </div>
            <p className="text-sm text-[#a3a3a3]">
              The foundation. Everything else flows from here.
            </p>
            {lastSaved && (
              <p className="text-xs text-[#3a3a3a] mt-1">
                Last saved: {lastSaved.toLocaleString()}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
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
          {/* Left Column - Forms */}
          <div className="lg:col-span-2 space-y-6">
            {/* Mission */}
            <div className="rounded-2xl border border-[#1f1f1f] bg-[#0b0b0b] p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#cb6b1e]/10 text-[#cb6b1e] text-sm">
                  M
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold">Mission</h2>
                  <p className="text-xs text-[#737373]">
                    What we do today. Why we exist. Keep it to one paragraph.
                  </p>
                </div>
                <span className="text-xs text-[#3a3a3a]">
                  {form.mission.length} chars
                </span>
              </div>
              <textarea
                rows={4}
                className={inputClass}
                value={form.mission}
                onChange={(e) => updateForm({ mission: e.target.value })}
                placeholder="We exist to... Our mission is to..."
              />
            </div>

            {/* Vision */}
            <div className="rounded-2xl border border-[#1f1f1f] bg-[#0b0b0b] p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3b82f6]/10 text-[#3b82f6] text-sm">
                  V
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold">Vision</h2>
                  <p className="text-xs text-[#737373]">
                    If we win, this is the world we create. The future state.
                  </p>
                </div>
                <span className="text-xs text-[#3a3a3a]">
                  {form.vision.length} chars
                </span>
              </div>
              <textarea
                rows={4}
                className={inputClass}
                value={form.vision}
                onChange={(e) => updateForm({ vision: e.target.value })}
                placeholder="In the future we're building... When we succeed..."
              />
            </div>

            {/* Principles */}
            <div className="rounded-2xl border border-[#1f1f1f] bg-[#0b0b0b] p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#22c55e]/10 text-[#22c55e] text-sm">
                    P
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Principles</h2>
                    <p className="text-xs text-[#737373]">
                      Non-negotiables. How we operate. What we won't compromise on.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#3a3a3a]">
                    {filledPrinciples} of {form.principles.length}
                  </span>
                  <button
                    onClick={addPrinciple}
                    className="rounded-lg border border-[#2a2a2a] px-3 py-1.5 text-xs text-[#a3a3a3] hover:border-[#cb6b1e] hover:text-[#cb6b1e] transition-colors"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {form.principles.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#262626] p-6 text-center">
                  <p className="text-sm text-[#737373]">No principles yet.</p>
                  <p className="text-xs text-[#3a3a3a] mt-1">
                    What are the non-negotiable rules of how you operate?
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {form.principles.map((principle, idx) => (
                    <div
                      key={idx}
                      className="group flex items-center gap-2 rounded-lg border border-[#1a1a1a] bg-[#050505] p-2 hover:border-[#262626] transition-colors"
                    >
                      <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => movePrinciple(idx, "up")}
                          disabled={idx === 0}
                          className="text-[10px] text-[#737373] hover:text-[#cb6b1e] disabled:opacity-30"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => movePrinciple(idx, "down")}
                          disabled={idx === form.principles.length - 1}
                          className="text-[10px] text-[#737373] hover:text-[#cb6b1e] disabled:opacity-30"
                        >
                          ▼
                        </button>
                      </div>
                      <span className="flex h-6 w-6 items-center justify-center rounded bg-[#1a1a1a] text-xs text-[#737373]">
                        {idx + 1}
                      </span>
                      <input
                        className="flex-1 bg-transparent text-sm text-[#f6e1bd] focus:outline-none placeholder:text-[#3a3a3a]"
                        value={principle}
                        onChange={(e) => updatePrinciple(idx, e.target.value)}
                        placeholder={`Principle ${idx + 1} - e.g., "Clarity over complexity"`}
                      />
                      <button
                        onClick={() => removePrinciple(idx)}
                        className="rounded p-1 text-xs text-[#737373] opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 transition-all"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Unfair Advantages */}
            <div className="rounded-2xl border border-[#1f1f1f] bg-[#0b0b0b] p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#a855f7]/10 text-[#a855f7] text-sm">
                    U
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Unfair Advantages</h2>
                    <p className="text-xs text-[#737373]">
                      What makes us uniquely positioned to win. Things competitors can't easily copy.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#3a3a3a]">
                    {filledAdvantages} of {form.unfairAdvantages.length}
                  </span>
                  <button
                    onClick={addAdvantage}
                    className="rounded-lg border border-[#2a2a2a] px-3 py-1.5 text-xs text-[#a3a3a3] hover:border-[#cb6b1e] hover:text-[#cb6b1e] transition-colors"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {form.unfairAdvantages.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#262626] p-6 text-center">
                  <p className="text-sm text-[#737373]">No unfair advantages listed.</p>
                  <p className="text-xs text-[#3a3a3a] mt-1">
                    What do you have that others don't?
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {form.unfairAdvantages.map((advantage, idx) => (
                    <div
                      key={idx}
                      className="group flex items-center gap-2 rounded-lg border border-[#1a1a1a] bg-[#050505] p-2 hover:border-[#262626] transition-colors"
                    >
                      <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => moveAdvantage(idx, "up")}
                          disabled={idx === 0}
                          className="text-[10px] text-[#737373] hover:text-[#cb6b1e] disabled:opacity-30"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => moveAdvantage(idx, "down")}
                          disabled={idx === form.unfairAdvantages.length - 1}
                          className="text-[10px] text-[#737373] hover:text-[#cb6b1e] disabled:opacity-30"
                        >
                          ▼
                        </button>
                      </div>
                      <span className="flex h-6 w-6 items-center justify-center rounded bg-[#a855f7]/10 text-xs text-[#a855f7]">
                        ✦
                      </span>
                      <input
                        className="flex-1 bg-transparent text-sm text-[#f6e1bd] focus:outline-none placeholder:text-[#3a3a3a]"
                        value={advantage}
                        onChange={(e) => updateAdvantage(idx, e.target.value)}
                        placeholder={`Advantage ${idx + 1} - e.g., "Deep domain expertise"`}
                      />
                      <button
                        onClick={() => removeAdvantage(idx)}
                        className="rounded p-1 text-xs text-[#737373] opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 transition-all"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* If Not True Test */}
            <div className="rounded-2xl border border-[#cb6b1e]/30 bg-gradient-to-br from-[#cb6b1e]/5 to-transparent p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#cb6b1e]/20 text-[#cb6b1e] text-sm">
                  !
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-[#cb6b1e]">
                    "If This Isn't True, Nothing Else Matters"
                  </h2>
                  <p className="text-xs text-[#737373]">
                    The fundamental assumption. If this fails, the whole thesis fails. What must be true?
                  </p>
                </div>
                <span className="text-xs text-[#3a3a3a]">
                  {form.ifNotTrueTest.length} chars
                </span>
              </div>
              <textarea
                rows={4}
                className={`${inputClass} border-[#cb6b1e]/20`}
                value={form.ifNotTrueTest}
                onChange={(e) => updateForm({ ifNotTrueTest: e.target.value })}
                placeholder="If [this assumption] isn't true, then [consequence]. We believe [assumption] because [evidence]."
              />
            </div>
          </div>

          {/* Right Column - Live Preview */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24 space-y-4">
              <div className="rounded-2xl border border-[#262626] bg-[#050505] p-6">
                <h3 className="text-sm font-semibold text-[#cb6b1e] mb-4 uppercase tracking-wider">
                  Live Preview
                </h3>

                {/* Mission Preview */}
                <div className="mb-6">
                  <p className="text-[10px] uppercase tracking-wider text-[#737373] mb-1">
                    Mission
                  </p>
                  <p className="text-sm text-[#f6e1bd] leading-relaxed">
                    {form.mission || (
                      <span className="text-[#3a3a3a] italic">Not set</span>
                    )}
                  </p>
                </div>

                {/* Vision Preview */}
                <div className="mb-6">
                  <p className="text-[10px] uppercase tracking-wider text-[#737373] mb-1">
                    Vision
                  </p>
                  <p className="text-sm text-[#f6e1bd] leading-relaxed">
                    {form.vision || (
                      <span className="text-[#3a3a3a] italic">Not set</span>
                    )}
                  </p>
                </div>

                {/* Principles Preview */}
                <div className="mb-6">
                  <p className="text-[10px] uppercase tracking-wider text-[#737373] mb-2">
                    Principles ({filledPrinciples})
                  </p>
                  {filledPrinciples > 0 ? (
                    <ul className="space-y-1">
                      {form.principles
                        .filter((p) => p.trim())
                        .map((p, i) => (
                          <li
                            key={i}
                            className="text-xs text-[#a3a3a3] flex items-start gap-2"
                          >
                            <span className="text-[#22c55e]">•</span>
                            <span>{p}</span>
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-[#3a3a3a] italic">None added</p>
                  )}
                </div>

                {/* Unfair Advantages Preview */}
                <div className="mb-6">
                  <p className="text-[10px] uppercase tracking-wider text-[#737373] mb-2">
                    Unfair Advantages ({filledAdvantages})
                  </p>
                  {filledAdvantages > 0 ? (
                    <ul className="space-y-1">
                      {form.unfairAdvantages
                        .filter((a) => a.trim())
                        .map((a, i) => (
                          <li
                            key={i}
                            className="text-xs text-[#a3a3a3] flex items-start gap-2"
                          >
                            <span className="text-[#a855f7]">✦</span>
                            <span>{a}</span>
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-[#3a3a3a] italic">None added</p>
                  )}
                </div>

                {/* Core Test Preview */}
                <div className="pt-4 border-t border-[#262626]">
                  <p className="text-[10px] uppercase tracking-wider text-[#cb6b1e] mb-1">
                    Core Test
                  </p>
                  <p className="text-xs text-[#a3a3a3] leading-relaxed">
                    {form.ifNotTrueTest || (
                      <span className="text-[#3a3a3a] italic">Not set</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="rounded-xl border border-[#262626] bg-[#050505] p-4">
                <p className="text-xs text-[#737373] mb-3">Completeness</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#a3a3a3]">Mission</span>
                    <span className={form.mission ? "text-[#22c55e]" : "text-[#3a3a3a]"}>
                      {form.mission ? "✓" : "○"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#a3a3a3]">Vision</span>
                    <span className={form.vision ? "text-[#22c55e]" : "text-[#3a3a3a]"}>
                      {form.vision ? "✓" : "○"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#a3a3a3]">Principles</span>
                    <span className={filledPrinciples >= 3 ? "text-[#22c55e]" : "text-[#eab308]"}>
                      {filledPrinciples}/3+
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#a3a3a3]">Advantages</span>
                    <span className={filledAdvantages >= 3 ? "text-[#22c55e]" : "text-[#eab308]"}>
                      {filledAdvantages}/3+
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#a3a3a3]">Core Test</span>
                    <span className={form.ifNotTrueTest ? "text-[#22c55e]" : "text-[#3a3a3a]"}>
                      {form.ifNotTrueTest ? "✓" : "○"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
