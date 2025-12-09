"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import PersonalizedWelcome from "../../components/PersonalizedWelcome";
import { ADMIN_PERSONAS, ADMIN_SLUGS } from "../../lib/adminUsers";
import { AUTH_ERRORS, DATABASE_ERRORS, VALIDATION_ERRORS } from "../../lib/errorMessages";
import {
  buildContentFromQuestionnaire,
  type QuestionnaireAnswers,
  type QuestionnairePrompt,
} from "../../lib/questionnaire";

type SectionKey =
  | "hero"
  | "metadata"
  | "funding"
  | "traction"
  | "snapshots"
  | "investors"
  | "prompts"
  | "timeline";

type HeroState = QuestionnaireAnswers["hero"];
type MetadataState = QuestionnaireAnswers["metadata"];
type FundingState = {
  roundType: string;
  target: string;
  committed: string;
  minCheck: string;
  closeDate: string;
  useOfFunds: string;
};

const createStableId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10);

type EditableSnapshot = {
  id: string;
  label: string;
  asOf: string;
  facilities: string;
  teams: string;
  players: string;
  events: string;
  dataPoints: string;
  highlightsText: string;
};

type EditableInvestor = {
  id: string;
  slug: string;
  name: string;
  firm: string;
  title: string;
  focusArea: string;
  welcomeNote: string;
  highlight: string;
  keyQuestionsText: string;
  nextStep: string;
  pixelAccent: string;
  pixelMuted: string;
  pin: string;
};

type FormState = {
  hero: HeroState;
  metadata: MetadataState;
  funding: FundingState;
  tractionNarrative: string;
  snapshots: EditableSnapshot[];
  investors: EditableInvestor[];
  prompts: QuestionnairePrompt[];
  notes: string;
};

const createEmptyForm = (): FormState => ({
  hero: {
    kicker: "",
    h1Lead: "",
    h1Accent: "",
    h1Trail: "",
    mission: "",
    descriptor: "",
  },
  metadata: {
    lastUpdated: "",
    launchTarget: "",
    milestoneLabel: "",
  },
  funding: {
    roundType: "",
    target: "0",
    committed: "0",
    minCheck: "",
    closeDate: "",
    useOfFunds: "",
  },
  tractionNarrative: "",
  snapshots: [],
  investors: [],
  prompts: [],
  notes: "",
});

