"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import BizDevNav from "@/components/BizDevNav";
import { ADMIN_PERSONAS, ADMIN_SLUGS } from "@/lib/adminUsers";
import {
  BOSPayload,
  DEFAULT_BOS_PAYLOAD,
  TimeHorizons,
  TheBet,
  TheProof,
  ProofSignal,
  generateBOSId,
} from "@/lib/bos";

type ActiveTab = "horizons" | "bet" | "proof";

const HORIZON_CONFIG = [
  {
    key: "tenYear" as const,
    label: "10 Year",
    sublabel: "The world we change",
    color: "#ef4444",
    icon: "🌍",
  },
  {
    key: "fiveYear" as const,
    label: "5 Year",
    sublabel: "The company we become",
    color: "#f97316",
    icon: "🏢",
  },
  {
    key: "threeYear" as const,
    label: "3 Year",
    sublabel: "The platform we own",
    color: "#eab308",
    icon: "🎯",
  },
  {
    key: "oneYear" as const,
    label: "1 Year",
    sublabel: "The proof we deliver",
    color: "#22c55e",
    icon: "✓",
  },
];

export default function TimeHorizonsPage() {
  const router = useRouter();
  const [authorizedAdmin, setAuthorizedAdmin] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bosData, setBosData] = useState<BOSPayload>(DEFAULT_BOS_PAYLOAD);
  const [horizons, setHorizons] = useState<TimeHorizons>(
    DEFAULT_BOS_PAYLOAD.timeHorizons
  );
  const [theBet, setTheBet] = useState<TheBet>(DEFAULT_BOS_PAYLOAD.theBet);
  const [theProof, setTheProof] = useState<TheProof>(
    DEFAULT_BOS_PAYLOAD.theProof
  );
  const [activeTab, setActiveTab] = useState<ActiveTab>("horizons");
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
            setHorizons(data.payload.timeHorizons);
            setTheBet(data.payload.theBet);
            setTheProof(data.payload.theProof);
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

  const updateHorizon = useCallback(
    (key: keyof TimeHorizons, field: string, value: string) => {
      setHorizons((prev) => ({
        ...prev,
        [key]: { ...prev[key], [field]: value },
      }));
      setHasChanges(true);
    },
    []
  );

  const updateBet = useCallback((field: keyof TheBet, value: string) => {
    setTheBet((prev) => ({ ...prev, [field]: value }));
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
        timeHorizons: horizons,
        theBet: theBet,
        theProof: theProof,
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
      toast.success("Time Horizons saved!");
    } catch (err) {
      console.error("Save failed:", err);
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const addProofSignal = () => {
    setTheProof((prev) => ({
      signals: [
        ...prev.signals,
        {
          id: generateBOSId("proof"),
          signal: "",
          whyMatters: "",
          falseSuccess: "",
        },
      ],
    }));
    setHasChanges(true);
  };

  const updateProofSignal = (
    id: string,
    field: keyof ProofSignal,
    value: string
  ) => {
    setTheProof((prev) => ({
      signals: prev.signals.map((s) =>
        s.id === id ? { ...s, [field]: value } : s
      ),
    }));
    setHasChanges(true);
  };

  const removeProofSignal = (id: string) => {
    setTheProof((prev) => ({
      signals: prev.signals.filter((s) => s.id !== id),
    }));
    setHasChanges(true);
  };

  const moveProofSignal = (index: number, direction: "up" | "down") => {
    setTheProof((prev) => {
      const newSignals = [...prev.signals];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newSignals.length) return prev;
      [newSignals[index], newSignals[targetIndex]] = [
        newSignals[targetIndex],
        newSignals[index],
      ];
      return { signals: newSignals };
    });
    setHasChanges(true);
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

  const filledSignals = theProof.signals.filter((s) => s.signal.trim()).length;

  return (
    <div className="min-h-screen bg-[#020202] text-[#f6e1bd]">
      <BizDevNav adminLabel={adminLabel} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">◎</span>
              <h1 className="text-2xl font-semibold">Time Horizons</h1>
            </div>
            <p className="text-sm text-[#a3a3a3]">
              10 year → 1 year strategic stack. Each horizon answers one question only.
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

        {/* Visual Timeline */}
        <div className="mb-8 rounded-2xl border border-[#262626] bg-[#050505] p-4">
          <div className="flex items-center justify-between">
            {HORIZON_CONFIG.map((h, idx) => (
              <div key={h.key} className="flex items-center">
                <div className="text-center">
                  <div
                    className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full text-lg"
                    style={{ backgroundColor: h.color + "20", color: h.color }}
                  >
                    {h.icon}
                  </div>
                  <p className="text-xs font-semibold" style={{ color: h.color }}>
                    {h.label}
                  </p>
                  <p className="text-[10px] text-[#737373]">{h.sublabel}</p>
                </div>
                {idx < HORIZON_CONFIG.length - 1 && (
                  <div className="mx-4 h-[2px] w-12 bg-gradient-to-r from-[#262626] to-[#262626]" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b border-[#1f1f1f] pb-4">
          {[
            { id: "horizons" as const, label: "Horizon Stack", icon: "◎" },
            { id: "bet" as const, label: "The Bet (3-5Y)", icon: "◆" },
            { id: "proof" as const, label: "The Proof (1Y)", icon: "✓" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-[#cb6b1e] text-black"
                  : "text-[#a3a3a3] hover:bg-[#1a1a1a] hover:text-[#f6e1bd]"
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Horizons Tab */}
            {activeTab === "horizons" && (
              <div className="space-y-6">
                {HORIZON_CONFIG.map((item, idx) => (
                  <div
                    key={item.key}
                    className="rounded-2xl border bg-[#0b0b0b] p-6 transition-all"
                    style={{ borderColor: item.color + "30" }}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-lg"
                        style={{
                          backgroundColor: item.color + "15",
                          color: item.color,
                        }}
                      >
                        {item.icon}
                      </div>
                      <div className="flex-1">
                        <h2 className="text-lg font-semibold">{item.label}</h2>
                        <p className="text-xs" style={{ color: item.color }}>
                          {item.sublabel}
                        </p>
                      </div>
                      <span className="text-xs text-[#3a3a3a]">
                        {horizons[item.key].narrative.length} chars
                      </span>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="flex items-center justify-between text-xs text-[#a3a3a3] mb-1">
                          <span>Purpose (one sentence)</span>
                        </label>
                        <input
                          className={inputClass}
                          value={horizons[item.key].purpose}
                          onChange={(e) =>
                            updateHorizon(item.key, "purpose", e.target.value)
                          }
                          placeholder={`The ${item.label.toLowerCase()} is about...`}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-[#a3a3a3] mb-1 block">
                          Narrative (one paragraph)
                        </label>
                        <textarea
                          rows={4}
                          className={inputClass}
                          value={horizons[item.key].narrative}
                          onChange={(e) =>
                            updateHorizon(item.key, "narrative", e.target.value)
                          }
                          placeholder="Describe what this horizon looks like when achieved..."
                        />
                      </div>
                      <div>
                        <label className="text-xs text-[#a3a3a3] mb-1 block">
                          What does NOT belong at this level
                        </label>
                        <input
                          className={`${inputClass} border-red-900/30`}
                          value={horizons[item.key].notBelongsHere}
                          onChange={(e) =>
                            updateHorizon(item.key, "notBelongsHere", e.target.value)
                          }
                          placeholder="Items that should be at a different horizon..."
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* The Bet Tab */}
            {activeTab === "bet" && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-[#cb6b1e]/30 bg-gradient-to-br from-[#cb6b1e]/5 to-transparent p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#cb6b1e]/20 text-[#cb6b1e] text-lg">
                      ◆
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-[#cb6b1e]">
                        The Bet (3-5 Year Strategic Memo)
                      </h2>
                      <p className="text-xs text-[#737373]">
                        This should read like a strategic memo, not a plan.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="rounded-xl border border-[#262626] bg-[#050505] p-4">
                      <label className="flex items-center gap-2 text-xs text-[#a3a3a3] mb-2">
                        <span className="text-[#cb6b1e]">1.</span>
                        What category do we own?
                      </label>
                      <textarea
                        rows={2}
                        className={inputClass}
                        value={theBet.categoryOwned}
                        onChange={(e) => updateBet("categoryOwned", e.target.value)}
                        placeholder="The market position we claim and defend..."
                      />
                    </div>

                    <div className="rounded-xl border border-[#262626] bg-[#050505] p-4">
                      <label className="flex items-center gap-2 text-xs text-[#a3a3a3] mb-2">
                        <span className="text-[#cb6b1e]">2.</span>
                        What data asset exists?
                      </label>
                      <textarea
                        rows={2}
                        className={inputClass}
                        value={theBet.dataAsset}
                        onChange={(e) => updateBet("dataAsset", e.target.value)}
                        placeholder="The unique data we accumulate that others can't replicate..."
                      />
                    </div>

                    <div className="rounded-xl border border-[#262626] bg-[#050505] p-4">
                      <label className="flex items-center gap-2 text-xs text-[#a3a3a3] mb-2">
                        <span className="text-[#cb6b1e]">3.</span>
                        What behaviors change?
                      </label>
                      <textarea
                        rows={2}
                        className={inputClass}
                        value={theBet.behaviorsChanged}
                        onChange={(e) => updateBet("behaviorsChanged", e.target.value)}
                        placeholder="How do users, customers, or the market act differently..."
                      />
                    </div>

                    <div className="rounded-xl border border-[#262626] bg-[#050505] p-4">
                      <label className="flex items-center gap-2 text-xs text-[#a3a3a3] mb-2">
                        <span className="text-[#cb6b1e]">4.</span>
                        Who feels threatened if this works?
                      </label>
                      <textarea
                        rows={2}
                        className={inputClass}
                        value={theBet.whoFeelsThreatened}
                        onChange={(e) => updateBet("whoFeelsThreatened", e.target.value)}
                        placeholder="Competitors, incumbents, alternatives that lose if we win..."
                      />
                    </div>

                    <div className="rounded-xl border border-[#cb6b1e]/30 bg-[#cb6b1e]/5 p-4">
                      <label className="flex items-center justify-between text-xs text-[#a3a3a3] mb-2">
                        <span className="flex items-center gap-2">
                          <span className="text-[#cb6b1e]">★</span>
                          Full Narrative (The Complete Thesis)
                        </span>
                        <span className="text-[#3a3a3a]">
                          {theBet.fullNarrative.length} chars
                        </span>
                      </label>
                      <textarea
                        rows={8}
                        className={`${inputClass} border-[#cb6b1e]/20`}
                        value={theBet.fullNarrative}
                        onChange={(e) => updateBet("fullNarrative", e.target.value)}
                        placeholder="Write the complete strategic thesis. This is the memo you'd give to a board member or key investor explaining the bet you're making..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* The Proof Tab */}
            {activeTab === "proof" && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-[#22c55e]/30 bg-gradient-to-br from-[#22c55e]/5 to-transparent p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#22c55e]/20 text-[#22c55e] text-lg">
                        ✓
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-[#22c55e]">
                          The Proof (1 Year Signals)
                        </h2>
                        <p className="text-xs text-[#737373]">
                          Exactly 5 proof signals. What demonstrates the thesis works.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#3a3a3a]">
                        {filledSignals}/{theProof.signals.length}
                      </span>
                      <button
                        onClick={addProofSignal}
                        className="rounded-lg border border-[#22c55e]/50 px-3 py-1.5 text-xs text-[#22c55e] hover:bg-[#22c55e]/10 transition-colors"
                      >
                        + Add Signal
                      </button>
                    </div>
                  </div>

                  {theProof.signals.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#262626] p-8 text-center">
                      <p className="text-sm text-[#737373]">No proof signals yet.</p>
                      <p className="text-xs text-[#3a3a3a] mt-1">
                        What evidence would prove your thesis is working?
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {theProof.signals.map((signal, idx) => (
                        <div
                          key={signal.id}
                          className="group rounded-xl border border-[#262626] bg-[#050505] p-4 hover:border-[#22c55e]/30 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => moveProofSignal(idx, "up")}
                                  disabled={idx === 0}
                                  className="text-[10px] text-[#737373] hover:text-[#22c55e] disabled:opacity-30"
                                >
                                  ▲
                                </button>
                                <button
                                  onClick={() => moveProofSignal(idx, "down")}
                                  disabled={idx === theProof.signals.length - 1}
                                  className="text-[10px] text-[#737373] hover:text-[#22c55e] disabled:opacity-30"
                                >
                                  ▼
                                </button>
                              </div>
                              <div
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold"
                                style={{
                                  backgroundColor: signal.signal
                                    ? "#22c55e20"
                                    : "#1a1a1a",
                                  color: signal.signal ? "#22c55e" : "#737373",
                                }}
                              >
                                {idx + 1}
                              </div>
                              <span className="text-xs font-semibold text-[#22c55e]">
                                Signal {idx + 1}
                              </span>
                            </div>
                            <button
                              onClick={() => removeProofSignal(signal.id)}
                              className="rounded p-1 text-xs text-[#737373] opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 transition-all"
                            >
                              Remove
                            </button>
                          </div>

                          <div className="space-y-3 pl-11">
                            <div>
                              <label className="text-xs text-[#a3a3a3] mb-1 block">
                                The Signal
                              </label>
                              <input
                                className={inputClass}
                                value={signal.signal}
                                onChange={(e) =>
                                  updateProofSignal(signal.id, "signal", e.target.value)
                                }
                                placeholder="What specific outcome do we need to see?"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-[#a3a3a3] mb-1 block">
                                Why It Matters
                              </label>
                              <input
                                className={inputClass}
                                value={signal.whyMatters}
                                onChange={(e) =>
                                  updateProofSignal(signal.id, "whyMatters", e.target.value)
                                }
                                placeholder="What does this prove about our thesis?"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-red-400/80 mb-1 block">
                                What False Success Looks Like
                              </label>
                              <input
                                className={`${inputClass} border-red-900/30`}
                                value={signal.falseSuccess}
                                onChange={(e) =>
                                  updateProofSignal(signal.id, "falseSuccess", e.target.value)
                                }
                                placeholder="What would look like success but actually isn't?"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Preview */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24 space-y-4">
              <div className="rounded-2xl border border-[#262626] bg-[#050505] p-6">
                <h3 className="text-sm font-semibold text-[#cb6b1e] mb-4 uppercase tracking-wider">
                  {activeTab === "horizons" && "Horizon Preview"}
                  {activeTab === "bet" && "The Bet Preview"}
                  {activeTab === "proof" && "Proof Signals Preview"}
                </h3>

                {activeTab === "horizons" && (
                  <div className="space-y-4">
                    {HORIZON_CONFIG.map((h) => (
                      <div key={h.key} className="border-l-2 pl-3" style={{ borderColor: h.color }}>
                        <p className="text-xs font-semibold" style={{ color: h.color }}>
                          {h.label}
                        </p>
                        <p className="text-xs text-[#a3a3a3] mt-1 line-clamp-2">
                          {horizons[h.key].purpose || (
                            <span className="text-[#3a3a3a] italic">No purpose set</span>
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === "bet" && (
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-[#737373]">
                        Category
                      </p>
                      <p className="text-xs text-[#a3a3a3] mt-1">
                        {theBet.categoryOwned || (
                          <span className="text-[#3a3a3a] italic">Not set</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-[#737373]">
                        Data Asset
                      </p>
                      <p className="text-xs text-[#a3a3a3] mt-1">
                        {theBet.dataAsset || (
                          <span className="text-[#3a3a3a] italic">Not set</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-[#737373]">
                        Behavior Change
                      </p>
                      <p className="text-xs text-[#a3a3a3] mt-1">
                        {theBet.behaviorsChanged || (
                          <span className="text-[#3a3a3a] italic">Not set</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-[#737373]">
                        Threatened Players
                      </p>
                      <p className="text-xs text-[#a3a3a3] mt-1">
                        {theBet.whoFeelsThreatened || (
                          <span className="text-[#3a3a3a] italic">Not set</span>
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {activeTab === "proof" && (
                  <div className="space-y-3">
                    {theProof.signals.length === 0 ? (
                      <p className="text-xs text-[#3a3a3a] italic">No signals added</p>
                    ) : (
                      theProof.signals.map((s, i) => (
                        <div
                          key={s.id}
                          className="flex items-start gap-2 text-xs"
                        >
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded text-[10px] ${
                              s.signal
                                ? "bg-[#22c55e]/20 text-[#22c55e]"
                                : "bg-[#1a1a1a] text-[#737373]"
                            }`}
                          >
                            {i + 1}
                          </span>
                          <span className="text-[#a3a3a3] flex-1">
                            {s.signal || (
                              <span className="text-[#3a3a3a] italic">Empty</span>
                            )}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Completeness */}
              <div className="rounded-xl border border-[#262626] bg-[#050505] p-4">
                <p className="text-xs text-[#737373] mb-3">Completeness</p>
                <div className="space-y-2">
                  {HORIZON_CONFIG.map((h) => (
                    <div key={h.key} className="flex items-center justify-between text-xs">
                      <span className="text-[#a3a3a3]">{h.label}</span>
                      <span
                        className={
                          horizons[h.key].purpose && horizons[h.key].narrative
                            ? "text-[#22c55e]"
                            : "text-[#3a3a3a]"
                        }
                      >
                        {horizons[h.key].purpose && horizons[h.key].narrative
                          ? "✓"
                          : "○"}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-[#262626]">
                    <span className="text-[#a3a3a3]">The Bet</span>
                    <span
                      className={
                        theBet.fullNarrative ? "text-[#22c55e]" : "text-[#3a3a3a]"
                      }
                    >
                      {theBet.fullNarrative ? "✓" : "○"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#a3a3a3]">Proof Signals</span>
                    <span
                      className={
                        filledSignals >= 5 ? "text-[#22c55e]" : "text-[#eab308]"
                      }
                    >
                      {filledSignals}/5
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
