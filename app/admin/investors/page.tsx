"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import AdminNav from "@/components/AdminNav";
import { ADMIN_PERSONAS, ADMIN_SLUGS } from "@/lib/adminUsers";
import type { InvestorPersona } from "@/lib/questionnaire";
import {
  validateInvestorData,
  checkSlugUniqueness,
  generateRandomPin,
  generateSlugFromName,
} from "@/lib/investorValidation";
import { getUserFriendlyError, DATABASE_ERRORS } from "@/lib/errorMessages";

const AdminInvestorsPage = () => {
  const router = useRouter();
  const [authorizedAdmin, setAuthorizedAdmin] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [investors, setInvestors] = useState<InvestorPersona[]>([]);
  const [fullPayload, setFullPayload] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [formData, setFormData] = useState<Partial<InvestorPersona>>({});
  const [showPin, setShowPin] = useState(false);

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
    const loadInvestors = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/site-state");
        if (!response.ok) throw new Error("Failed to load data");
        const data = await response.json();

        // Store full payload for later use
        setFullPayload(data.payload);

        // Set investors directly (no mapping needed)
        if (data?.payload?.investors) {
          setInvestors(data.payload.investors);
        }
      } catch (err) {
        console.error("Load failed:", err);
        toast.error(DATABASE_ERRORS.SITE_STATE_FETCH);
      } finally {
        setLoading(false);
      }
    };
    if (authorizedAdmin) void loadInvestors();
  }, [authorizedAdmin]);

  // Helper functions
  const updateFormField = <K extends keyof InvestorPersona>(
    field: K,
    value: InvestorPersona[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateKeyQuestion = (index: number, value: string) => {
    setFormData((prev) => {
      const questions = [...(prev.keyQuestions || ["", "", ""])];
      questions[index] = value;
      return { ...prev, keyQuestions: questions };
    });
  };

  const startEdit = (investor: InvestorPersona) => {
    setEditingSlug(investor.slug);
    setFormData({
      ...investor,
      keyQuestions: [...investor.keyQuestions],
    });
    setShowPin(false);
  };

  const cancelEdit = () => {
    setEditingSlug(null);
    setFormData({});
    setShowPin(false);
  };

  const startAddNew = () => {
    setIsAddingNew(true);
    setFormData({
      slug: "",
      name: "",
      firm: "",
      title: "",
      focusArea: "",
      welcomeNote: "",
      highlight: "",
      keyQuestions: ["", "", ""],
      nextStep: "",
      pixelAccent: "#cb6b1e",
      pixelMuted: "#f6e1bd",
      pin: generateRandomPin(),
    });
    setShowPin(false);
  };

  const cancelAddNew = () => {
    setIsAddingNew(false);
    setFormData({});
    setShowPin(false);
  };

  const saveEdit = async () => {
    if (!authorizedAdmin || !fullPayload) {
      toast.error("Cannot save: missing data");
      return;
    }

    // Client-side validation
    const errors = validateInvestorData(formData as InvestorPersona);
    if (errors.length > 0) {
      toast.error(errors[0].message);
      return;
    }

    // Check slug uniqueness (exclude current slug)
    if (
      !checkSlugUniqueness(formData.slug!, investors, editingSlug as string)
    ) {
      toast.error("Slug must be unique");
      return;
    }

    setSaving(true);
    try {
      // Update the investor in the array
      const updatedInvestors = investors.map((inv) =>
        inv.slug === editingSlug ? (formData as InvestorPersona) : inv
      );

      // Merge with full payload
      const updatedPayload = {
        ...fullPayload,
        investors: updatedInvestors,
      };

      // Send to existing update endpoint
      const response = await fetch("/api/admin/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminSlug: authorizedAdmin,
          payload: updatedPayload,
          notes: `Updated investor: ${formData.name}`,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save");
      }

      // Update local state
      setInvestors(updatedInvestors);
      setFullPayload(updatedPayload);
      setEditingSlug(null);
      setFormData({});

      toast.success("Investor updated successfully!");
    } catch (err) {
      console.error("Save failed:", err);
      toast.error(getUserFriendlyError(err, "Failed to save investor"));
    } finally {
      setSaving(false);
    }
  };

  const deleteInvestor = async (slug: string) => {
    if (!confirm("Delete this investor? This cannot be undone.")) {
      return;
    }

    if (!authorizedAdmin || !fullPayload) {
      toast.error("Cannot delete: missing data");
      return;
    }

    setSaving(true);
    try {
      // Remove investor from array
      const updatedInvestors = investors.filter((inv) => inv.slug !== slug);

      // Merge with full payload
      const updatedPayload = {
        ...fullPayload,
        investors: updatedInvestors,
      };

      const response = await fetch("/api/admin/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminSlug: authorizedAdmin,
          payload: updatedPayload,
          notes: `Deleted investor: ${slug}`,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete");
      }

      // Update local state
      setInvestors(updatedInvestors);
      setFullPayload(updatedPayload);

      toast.success("Investor deleted successfully!");
    } catch (err) {
      console.error("Delete failed:", err);
      toast.error(getUserFriendlyError(err, "Failed to delete investor"));
    } finally {
      setSaving(false);
    }
  };

  const saveNewInvestor = async () => {
    if (!authorizedAdmin || !fullPayload) {
      toast.error("Cannot save: missing data");
      return;
    }

    // Client-side validation
    const errors = validateInvestorData(formData as InvestorPersona);
    if (errors.length > 0) {
      toast.error(errors[0].message);
      return;
    }

    // Check slug uniqueness
    if (!checkSlugUniqueness(formData.slug!, investors)) {
      toast.error("Slug must be unique");
      return;
    }

    setSaving(true);
    try {
      // Add to investor array
      const updatedInvestors = [...investors, formData as InvestorPersona];

      // Merge with full payload
      const updatedPayload = {
        ...fullPayload,
        investors: updatedInvestors,
      };

      const response = await fetch("/api/admin/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminSlug: authorizedAdmin,
          payload: updatedPayload,
          notes: `Added new investor: ${formData.name}`,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add investor");
      }

      // Update local state
      setInvestors(updatedInvestors);
      setFullPayload(updatedPayload);
      setIsAddingNew(false);
      setFormData({});

      toast.success("Investor added successfully!");
    } catch (err) {
      console.error("Add failed:", err);
      toast.error(getUserFriendlyError(err, "Failed to add investor"));
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

  return (
    <div className="min-h-screen bg-[#020202] text-[#f6e1bd]">
      <AdminNav adminLabel={adminLabel || undefined} />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold">Manage Investors</h1>
          <p className="text-sm text-[#a3a3a3] mt-1">
            Add, edit, or remove investor profiles and personalized content.
          </p>
        </div>

        <div className="space-y-4">
          {/* Add New Investor Card */}
          {isAddingNew && (
            <div className="rounded-2xl border border-[#cb6b1e] bg-[#0b0b0b] p-6">
              <h3 className="text-lg font-semibold mb-4">Add New Investor</h3>
              <div className="space-y-6">
                {/* Basic Info */}
                <div>
                  <h4 className="text-sm font-semibold mb-3">Basic Information</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                      Name *
                      <input
                        className="mt-1 w-full rounded-lg border border-[#2a2a2a] bg-[#090909] px-3 py-2 text-sm text-[#f6e1bd]"
                        value={formData.name || ""}
                        onChange={(e) => {
                          updateFormField("name", e.target.value);
                          updateFormField("slug", generateSlugFromName(e.target.value));
                        }}
                      />
                    </label>
                    <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                      Slug *
                      <input
                        className="mt-1 w-full rounded-lg border border-[#2a2a2a] bg-[#090909] px-3 py-2 text-sm text-[#f6e1bd]"
                        value={formData.slug || ""}
                        onChange={(e) => updateFormField("slug", e.target.value)}
                      />
                    </label>
                    <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                      Firm *
                      <input
                        className="mt-1 w-full rounded-lg border border-[#2a2a2a] bg-[#090909] px-3 py-2 text-sm text-[#f6e1bd]"
                        value={formData.firm || ""}
                        onChange={(e) => updateFormField("firm", e.target.value)}
                      />
                    </label>
                    <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                      Title *
                      <input
                        className="mt-1 w-full rounded-lg border border-[#2a2a2a] bg-[#090909] px-3 py-2 text-sm text-[#f6e1bd]"
                        value={formData.title || ""}
                        onChange={(e) => updateFormField("title", e.target.value)}
                      />
                    </label>
                  </div>
                </div>

                {/* Personalization */}
                <div>
                  <h4 className="text-sm font-semibold mb-3">Personalization</h4>
                  <div className="space-y-4">
                    <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                      Focus Area *
                      <input
                        className="mt-1 w-full rounded-lg border border-[#2a2a2a] bg-[#090909] px-3 py-2 text-sm text-[#f6e1bd]"
                        value={formData.focusArea || ""}
                        onChange={(e) => updateFormField("focusArea", e.target.value)}
                      />
                    </label>
                    <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                      Welcome Note *
                      <textarea
                        rows={3}
                        className="mt-1 w-full rounded-lg border border-[#2a2a2a] bg-[#090909] px-3 py-2 text-sm text-[#f6e1bd]"
                        value={formData.welcomeNote || ""}
                        onChange={(e) => updateFormField("welcomeNote", e.target.value)}
                      />
                    </label>
                    <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                      Highlight *
                      <input
                        className="mt-1 w-full rounded-lg border border-[#2a2a2a] bg-[#090909] px-3 py-2 text-sm text-[#f6e1bd]"
                        value={formData.highlight || ""}
                        onChange={(e) => updateFormField("highlight", e.target.value)}
                      />
                    </label>
                    <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                      Next Step *
                      <textarea
                        rows={2}
                        className="mt-1 w-full rounded-lg border border-[#2a2a2a] bg-[#090909] px-3 py-2 text-sm text-[#f6e1bd]"
                        value={formData.nextStep || ""}
                        onChange={(e) => updateFormField("nextStep", e.target.value)}
                      />
                    </label>
                  </div>
                </div>

                {/* Key Questions */}
                <div>
                  <h4 className="text-sm font-semibold mb-3">Key Questions (3 required)</h4>
                  <div className="space-y-3">
                    {[0, 1, 2].map((idx) => (
                      <label key={idx} className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                        Question {idx + 1} *
                        <input
                          className="mt-1 w-full rounded-lg border border-[#2a2a2a] bg-[#090909] px-3 py-2 text-sm text-[#f6e1bd]"
                          value={formData.keyQuestions?.[idx] || ""}
                          onChange={(e) => updateKeyQuestion(idx, e.target.value)}
                        />
                      </label>
                    ))}
                  </div>
                </div>

                {/* Theme Colors */}
                <div>
                  <h4 className="text-sm font-semibold mb-3">Theme Colors</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                      Accent Color *
                      <div className="mt-1 flex gap-2">
                        <input
                          type="color"
                          className="h-10 w-16 rounded-lg border border-[#2a2a2a] bg-[#090909] cursor-pointer"
                          value={formData.pixelAccent || "#cb6b1e"}
                          onChange={(e) => updateFormField("pixelAccent", e.target.value)}
                        />
                        <input
                          type="text"
                          className="flex-1 rounded-lg border border-[#2a2a2a] bg-[#090909] px-3 py-2 text-sm text-[#f6e1bd]"
                          value={formData.pixelAccent || ""}
                          onChange={(e) => updateFormField("pixelAccent", e.target.value)}
                          placeholder="#cb6b1e"
                        />
                      </div>
                    </label>
                    <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                      Muted Color *
                      <div className="mt-1 flex gap-2">
                        <input
                          type="color"
                          className="h-10 w-16 rounded-lg border border-[#2a2a2a] bg-[#090909] cursor-pointer"
                          value={formData.pixelMuted || "#f6e1bd"}
                          onChange={(e) => updateFormField("pixelMuted", e.target.value)}
                        />
                        <input
                          type="text"
                          className="flex-1 rounded-lg border border-[#2a2a2a] bg-[#090909] px-3 py-2 text-sm text-[#f6e1bd]"
                          value={formData.pixelMuted || ""}
                          onChange={(e) => updateFormField("pixelMuted", e.target.value)}
                          placeholder="#f6e1bd"
                        />
                      </div>
                    </label>
                  </div>
                </div>

                {/* Security */}
                <div>
                  <h4 className="text-sm font-semibold mb-3">Security</h4>
                  <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                    PIN (4 digits) *
                    <div className="mt-1 flex gap-2">
                      <input
                        type={showPin ? "text" : "password"}
                        maxLength={4}
                        pattern="[0-9]{4}"
                        className="w-32 rounded-lg border border-[#2a2a2a] bg-[#090909] px-3 py-2 text-sm text-[#f6e1bd]"
                        value={formData.pin || ""}
                        onChange={(e) => updateFormField("pin", e.target.value.replace(/\D/g, "").slice(0, 4))}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        className="rounded-lg border border-[#2a2a2a] px-3 py-2 text-xs hover:border-[#cb6b1e]"
                      >
                        {showPin ? "Hide" : "Show"}
                      </button>
                      <button
                        type="button"
                        onClick={() => updateFormField("pin", generateRandomPin())}
                        className="rounded-lg border border-[#2a2a2a] px-3 py-2 text-xs hover:border-[#cb6b1e]"
                      >
                        Generate
                      </button>
                    </div>
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={saveNewInvestor}
                    disabled={saving}
                    className="rounded-lg bg-[#cb6b1e] px-4 py-2 text-sm font-semibold text-black hover:bg-[#d47b2e] disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Add Investor"}
                  </button>
                  <button
                    onClick={cancelAddNew}
                    disabled={saving}
                    className="rounded-lg border border-[#2a2a2a] px-4 py-2 text-sm hover:border-[#cb6b1e] disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {investors.map((investor) => (
            <div
              key={investor.slug}
              className="rounded-2xl border border-[#1f1f1f] bg-[#0b0b0b] p-6"
            >
              {editingSlug === investor.slug ? (
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3">Basic Information</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                        Name *
                        <input
                          className="mt-1 w-full rounded-lg border border-[#2a2a2a] bg-[#090909] px-3 py-2 text-sm text-[#f6e1bd]"
                          value={formData.name || ""}
                          onChange={(e) => {
                            updateFormField("name", e.target.value);
                            if (!editingSlug) {
                              updateFormField("slug", generateSlugFromName(e.target.value));
                            }
                          }}
                        />
                      </label>
                      <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                        Slug *
                        <input
                          className="mt-1 w-full rounded-lg border border-[#2a2a2a] bg-[#090909] px-3 py-2 text-sm text-[#f6e1bd]"
                          value={formData.slug || ""}
                          onChange={(e) => updateFormField("slug", e.target.value)}
                        />
                      </label>
                      <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                        Firm *
                        <input
                          className="mt-1 w-full rounded-lg border border-[#2a2a2a] bg-[#090909] px-3 py-2 text-sm text-[#f6e1bd]"
                          value={formData.firm || ""}
                          onChange={(e) => updateFormField("firm", e.target.value)}
                        />
                      </label>
                      <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                        Title *
                        <input
                          className="mt-1 w-full rounded-lg border border-[#2a2a2a] bg-[#090909] px-3 py-2 text-sm text-[#f6e1bd]"
                          value={formData.title || ""}
                          onChange={(e) => updateFormField("title", e.target.value)}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Personalization */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3">Personalization</h4>
                    <div className="space-y-4">
                      <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                        Focus Area *
                        <input
                          className="mt-1 w-full rounded-lg border border-[#2a2a2a] bg-[#090909] px-3 py-2 text-sm text-[#f6e1bd]"
                          value={formData.focusArea || ""}
                          onChange={(e) => updateFormField("focusArea", e.target.value)}
                        />
                      </label>
                      <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                        Welcome Note *
                        <textarea
                          rows={3}
                          className="mt-1 w-full rounded-lg border border-[#2a2a2a] bg-[#090909] px-3 py-2 text-sm text-[#f6e1bd]"
                          value={formData.welcomeNote || ""}
                          onChange={(e) => updateFormField("welcomeNote", e.target.value)}
                        />
                      </label>
                      <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                        Highlight *
                        <input
                          className="mt-1 w-full rounded-lg border border-[#2a2a2a] bg-[#090909] px-3 py-2 text-sm text-[#f6e1bd]"
                          value={formData.highlight || ""}
                          onChange={(e) => updateFormField("highlight", e.target.value)}
                        />
                      </label>
                      <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                        Next Step *
                        <textarea
                          rows={2}
                          className="mt-1 w-full rounded-lg border border-[#2a2a2a] bg-[#090909] px-3 py-2 text-sm text-[#f6e1bd]"
                          value={formData.nextStep || ""}
                          onChange={(e) => updateFormField("nextStep", e.target.value)}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Key Questions */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3">Key Questions (3 required)</h4>
                    <div className="space-y-3">
                      {[0, 1, 2].map((idx) => (
                        <label key={idx} className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                          Question {idx + 1} *
                          <input
                            className="mt-1 w-full rounded-lg border border-[#2a2a2a] bg-[#090909] px-3 py-2 text-sm text-[#f6e1bd]"
                            value={formData.keyQuestions?.[idx] || ""}
                            onChange={(e) => updateKeyQuestion(idx, e.target.value)}
                          />
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Theme Colors */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3">Theme Colors</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                        Accent Color *
                        <div className="mt-1 flex gap-2">
                          <input
                            type="color"
                            className="h-10 w-16 rounded-lg border border-[#2a2a2a] bg-[#090909] cursor-pointer"
                            value={formData.pixelAccent || "#cb6b1e"}
                            onChange={(e) => updateFormField("pixelAccent", e.target.value)}
                          />
                          <input
                            type="text"
                            className="flex-1 rounded-lg border border-[#2a2a2a] bg-[#090909] px-3 py-2 text-sm text-[#f6e1bd]"
                            value={formData.pixelAccent || ""}
                            onChange={(e) => updateFormField("pixelAccent", e.target.value)}
                            placeholder="#cb6b1e"
                          />
                        </div>
                      </label>
                      <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                        Muted Color *
                        <div className="mt-1 flex gap-2">
                          <input
                            type="color"
                            className="h-10 w-16 rounded-lg border border-[#2a2a2a] bg-[#090909] cursor-pointer"
                            value={formData.pixelMuted || "#f6e1bd"}
                            onChange={(e) => updateFormField("pixelMuted", e.target.value)}
                          />
                          <input
                            type="text"
                            className="flex-1 rounded-lg border border-[#2a2a2a] bg-[#090909] px-3 py-2 text-sm text-[#f6e1bd]"
                            value={formData.pixelMuted || ""}
                            onChange={(e) => updateFormField("pixelMuted", e.target.value)}
                            placeholder="#f6e1bd"
                          />
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Security */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3">Security</h4>
                    <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                      PIN (4 digits) *
                      <div className="mt-1 flex gap-2">
                        <input
                          type={showPin ? "text" : "password"}
                          maxLength={4}
                          pattern="[0-9]{4}"
                          className="w-32 rounded-lg border border-[#2a2a2a] bg-[#090909] px-3 py-2 text-sm text-[#f6e1bd]"
                          value={formData.pin || ""}
                          onChange={(e) => updateFormField("pin", e.target.value.replace(/\D/g, "").slice(0, 4))}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPin(!showPin)}
                          className="rounded-lg border border-[#2a2a2a] px-3 py-2 text-xs hover:border-[#cb6b1e]"
                        >
                          {showPin ? "Hide" : "Show"}
                        </button>
                        <button
                          type="button"
                          onClick={() => updateFormField("pin", generateRandomPin())}
                          className="rounded-lg border border-[#2a2a2a] px-3 py-2 text-xs hover:border-[#cb6b1e]"
                        >
                          Generate
                        </button>
                      </div>
                    </label>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={saveEdit}
                      disabled={saving}
                      className="rounded-lg bg-[#cb6b1e] px-4 py-2 text-sm font-semibold text-black hover:bg-[#d47b2e] disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                      onClick={cancelEdit}
                      disabled={saving}
                      className="rounded-lg border border-[#2a2a2a] px-4 py-2 text-sm hover:border-[#cb6b1e] disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{investor.name}</h3>
                    <p className="text-xs text-[#a3a3a3]">
                      {investor.title} at {investor.firm} • @{investor.slug}
                    </p>
                    {investor.highlight && (
                      <p className="mt-2 text-sm text-[#d4d4d4]">
                        {investor.highlight}
                      </p>
                    )}
                    {investor.welcomeNote && (
                      <p className="mt-1 text-xs text-[#737373]">
                        {investor.welcomeNote}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(investor)}
                      className="rounded-lg border border-[#2a2a2a] px-3 py-1 text-xs hover:border-[#cb6b1e]"
                      disabled={saving}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteInvestor(investor.slug)}
                      className="rounded-lg border border-red-500/30 px-3 py-1 text-xs text-red-400 hover:bg-red-500/10"
                      disabled={saving}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          className="mt-6 rounded-lg border border-[#cb6b1e] px-4 py-2 text-sm hover:bg-[#cb6b1e] hover:text-black disabled:opacity-50"
          onClick={startAddNew}
          disabled={isAddingNew || editingSlug !== null || saving}
        >
          + Add New Investor
        </button>
      </main>
    </div>
  );
};

export default AdminInvestorsPage;