const defaultOpenState: Record<SectionKey, boolean> = {
  hero: true,
  metadata: true,
  funding: false,
  traction: false,
  snapshots: false,
  investors: false,
  prompts: false,
  timeline: false,
};
const AdminPage = () => {
  const [authorizedAdmin, setAuthorizedAdmin] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>(createEmptyForm());
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [previewInvestorIndex, setPreviewInvestorIndex] = useState(0);
  const [openSections, setOpenSections] = useState(defaultOpenState);
  const [activeSection, setActiveSection] = useState<SectionKey>("hero");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isPublishing, setIsPublishing] = useState(false);

  const clearFieldError = useCallback((key: string) => {
    setFieldErrors((prev) => {
      if (!prev[key]) {
        return prev;
      }
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const getInputClasses = (key: string, extra = "") =>
    [
      "mt-1 w-full rounded-lg bg-[#090909] px-3 py-2 focus:outline-none focus:ring-0",
      extra,
      fieldErrors[key]
        ? "border border-red-500 focus:border-red-400"
        : "border border-[#2a2a2a] focus:border-[#cb6b1e]",
    ]
      .filter(Boolean)
      .join(" ");

  const renderFieldError = (key: string) =>
    fieldErrors[key] ? (
      <p className="mt-1 text-xs text-[#f87171]">{fieldErrors[key]}</p>
    ) : null;

  const adminLabel = useMemo(() => {
    if (!authorizedAdmin) {
      return null;
    }
    const admin = ADMIN_PERSONAS.find((person) => person.slug === authorizedAdmin);
    return admin?.shortLabel ?? admin?.name ?? "Admin";
  }, [authorizedAdmin]);

  const toggleSection = (section: SectionKey) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
    setActiveSection(section);
  };

  const loadCurrentState = useCallback(async () => {
    try {
      const response = await fetch("/api/site-state");
      if (!response.ok) {
        throw new Error(DATABASE_ERRORS.SITE_STATE_FETCH);
      }
      const data = await response.json();
      const shaped = buildContentFromQuestionnaire(data.payload);
      setFormState({
        hero: shaped.hero,
        metadata: shaped.metadata,
        funding: {
          roundType: shaped.funding.roundType,
          target: shaped.funding.target.toString(),
          committed: shaped.funding.committed.toString(),
          minCheck: shaped.funding.minCheck,
          closeDate: shaped.funding.closeDate,
          useOfFunds: shaped.funding.useOfFunds,
        },
        tractionNarrative: shaped.tractionNarrative,
        snapshots: shaped.snapshots.map((snapshot) => ({
          id: createStableId(),
          label: snapshot.label,
          asOf: snapshot.asOf,
          facilities: snapshot.facilities.toString(),
          teams: snapshot.teams.toString(),
          players: snapshot.players.toString(),
          events: snapshot.events.toString(),
          dataPoints: snapshot.dataPoints.toString(),
          highlightsText: snapshot.highlights.join("\n"),
        })),
        investors: shaped.investors.map((investor) => ({
          id: createStableId(),
          slug: investor.slug,
          name: investor.name,
          firm: investor.firm,
          title: investor.title,
          focusArea: investor.focusArea,
          welcomeNote: investor.welcomeNote,
          highlight: investor.highlight,
          keyQuestionsText: investor.keyQuestions.join("\n"),
          nextStep: investor.nextStep,
          pixelAccent: investor.pixelAccent,
          pixelMuted: investor.pixelMuted,
          pin: investor.pin,
        })),
        prompts: shaped.questionnaire,
        notes: "",
      });
      setPreviewInvestorIndex(0);
      setError("");
      setActiveSection("hero");
      setFieldErrors({});
    } catch (err) {
      console.error(err);
      setError(DATABASE_ERRORS.SITE_STATE_FETCH);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const verifyAdminSession = async () => {
      try {
        const response = await fetch("/api/auth/session");
        if (!response.ok) {
          setLoading(false);
          return;
        }
        const data = await response.json();
        if (data.role === "admin" && ADMIN_SLUGS.includes(data.slug)) {
          setAuthorizedAdmin(data.slug);
          await loadCurrentState();
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error("Failed to verify admin session", error);
        setLoading(false);
      }
    };

    verifyAdminSession();
  }, [loadCurrentState]);

  const createPayloadObject = useCallback((): QuestionnaireAnswers => ({
    hero: formState.hero,
    metadata: formState.metadata,
    funding: {
      roundType: formState.funding.roundType,
      target: Number(formState.funding.target) || 0,
      committed: Number(formState.funding.committed) || 0,
      minCheck: formState.funding.minCheck,
      closeDate: formState.funding.closeDate,
      useOfFunds: formState.funding.useOfFunds,
    },
    tractionNarrative: formState.tractionNarrative,
    snapshots: formState.snapshots.map(({ id: _id, highlightsText, ...snapshot }) => ({
      label: snapshot.label,
      asOf: snapshot.asOf,
      facilities: Number(snapshot.facilities) || 0,
      teams: Number(snapshot.teams) || 0,
      players: Number(snapshot.players) || 0,
      events: Number(snapshot.events) || 0,
      dataPoints: Number(snapshot.dataPoints) || 0,
      highlights: highlightsText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    })),
    investors: formState.investors.map(({ id: _id, keyQuestionsText, ...investor }) => ({
      slug: investor.slug,
      name: investor.name,
      firm: investor.firm,
      title: investor.title,
      focusArea: investor.focusArea,
      welcomeNote: investor.welcomeNote,
      highlight: investor.highlight,
      keyQuestions: keyQuestionsText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      nextStep: investor.nextStep,
      pixelAccent: investor.pixelAccent,
      pixelMuted: investor.pixelMuted,
      pin: investor.pin,
    })),
    updatePrompts: formState.prompts,
  }), [formState]);

  const previewContent = useMemo(() => {
    try {
      return buildContentFromQuestionnaire(createPayloadObject());
    } catch (err) {
      console.error(err);
      return null;
    }
  }, [createPayloadObject]);

  useEffect(() => {
    if (previewInvestorIndex > formState.investors.length - 1) {
      setPreviewInvestorIndex(Math.max(0, formState.investors.length - 1));
    }
  }, [formState.investors.length, previewInvestorIndex]);

  const validateForm = useCallback(() => {
    const errors: Record<string, string> = {};
    const addError = (key: string, message: string) => {
      if (!errors[key]) {
        errors[key] = message;
      }
    };
    const humanize = (value: string) =>
      value
        .replace(/([A-Z])/g, " $1")
        .replace(/[-_]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/^\w/, (char) => char.toUpperCase());
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pinPattern = /^\d{4}$/;
    const hexPattern = /^#[0-9a-fA-F]{6}$/;

    const requireText = (value: string, key: string, label: string) => {
      if (!value || !value.trim()) {
        addError(key, `${label} is required.`);
        return;
      }
      if (key.toLowerCase().includes("email")) {
        if (!emailPattern.test(value.trim())) {
          addError(key, `${label} must be a valid email address.`);
        }
      }
    };

    const requireNonNegativeNumber = (value: string, key: string, label: string) => {
      if (value === undefined || value === null || value.toString().trim() === "") {
        addError(key, `${label} is required.`);
        return;
      }
      const parsed = Number(value);
      if (Number.isNaN(parsed)) {
        addError(key, `${label} must be a number.`);
      } else if (parsed < 0) {
        addError(key, `${label} cannot be negative.`);
      }
    };

    const requireDateValue = (value: string, key: string, label: string) => {
      if (!value || !value.trim()) {
        addError(key, `${label} is required.`);
        return;
      }
      if (Number.isNaN(Date.parse(value))) {
        addError(key, `${label} must be a valid date.`);
      }
    };

    const requirePin = (value: string, key: string, label: string) => {
      if (!value || !value.trim()) {
        addError(key, `${label} is required.`);
        return;
      }
      if (!pinPattern.test(value.trim())) {
        addError(key, `${label} must be a 4-digit PIN.`);
      }
    };

    const requireHexColor = (value: string, key: string, label: string) => {
      if (!value || !value.trim()) {
        addError(key, `${label} is required.`);
        return;
      }
      if (!hexPattern.test(value.trim())) {
        addError(key, `${label} must be a valid hex color (e.g., #123ABC).`);
      }
    };

    Object.entries(formState.hero).forEach(([field, value]) => {
      requireText(value, `hero.${field}`, `Hero ${humanize(field)}`);
    });

    Object.entries(formState.metadata).forEach(([field, value]) => {
      if (field === "lastUpdated" || field === "launchTarget") {
        requireDateValue(value, `metadata.${field}`, `Metadata ${humanize(field)}`);
      } else {
        requireText(value, `metadata.${field}`, `Metadata ${humanize(field)}`);
      }
    });

    requireText(
      formState.funding.roundType,
      "funding.roundType",
      "Funding round type"
    );
    requireNonNegativeNumber(
      formState.funding.target,
      "funding.target",
      "Funding target"
    );
    requireNonNegativeNumber(
      formState.funding.committed,
      "funding.committed",
      "Funding committed"
    );
    requireText(formState.funding.minCheck, "funding.minCheck", "Funding min check");
    requireDateValue(
      formState.funding.closeDate,
      "funding.closeDate",
      "Funding close date"
    );
    requireText(
      formState.funding.useOfFunds,
      "funding.useOfFunds",
      "Funding use of funds"
    );

    requireText(
      formState.tractionNarrative,
      "tractionNarrative",
      "Traction narrative"
    );

    formState.snapshots.forEach((snapshot, index) => {
      const prefix = `Snapshot ${index + 1}`;
      const baseKey = `snapshots.${index}`;
      requireText(snapshot.label, `${baseKey}.label`, `${prefix} label`);
      requireDateValue(snapshot.asOf, `${baseKey}.asOf`, `${prefix} as-of date`);
      ["facilities", "teams", "players", "events", "dataPoints"].forEach((metric) => {
        requireNonNegativeNumber(
          snapshot[metric as keyof EditableSnapshot] as string,
          `${baseKey}.${metric}`,
          `${prefix} ${humanize(metric)}`
        );
      });
      requireText(
        snapshot.highlightsText,
        `${baseKey}.highlightsText`,
        `${prefix} highlights`
      );
    });

    formState.investors.forEach((investor, index) => {
      const prefix = `Investor ${index + 1}`;
      const baseKey = `investors.${index}`;
      ["slug", "name", "firm", "title"].forEach((field) => {
        requireText(
          investor[field as keyof EditableInvestor],
          `${baseKey}.${field}`,
          `${prefix} ${humanize(field)}`
        );
      });
      requirePin(investor.pin, `${baseKey}.pin`, `${prefix} PIN`);
      ["pixelAccent", "pixelMuted"].forEach((hexField) => {
        requireHexColor(
          investor[hexField as keyof EditableInvestor],
          `${baseKey}.${hexField}`,
          `${prefix} ${humanize(hexField)}`
        );
      });
      ["focusArea", "welcomeNote", "highlight", "nextStep"].forEach((field) => {
        requireText(
          investor[field as keyof EditableInvestor],
          `${baseKey}.${field}`,
          `${prefix} ${humanize(field)}`
        );
      });
      requireText(
        investor.keyQuestionsText,
        `${baseKey}.keyQuestionsText`,
        `${prefix} key questions`
      );
    });

    formState.prompts.forEach((prompt, index) => {
      const prefix = `Prompt ${index + 1}`;
      const baseKey = `prompts.${index}`;
      requireText(prompt.category, `${baseKey}.category`, `${prefix} category`);
      requireText(prompt.question, `${baseKey}.question`, `${prefix} question`);
      requireText(prompt.helper, `${baseKey}.helper`, `${prefix} helper text`);
    });

    return errors;
  }, [formState]);
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("");
    setError("");

    if (!authorizedAdmin) {
    setError(AUTH_ERRORS.ADMIN_ACCESS_REQUIRED);
    toast.error(AUTH_ERRORS.ADMIN_ACCESS_REQUIRED);
      return;
    }

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setError(VALIDATION_ERRORS.PUBLISH_FIELDS_INCOMPLETE);
      toast.error(VALIDATION_ERRORS.PUBLISH_FIELDS_INCOMPLETE);
      return;
    }

    try {
      setIsPublishing(true);
      const payload = createPayloadObject();
      const response = await fetch("/api/admin/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminSlug: authorizedAdmin,
          payload,
          notes: formState.notes,
        }),
      });

      if (!response.ok) {
        throw new Error(DATABASE_ERRORS.ADMIN_PUBLISH_FAILED);
      }

      setFieldErrors({});
      setStatus("Update published successfully.");
      toast.success("Update published successfully.");
    } catch (err) {
      console.error(err);
      setError(DATABASE_ERRORS.ADMIN_PUBLISH_FAILED);
      toast.error(DATABASE_ERRORS.ADMIN_PUBLISH_FAILED);
    } finally {
      setIsPublishing(false);
    }
  };

  const setHeroField = (key: keyof HeroState, value: string) => {
    setFormState((prev) => ({
      ...prev,
      hero: { ...prev.hero, [key]: value },
    }));
  };

  const setMetadataField = (key: keyof MetadataState, value: string) => {
    setFormState((prev) => ({
      ...prev,
      metadata: { ...prev.metadata, [key]: value },
    }));
  };

  const setFundingField = (key: keyof FundingState, value: string) => {
    setFormState((prev) => ({
      ...prev,
      funding: { ...prev.funding, [key]: value },
    }));
  };

  type SnapshotField = keyof Omit<EditableSnapshot, "id">;
  type InvestorField = keyof Omit<EditableInvestor, "id">;

  const updateSnapshot = (index: number, field: SnapshotField, value: string) => {
    setFormState((prev) => {
      const snapshots = [...prev.snapshots];
      snapshots[index] = {
        ...snapshots[index],
        [field]: value,
      };
      return { ...prev, snapshots };
    });
  };

  const addSnapshot = () => {
    setFormState((prev) => ({
      ...prev,
      snapshots: [
        ...prev.snapshots,
        {
          id: createStableId(),
          label: "New snapshot",
          asOf: new Date().toLocaleDateString(),
          facilities: "0",
          teams: "0",
          players: "0",
          events: "0",
          dataPoints: "0",
          highlightsText: "",
        },
      ],
    }));
    setOpenSections((prev) => ({ ...prev, snapshots: true }));
    setActiveSection("snapshots");
  };

  const removeSnapshot = (index: number) => {
    setFormState((prev) => ({
      ...prev,
      snapshots: prev.snapshots.filter((_, idx) => idx !== index),
    }));
  };

  const updateInvestor = (index: number, field: InvestorField, value: string) => {
    setFormState((prev) => {
      const investors = [...prev.investors];
      investors[index] = {
        ...investors[index],
        [field]: value,
      };
      return { ...prev, investors };
    });
  };

  const addInvestor = () => {
    setFormState((prev) => ({
      ...prev,
      investors: [
        ...prev.investors,
        {
          id: createStableId(),
          slug: `custom-investor-${prev.investors.length + 1}`,
          name: "New investor",
          firm: "",
          title: "",
          focusArea: "",
          welcomeNote: "",
          highlight: "",
          keyQuestionsText: "",
          nextStep: "",
          pixelAccent: "#cb6b1e",
          pixelMuted: "#f6e1bd",
          pin: "0000",
        },
      ],
    }));
    setOpenSections((prev) => ({ ...prev, investors: true }));
    setActiveSection("investors");
  };

  const removeInvestor = (index: number) => {
    setFormState((prev) => ({
      ...prev,
      investors: prev.investors.filter((_, idx) => idx !== index),
    }));
  };

  const updatePrompt = (index: number, field: keyof QuestionnairePrompt, value: string) => {
    setFormState((prev) => {
      const prompts = [...prev.prompts];
      prompts[index] = { ...prompts[index], [field]: value };
      return { ...prev, prompts };
    });
  };

  const addPrompt = () => {
    setFormState((prev) => ({
      ...prev,
      prompts: [
        ...prev.prompts,
        {
          id: `prompt-${prev.prompts.length + 1}`,
          category: "New",
          question: "",
          helper: "",
        },
      ],
    }));
    setOpenSections((prev) => ({ ...prev, prompts: true }));
    setActiveSection("prompts");
  };

  const removePrompt = (index: number) => {
    setFormState((prev) => ({
      ...prev,
      prompts: prev.prompts.filter((_, idx) => idx !== index),
    }));
  };

  if (loading) {
    return (
      <div
        className="min-h-screen bg-[#050505] text-[#f6e1bd] flex items-center justify-center"
        role="status"
        aria-live="polite"
      >
        <p className="text-sm text-[#d4d4d4]">
          Loading admin workspace...
        </p>
      </div>
    );
  }

  if (!authorizedAdmin) {
    return (
      <div className="min-h-screen bg-[#050505] text-[#f6e1bd] flex items-center justify-center px-4">
        <div
          className="max-w-md space-y-4 rounded-2xl border border-[#1d1d1d] bg-[#0b0b0b] p-6 text-center"
          role="alert"
          aria-live="assertive"
        >
          <h1 className="text-xl font-semibold">Admin access required</h1>
          <p className="text-sm text-[#d4d4d4]">
            Log in as Chase or Sheldon on the investor page to unlock this workspace.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg bg-[#cb6b1e] px-4 py-2 text-sm font-semibold text-black hover:bg-[#e37a2e]"
          >
            Return to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const previewHighlight = (section: SectionKey) =>
    activeSection === section
      ? "border-[#cb6b1e] ring-2 ring-[#cb6b1e]/30"
      : "border-[#252525]";

  type SectionCardProps = {
    section: SectionKey;
    title: string;
    subtitle?: string;
    actions?: React.ReactNode;
    children: React.ReactNode;
  };

  const SectionCard = ({ section, title, subtitle, actions, children }: SectionCardProps) => (
    <section className="rounded-2xl border border-[#242424] bg-[#0f0f0f] p-5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className="flex flex-1 items-center justify-between text-left"
          onClick={() => toggleSection(section)}
        >
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            {subtitle && <p className="text-xs text-[#737373]">{subtitle}</p>}
          </div>
          <span className="text-xs text-[#a3a3a3]">
            {openSections[section] ? "Hide" : "Show"}
          </span>
        </button>
        {actions}
      </div>
      {openSections[section] && <div className="space-y-3">{children}</div>}
    </section>
  );
  return (
    <div className="min-h-screen bg-[#050505] text-[#f6e1bd]">
      <header className="border-b border-[#1f1f1f] bg-[#060606]">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-[#cb6b1e]">Admin workspace</p>
            <h1 className="text-2xl font-semibold">Questionnaire + Publish</h1>
          </div>
          <div className="text-sm text-[#a3a3a3]">
            Logged in as <span className="text-[#f6e1bd] font-semibold">{adminLabel ?? "Admin"}</span>
          </div>
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto max-w-6xl px-4 py-8 space-y-8 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-6"
      >
        <form className="space-y-6" onSubmit={handleSubmit}>
          {status && (
            <div
              className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
              role="status"
              aria-live="polite"
            >
              {status}
            </div>
          )}
          {error && (
            <div
              className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
              role="alert"
              aria-live="assertive"
            >
              {error}
            </div>
          )}
          <fieldset disabled={isPublishing} className="space-y-6">

          <SectionCard section="hero" title="Hero" subtitle="Controls the headline and intro copy">
            {Object.entries(formState.hero).map(([field, value]) => (
              <label key={field} className="text-xs uppercase tracking-[0.18em] text-[#a3a3a3]">
                {field}
                <input
                  className={getInputClasses(`hero.${field}`)}
                  aria-invalid={Boolean(fieldErrors[`hero.${field}`])}
                  value={value}
                  onChange={(event) => {
                    clearFieldError(`hero.${field}`);
                    setHeroField(field as keyof HeroState, event.target.value);
                  }}
                />
                {renderFieldError(`hero.${field}`)}
              </label>
            ))}
          </SectionCard>

          <SectionCard section="metadata" title="Countdown metadata" subtitle="Feeds the launch timer">
            <div className="grid gap-3 md:grid-cols-3">
              {Object.entries(formState.metadata).map(([field, value]) => (
                <label key={field} className="text-xs uppercase tracking-[0.18em] text-[#a3a3a3]">
                  {field}
                  <input
                    className={getInputClasses(`metadata.${field}`)}
                    aria-invalid={Boolean(fieldErrors[`metadata.${field}`])}
                    value={value}
                    onChange={(event) => {
                      clearFieldError(`metadata.${field}`);
                      setMetadataField(field as keyof MetadataState, event.target.value);
                    }}
                  />
                  {renderFieldError(`metadata.${field}`)}
                </label>
              ))}
            </div>
          </SectionCard>

          <SectionCard section="funding" title="Funding snapshot" subtitle="Renders the funding card">
            <div className="grid gap-3 md:grid-cols-3">
              {Object.entries(formState.funding).map(([field, value]) => (
                <label key={field} className="text-xs uppercase tracking-[0.18em] text-[#a3a3a3]">
                  {field}
                  <input
                    className={getInputClasses(`funding.${field}`)}
                    aria-invalid={Boolean(fieldErrors[`funding.${field}`])}
                    value={value}
                    onChange={(event) => {
                      clearFieldError(`funding.${field}`);
                      setFundingField(field as keyof FundingState, event.target.value);
                    }}
                  />
                  {renderFieldError(`funding.${field}`)}
                </label>
              ))}
            </div>
          </SectionCard>

          <SectionCard section="traction" title="Traction narrative" subtitle="Shown under Traction overview">
            <textarea
              className={getInputClasses("tractionNarrative")}
              rows={4}
              value={formState.tractionNarrative}
              aria-invalid={Boolean(fieldErrors.tractionNarrative)}
              onChange={(event) => {
                clearFieldError("tractionNarrative");
                setFormState((prev) => ({
                  ...prev,
                  tractionNarrative: event.target.value,
                }));
              }}
            />
            {renderFieldError("tractionNarrative")}
          </SectionCard>

          <SectionCard
            section="snapshots"
            title="Snapshots"
            subtitle="Controls the live snapshot card"
            actions={(
              <button
                type="button"
                className="rounded-lg border border-[#2a2a2a] px-3 py-1 text-xs"
                onClick={addSnapshot}
              >
                + Add snapshot
              </button>
            )}
          >
            {formState.snapshots.length === 0 && (
              <p className="text-xs text-[#a3a3a3]">No snapshots yet.</p>
            )}
            {formState.snapshots.map((snapshot, index) => (
              <div key={snapshot.id} className="rounded-xl border border-[#2a2a2a] bg-[#0a0a0a] p-4 space-y-3">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-[#a3a3a3]">
                  <span>Snapshot {index + 1}</span>
                  <button
                    type="button"
                    className="text-[#f87171]"
                    onClick={() => removeSnapshot(index)}
                  >
                    Remove
                  </button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    "label",
                    "asOf",
                    "facilities",
                    "teams",
                    "players",
                    "events",
                    "dataPoints",
                  ].map((field) => (
                    <label key={field} className="text-xs uppercase tracking-[0.18em] text-[#a3a3a3]">
                      {field}
                      <input
                        className={getInputClasses(`snapshots.${index}.${field}`)}
                        aria-invalid={Boolean(fieldErrors[`snapshots.${index}.${field}`])}
                        value={snapshot[field as SnapshotField]}
                        onChange={(event) =>
                          {
                            clearFieldError(`snapshots.${index}.${field}`);
                            updateSnapshot(index, field as SnapshotField, event.target.value);
                          }
                        }
                      />
                      {renderFieldError(`snapshots.${index}.${field}`)}
                    </label>
                  ))}
                </div>
                <label className="text-xs uppercase tracking-[0.18em] text-[#a3a3a3]">
                  Highlights (one per line)
                  <textarea
                    className={getInputClasses(`snapshots.${index}.highlightsText`, "text-xs")}
                    rows={3}
                    value={snapshot.highlightsText}
                    aria-invalid={Boolean(fieldErrors[`snapshots.${index}.highlightsText`])}
                    onChange={(event) => {
                      clearFieldError(`snapshots.${index}.highlightsText`);
                      updateSnapshot(index, "highlightsText", event.target.value);
                    }}
                  />
                  {renderFieldError(`snapshots.${index}.highlightsText`)}
                </label>
              </div>
            ))}
          </SectionCard>

          <SectionCard
            section="investors"
            title="Investors"
            subtitle="Drives the personalized welcome cards"
            actions={(
              <button
                type="button"
                className="rounded-lg border border-[#2a2a2a] px-3 py-1 text-xs"
                onClick={addInvestor}
              >
                + Add investor
              </button>
            )}
          >
            {formState.investors.length === 0 && (
              <p className="text-xs text-[#a3a3a3]">No investors yet.</p>
            )}
            {formState.investors.map((investor, index) => (
              <div key={investor.id} className="rounded-xl border border-[#2a2a2a] bg-[#0a0a0a] p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between text-xs uppercase tracking-[0.18em] text-[#a3a3a3]">
                  <span>
                    Investor {index + 1}: {investor.name}
                  </span>
                  <button
                    type="button"
                    className="text-[#f87171]"
                    onClick={() => removeInvestor(index)}
                  >
                    Remove
                  </button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    "slug",
                    "name",
                    "firm",
                    "title",
                    "pin",
                    "pixelAccent",
                    "pixelMuted",
                  ].map((field) => (
                    <label key={field} className="text-xs uppercase tracking-[0.18em] text-[#a3a3a3]">
                      {field}
                      <input
                        className={getInputClasses(`investors.${index}.${field}`)}
                        aria-invalid={Boolean(fieldErrors[`investors.${index}.${field}`])}
                        value={investor[field as InvestorField]}
                        onChange={(event) => {
                          clearFieldError(`investors.${index}.${field}`);
                          updateInvestor(index, field as InvestorField, event.target.value);
                        }}
                      />
                      {renderFieldError(`investors.${index}.${field}`)}
                    </label>
                  ))}
                </div>
                {[
                  { label: "Focus area", field: "focusArea" },
                  { label: "Welcome note", field: "welcomeNote" },
                  { label: "Highlight", field: "highlight" },
                  { label: "Next step", field: "nextStep" },
                ].map(({ label, field }) => (
                  <label key={field} className="text-xs uppercase tracking-[0.18em] text-[#a3a3a3]">
                    {label}
                    <textarea
                      className={getInputClasses(`investors.${index}.${field}`)}
                      rows={field === "highlight" ? 2 : 3}
                      value={investor[field as InvestorField]}
                      aria-invalid={Boolean(fieldErrors[`investors.${index}.${field}`])}
                      onChange={(event) => {
                        clearFieldError(`investors.${index}.${field}`);
                        updateInvestor(index, field as InvestorField, event.target.value);
                      }}
                    />
                    {renderFieldError(`investors.${index}.${field}`)}
                  </label>
                ))}
                <label className="text-xs uppercase tracking-[0.18em] text-[#a3a3a3]">
                  Key questions (one per line)
                  <textarea
                    className={getInputClasses(`investors.${index}.keyQuestionsText`, "text-xs")}
                    rows={4}
                    value={investor.keyQuestionsText}
                    aria-invalid={Boolean(fieldErrors[`investors.${index}.keyQuestionsText`])}
                    onChange={(event) => {
                      clearFieldError(`investors.${index}.keyQuestionsText`);
                      updateInvestor(index, "keyQuestionsText", event.target.value);
                    }}
                  />
                  {renderFieldError(`investors.${index}.keyQuestionsText`)}
                </label>
              </div>
            ))}
          </SectionCard>

          <SectionCard
            section="prompts"
            title="Questionnaire prompts"
            subtitle="Used when sending a manual questionnaire"
            actions={(
              <button
                type="button"
                className="rounded-lg border border-[#2a2a2a] px-3 py-1 text-xs"
                onClick={addPrompt}
              >
                + Add prompt
              </button>
            )}
          >
            {formState.prompts.length === 0 && (
              <p className="text-xs text-[#a3a3a3]">No prompts configured.</p>
            )}
            {formState.prompts.map((prompt, index) => (
              <div key={prompt.id} className="rounded-xl border border-[#2a2a2a] bg-[#0a0a0a] p-4 space-y-2">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-[#a3a3a3]">
                  <span>Prompt {index + 1}</span>
                  <button
                    type="button"
                    className="text-[#f87171]"
                    onClick={() => removePrompt(index)}
                  >
                    Remove
                  </button>
                </div>
                {[
                  { field: "category", label: "Category" },
                  { field: "question", label: "Question" },
                  { field: "helper", label: "Helper" },
                ].map(({ field, label }) => (
                  <label key={field} className="text-xs uppercase tracking-[0.18em] text-[#a3a3a3]">
                    {label}
                    <input
                      className={getInputClasses(`prompts.${index}.${field}`)}
                      aria-invalid={Boolean(fieldErrors[`prompts.${index}.${field}`])}
                      value={prompt[field as keyof QuestionnairePrompt] as string}
                      onChange={(event) => {
                        clearFieldError(`prompts.${index}.${field}`);
                        updatePrompt(index, field as keyof QuestionnairePrompt, event.target.value);
                      }}
                    />
                    {renderFieldError(`prompts.${index}.${field}`)}
                  </label>
                ))}
              </div>
            ))}
          </SectionCard>

          <SectionCard section="timeline" title="Timeline note" subtitle="Saved with the history entry">
            <textarea
              className="w-full rounded-lg border border-[#2a2a2a] bg-[#090909] px-3 py-2"
              rows={3}
              placeholder="Optional summary saved in update_history."
              value={formState.notes}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, notes: event.target.value }))
              }
            />
          </SectionCard>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isPublishing}
              className="rounded-lg bg-[#cb6b1e] px-4 py-2 text-sm font-semibold text-black hover:bg-[#e37a2e] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isPublishing ? (
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-black border-t-transparent" />
                  Publishing...
                </span>
              ) : (
                "Publish update"
              )}
            </button>
            <button
              type="button"
              disabled={isPublishing}
              className="text-xs text-[#a3a3a3] underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-70"
              onClick={loadCurrentState}
            >
              Reload live data
            </button>
            <Link
              href="/"
              className="text-xs text-[#a3a3a3] underline-offset-4 hover:underline"
            >
              Back to investor dashboard
            </Link>
          </div>
          </fieldset>
        </form>

        <aside className="space-y-4 rounded-2xl border border-[#1f1f1f] bg-[#0b0b0b] p-4 lg:sticky lg:top-6 lg:h-fit">
          <div>
            <h2 className="text-sm font-semibold text-[#f6e1bd]">Live preview</h2>
            <p className="text-xs text-[#a3a3a3]">Click any card to highlight that section here.</p>
          </div>
          {previewContent ? (
            <div className="space-y-4 text-sm">
              <div className={`rounded-xl border bg-[#090909] p-3 ${previewHighlight("hero")}`}>
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#cb6b1e]">
                  {previewContent.hero.kicker}
                </p>
                <p className="text-lg font-semibold">
                  {previewContent.hero.h1Lead}
                  <span className="text-[#cb6b1e]"> {previewContent.hero.h1Accent} </span>
                  {previewContent.hero.h1Trail}
                </p>
                <p className="mt-1 text-xs text-[#a3a3a3]">
                  {previewContent.hero.mission}
                </p>
              </div>
              <div className={`rounded-xl border bg-[#090909] p-3 ${previewHighlight("metadata")}`}>
                <p className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">Countdown</p>
                <p className="text-sm">Launch target: {previewContent.metadata.launchTarget}</p>
                <p className="text-xs text-[#737373]">Milestone: {previewContent.metadata.milestoneLabel}</p>
              </div>
              <div className={`rounded-xl border bg-[#090909] p-3 ${previewHighlight("funding")}`}>
                <p className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">Funding</p>
                <p className="text-sm">
                  ${previewContent.funding.committed.toLocaleString()} committed of $
                  {previewContent.funding.target.toLocaleString()}
                </p>
                <p className="text-xs text-[#737373]">
                  Use of funds: {previewContent.funding.useOfFunds}
                </p>
              </div>
              <div className={`rounded-xl border bg-[#090909] p-3 ${previewHighlight("traction")}`}>
                <p className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">Traction narrative</p>
                <p className="text-sm text-[#d4d4d4]">
                  {previewContent.tractionNarrative}
                </p>
              </div>
              <div className={`rounded-xl border bg-[#090909] p-3 ${previewHighlight("snapshots")}`}>
                <p className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">Snapshots</p>
                <ul className="text-xs text-[#d4d4d4]">
                  {previewContent.snapshots.slice(0, 3).map((snapshot) => (
                    <li key={snapshot.label}>
                      {snapshot.label}: {snapshot.facilities} facilities, {snapshot.teams} teams
                    </li>
                  ))}
                  {previewContent.snapshots.length > 3 && <li>â€¦and more</li>}
                </ul>
              </div>
              <div className={`rounded-xl border bg-[#090909] p-3 ${previewHighlight("investors")}`}>
                {previewContent.investors.length > 0 ? (
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.18em] text-[#a3a3a3]">
                      Preview investor
                      <select
                        className="mt-1 w-full rounded-lg border border-[#2a2a2a] bg-[#090909] px-3 py-2"
                        value={previewInvestorIndex}
                        onChange={(event) => setPreviewInvestorIndex(Number(event.target.value))}
                      >
                        {previewContent.investors.map((investor, index) => (
                          <option key={investor.slug} value={index}>
                            {investor.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <PersonalizedWelcome
                      investor={previewContent.investors[previewInvestorIndex]}
                      milestoneLabel={previewContent.metadata.milestoneLabel}
                    />
                  </div>
                ) : (
                  <p className="text-xs text-[#a3a3a3]">Add investors to preview this section.</p>
                )}
              </div>
              <div className={`rounded-xl border bg-[#090909] p-3 ${previewHighlight("prompts")}`}>
                <p className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">Prompts</p>
                <ul className="text-xs text-[#d4d4d4]">
                  {previewContent.questionnaire.slice(0, 3).map((prompt) => (
                    <li key={prompt.id}>{prompt.category}: {prompt.question}</li>
                  ))}
                  {previewContent.questionnaire.length > 3 && <li>â€¦and more</li>}
                </ul>
              </div>
              <div className={`rounded-xl border bg-[#090909] p-3 ${previewHighlight("timeline")}`}>
                <p className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">Timeline note</p>
                <p className="text-xs text-[#d4d4d4]">
                  {formState.notes || "No note set."}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#a3a3a3]">Preview unavailable until data loads.</p>
          )}
        </aside>
      </main>
    </div>
  );
};

export default AdminPage;



