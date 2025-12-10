"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import AdminNav from "@/components/AdminNav";
import { ADMIN_PERSONAS, ADMIN_SLUGS } from "@/lib/adminUsers";
import { DATABASE_ERRORS } from "@/lib/errorMessages";

type FormData = {
  hero: {
    kicker: string;
    h1Lead: string;
    h1Accent: string;
    h1Trail: string;
    mission: string;
    descriptor: string;
  };
  metadata: {
    lastUpdated: string;
    launchTarget: string;
    milestoneLabel: string;
  };
  funding: {
    roundType: string;
    target: string;
    committed: string;
    minCheck: string;
    closeDate: string;
    useOfFunds: string;
  };
};

const AdminUpdateSitePage = () => {
  const router = useRouter();
  const [authorizedAdmin, setAuthorizedAdmin] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingData, setExistingData] = useState<any>(null); // Store full payload
  const [form, setForm] = useState<FormData>({
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
      target: "",
      committed: "",
      minCheck: "",
      closeDate: "",
      useOfFunds: "",
    },
  });

  const adminLabel = useMemo(() => {
    if (!authorizedAdmin) return null;
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
        const response = await fetch("/api/site-state");
        if (!response.ok) throw new Error(DATABASE_ERRORS.SITE_STATE_FETCH);
        const data = await response.json();
        if (data?.payload) {
          const p = data.payload;
          // Store the complete existing data
          setExistingData(p);
          // Load only the fields we're editing
          setForm({
            hero: {
              kicker: p.hero?.kicker || "",
              h1Lead: p.hero?.h1Lead || "",
              h1Accent: p.hero?.h1Accent || "",
              h1Trail: p.hero?.h1Trail || "",
              mission: p.hero?.mission || "",
              descriptor: p.hero?.descriptor || "",
            },
            metadata: {
              lastUpdated: p.metadata?.lastUpdated || new Date().toISOString(),
              launchTarget: p.metadata?.launchTarget || new Date().toISOString(),
              milestoneLabel: p.metadata?.milestoneLabel || "",
            },
            funding: {
              roundType: p.funding?.roundType || "",
              target: String(p.funding?.target || ""),
              committed: String(p.funding?.committed || ""),
              minCheck: p.funding?.minCheck || "",
              closeDate: p.funding?.closeDate || "",
              useOfFunds: p.funding?.useOfFunds || "",
            },
          });
        }
      } catch (err) {
        console.error("Load failed:", err);
        toast.error(DATABASE_ERRORS.SITE_STATE_FETCH);
      } finally {
        setLoading(false);
      }
    };
    if (authorizedAdmin) void loadData();
  }, [authorizedAdmin]);

  const updateField = useCallback((section: keyof FormData, field: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  }, []);

  const handleSave = async () => {
    if (!authorizedAdmin) {
      toast.error("Admin access required");
      return;
    }

    if (!existingData) {
      toast.error("Data not loaded yet");
      return;
    }

    setSaving(true);
    try {
      // Merge form data with existing data to preserve other fields
      const payload = {
        ...existingData,
        hero: form.hero,
        metadata: form.metadata,
        funding: {
          roundType: form.funding.roundType,
          target: Number(form.funding.target) || 0,
          committed: Number(form.funding.committed) || 0,
          minCheck: form.funding.minCheck,
          closeDate: form.funding.closeDate,
          useOfFunds: form.funding.useOfFunds,
        },
      };

      const response = await fetch("/api/admin/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminSlug: authorizedAdmin,
          payload,
          notes: "", // TODO: Add notes field if needed
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save changes");
      }

      toast.success("Changes saved successfully!");
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

  const inputClass = "w-full rounded-lg border border-[#2a2a2a] bg-[#090909] px-3 py-2 text-sm text-[#f6e1bd] focus:border-[#cb6b1e] focus:outline-none";

  return (
    <div className="min-h-screen bg-[#020202] text-[#f6e1bd]">
      <AdminNav adminLabel={adminLabel || undefined} />

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Update Site Content</h1>
            <p className="text-sm text-[#a3a3a3]">
              Edit your investor dashboard content. Changes preview live on the right.
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-[#cb6b1e] px-6 py-2 text-sm font-semibold text-black hover:bg-[#e37a2e] disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* LEFT: Form */}
          <div className="space-y-8">

            {/* Hero Section */}
            <div className="rounded-2xl border border-[#1f1f1f] bg-[#0b0b0b] p-6 space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Hero Section</h2>
                <p className="text-xs text-[#737373]">Main headline and intro copy</p>
              </div>

              <label className="block">
                <span className="text-xs text-[#a3a3a3]">Kicker (small text above headline)</span>
                <input
                  className={inputClass}
                  value={form.hero.kicker}
                  onChange={(e) => updateField("hero", "kicker", e.target.value)}
                  placeholder="e.g., Live dashboard"
                />
              </label>

              <div className="grid grid-cols-3 gap-3">
                <label className="block">
                  <span className="text-xs text-[#a3a3a3]">H1 Lead</span>
                  <input
                    className={inputClass}
                    value={form.hero.h1Lead}
                    onChange={(e) => updateField("hero", "h1Lead", e.target.value)}
                    placeholder="Building"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-[#a3a3a3]">H1 Accent (orange)</span>
                  <input
                    className={inputClass}
                    value={form.hero.h1Accent}
                    onChange={(e) => updateField("hero", "h1Accent", e.target.value)}
                    placeholder="smarter"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-[#a3a3a3]">H1 Trail</span>
                  <input
                    className={inputClass}
                    value={form.hero.h1Trail}
                    onChange={(e) => updateField("hero", "h1Trail", e.target.value)}
                    placeholder="baseball"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-xs text-[#a3a3a3]">Mission Statement</span>
                <textarea
                  rows={2}
                  className={inputClass}
                  value={form.hero.mission}
                  onChange={(e) => updateField("hero", "mission", e.target.value)}
                  placeholder="Your mission in 1-2 sentences"
                />
              </label>

              <label className="block">
                <span className="text-xs text-[#a3a3a3]">Descriptor (smaller detail)</span>
                <textarea
                  rows={2}
                  className={inputClass}
                  value={form.hero.descriptor}
                  onChange={(e) => updateField("hero", "descriptor", e.target.value)}
                  placeholder="Additional context or details"
                />
              </label>
            </div>

            {/* Metadata */}
            <div className="rounded-2xl border border-[#1f1f1f] bg-[#0b0b0b] p-6 space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Metadata & Dates</h2>
                <p className="text-xs text-[#737373]">Controls countdown and update timestamps</p>
              </div>

              <label className="block">
                <span className="text-xs text-[#a3a3a3]">Milestone Label (countdown title)</span>
                <input
                  className={inputClass}
                  value={form.metadata.milestoneLabel}
                  onChange={(e) => updateField("metadata", "milestoneLabel", e.target.value)}
                  placeholder="e.g., MVP Launch"
                />
              </label>

              <label className="block">
                <span className="text-xs text-[#a3a3a3]">Launch Target Date</span>
                <input
                  type="datetime-local"
                  className={inputClass}
                  value={form.metadata.launchTarget.slice(0, 16)}
                  onChange={(e) => updateField("metadata", "launchTarget", e.target.value)}
                />
              </label>
            </div>

            {/* Funding */}
            <div className="rounded-2xl border border-[#1f1f1f] bg-[#0b0b0b] p-6 space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Funding Details</h2>
                <p className="text-xs text-[#737373]">Round info and progress bar data</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-[#a3a3a3]">Round Type</span>
                  <input
                    className={inputClass}
                    value={form.funding.roundType}
                    onChange={(e) => updateField("funding", "roundType", e.target.value)}
                    placeholder="e.g., Seed"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-[#a3a3a3]">Min Check</span>
                  <input
                    className={inputClass}
                    value={form.funding.minCheck}
                    onChange={(e) => updateField("funding", "minCheck", e.target.value)}
                    placeholder="$25K"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-[#a3a3a3]">Target Amount</span>
                  <input
                    type="number"
                    className={inputClass}
                    value={form.funding.target}
                    onChange={(e) => updateField("funding", "target", e.target.value)}
                    placeholder="500000"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-[#a3a3a3]">Committed Amount</span>
                  <input
                    type="number"
                    className={inputClass}
                    value={form.funding.committed}
                    onChange={(e) => updateField("funding", "committed", e.target.value)}
                    placeholder="250000"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-xs text-[#a3a3a3]">Target Close Date</span>
                <input
                  className={inputClass}
                  value={form.funding.closeDate}
                  onChange={(e) => updateField("funding", "closeDate", e.target.value)}
                  placeholder="Q2 2026"
                />
              </label>

              <label className="block">
                <span className="text-xs text-[#a3a3a3]">Use of Funds</span>
                <input
                  className={inputClass}
                  value={form.funding.useOfFunds}
                  onChange={(e) => updateField("funding", "useOfFunds", e.target.value)}
                  placeholder="Product development & hiring"
                />
              </label>
            </div>
          </div>

          {/* RIGHT: Live Preview */}
          <div className="lg:sticky lg:top-24 lg:h-fit">
            <div className="rounded-2xl border border-[#1f1f1f] bg-[#0b0b0b] p-6">
              <h3 className="text-sm font-semibold text-[#cb6b1e] mb-4">Live Preview</h3>

              <div className="space-y-6 text-sm">
                {/* Hero Preview */}
                <div className="rounded-xl border border-[#262626] bg-[#050505] p-4">
                  <p className="text-[10px] uppercase tracking-wider text-[#cb6b1e]">
                    {form.hero.kicker || "Kicker text"}
                  </p>
                  <h1 className="text-2xl font-semibold mt-2">
                    {form.hero.h1Lead || "Lead"}{" "}
                    <span className="text-[#cb6b1e]">{form.hero.h1Accent || "Accent"}</span>{" "}
                    {form.hero.h1Trail || "Trail"}
                  </h1>
                  {form.hero.mission && (
                    <p className="text-sm text-[#d4d4d4] mt-2">{form.hero.mission}</p>
                  )}
                  {form.hero.descriptor && (
                    <p className="text-xs text-[#a3a3a3] mt-1">{form.hero.descriptor}</p>
                  )}
                </div>

                {/* Funding Preview */}
                <div className="rounded-xl border border-[#262626] bg-[#050505] p-4">
                  <p className="text-xs uppercase tracking-wider text-[#a3a3a3]">Funding</p>
                  <p className="text-lg font-semibold text-[#cb6b1e] mt-1">
                    {form.funding.roundType || "Round Type"}
                  </p>
                  <p className="text-xs text-[#737373] mt-1">
                    {form.funding.useOfFunds || "Use of funds"}
                  </p>
                  <div className="mt-3 space-y-1 text-xs">
                    <p>Target: ${Number(form.funding.target || 0).toLocaleString()}</p>
                    <p>Committed: ${Number(form.funding.committed || 0).toLocaleString()}</p>
                    <p>Min Check: {form.funding.minCheck || "N/A"}</p>
                    <p>Close: {form.funding.closeDate || "TBD"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminUpdateSitePage;
