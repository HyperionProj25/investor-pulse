"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import AdminNav from "@/components/AdminNav";
import TimelineBoard from "@/components/TimelineBoard";
import { ADMIN_PERSONAS, ADMIN_SLUGS } from "@/lib/adminUsers";
import {
  createDefaultTimeline,
  generateId,
  generateTimingFromDates,
  hasValidationErrors,
  validateTimeline,
  type PhaseType,
  type TimelineData,
} from "@/lib/timeline";
import {
  AUTH_ERRORS,
  DATABASE_ERRORS,
  VALIDATION_ERRORS,
} from "@/lib/errorMessages";

const phaseTypes: PhaseType[] = ["planning", "dev", "test", "launch", "post"];

const fieldClasses =
  "w-full rounded-lg border border-[#2a2a2a] bg-[#090909] px-3 py-2 text-sm text-[#f6e1bd] focus:border-[#cb6b1e] focus:outline-none";

const AdminTimelinePage = () => {
  const [authorizedAdmin, setAuthorizedAdmin] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [timeline, setTimeline] = useState<TimelineData>(() =>
    createDefaultTimeline()
  );
  const [monthsInput, setMonthsInput] = useState(
    createDefaultTimeline().timelineMonths.join("\n")
  );
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationIssues, setValidationIssues] = useState<string[]>([]);

  const adminLabel = useMemo(() => {
    if (!authorizedAdmin) {
      return null;
    }
    const admin = ADMIN_PERSONAS.find((person) => person.slug === authorizedAdmin);
    return admin?.shortLabel ?? admin?.name ?? authorizedAdmin;
  }, [authorizedAdmin]);

  const applyTimeline = useCallback((next: TimelineData | null) => {
    const shaped = next ?? createDefaultTimeline();
    setTimeline(shaped);
    setMonthsInput((shaped.timelineMonths ?? []).join("\n"));
  }, []);

  const loadTimeline = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/update-schedule");
      if (!response.ok) {
        throw new Error(DATABASE_ERRORS.SITE_STATE_FETCH);
      }
      const data = (await response.json()) as TimelineData | null;
      applyTimeline(data);
    } catch (err) {
      console.error("Timeline fetch failed:", err);
      setError(DATABASE_ERRORS.SITE_STATE_FETCH);
      toast.error(DATABASE_ERRORS.SITE_STATE_FETCH);
    } finally {
      setLoading(false);
    }
  }, [applyTimeline]);

  useEffect(() => {
    const verifySession = async () => {
      try {
        const response = await fetch("/api/auth/session");
        if (!response.ok) {
          setAuthorizedAdmin(null);
          return;
        }
        const data = await response.json();
        if (data.role === "admin" && ADMIN_SLUGS.includes(data.slug)) {
          setAuthorizedAdmin(data.slug);
          await loadTimeline();
        } else {
          setAuthorizedAdmin(null);
        }
      } catch (err) {
        console.error("Failed to verify admin session:", err);
        setAuthorizedAdmin(null);
      } finally {
        setSessionChecked(true);
        setLoading(false);
      }
    };
    void verifySession();
  }, [loadTimeline]);

  const handleMonthsChange = (value: string) => {
    setMonthsInput(value);
    const parsed = value
      .split(/\n|,/)
      .map((line) => line.trim())
      .filter(Boolean);
    setTimeline((prev) => ({
      ...prev,
      timelineMonths: parsed,
    }));
  };

  const updatePhase = (
    id: string,
    field: keyof TimelineData["phases"][number],
    value: string
  ) => {
    const parsedValue =
      field === "startPercent" || field === "widthPercent"
        ? Number(value)
        : field === "type"
        ? (value as PhaseType)
        : value;
    setTimeline((prev) => ({
      ...prev,
      phases: prev.phases.map((phase) =>
        phase.id === id
          ? {
              ...phase,
              [field]: parsedValue,
            }
          : phase
      ),
    }));
  };

  const addPhase = () => {
    // Default to a 2-week phase starting from timeline start
    const defaultStart = timeline.timelineStart;
    const startDate = new Date(defaultStart);
    startDate.setDate(startDate.getDate() + 14);
    const defaultEnd = startDate.toISOString().split('T')[0];

    setTimeline((prev) => ({
      ...prev,
      phases: [
        ...prev.phases,
        {
          id: generateId("phase"),
          type: "planning",
          label: "New phase",
          timing: generateTimingFromDates(defaultStart, defaultEnd),
          focus: "Describe the focus for this phase.",
          startDate: defaultStart,
          endDate: defaultEnd,
          color: "#6b7280",
          colorGradient: "",
        },
      ],
    }));
  };

  const removePhase = (id: string) => {
    setTimeline((prev) => ({
      ...prev,
      phases: prev.phases.filter((phase) => phase.id !== id),
    }));
  };

  const updateMilestone = (
    id: string,
    field: keyof TimelineData["milestones"][number],
    value: string
  ) => {
    setTimeline((prev) => ({
      ...prev,
      milestones: prev.milestones.map((milestone) =>
        milestone.id === id ? { ...milestone, [field]: value } : milestone
      ),
    }));
  };

  const addMilestone = () => {
    setTimeline((prev) => ({
      ...prev,
      milestones: [
        ...prev.milestones,
        {
          id: generateId("milestone"),
          title: "New milestone",
          date: new Date().toISOString().slice(0, 10),
          meta: "",
        },
      ],
    }));
  };

  const removeMilestone = (id: string) => {
    setTimeline((prev) => ({
      ...prev,
      milestones: prev.milestones.filter((milestone) => milestone.id !== id),
    }));
  };

  const handleSave = async () => {
    setValidationIssues([]);
    if (!authorizedAdmin) {
      toast.error(AUTH_ERRORS.ADMIN_ACCESS_REQUIRED);
      return;
    }

    const validation = validateTimeline(timeline);
    if (hasValidationErrors(validation)) {
      const issues = Object.entries(validation).flatMap(([key, messages]) =>
        messages.map((message) => `${key}: ${message}`)
      );
      setValidationIssues(issues);
      toast.error(VALIDATION_ERRORS.PUBLISH_FIELDS_INCOMPLETE);
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/admin/update-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminSlug: authorizedAdmin,
          timeline,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error ?? DATABASE_ERRORS.QUESTIONNAIRE_UPDATE_FAILED);
      }
      applyTimeline(data.timeline ?? timeline);
      setValidationIssues([]);
      toast.success("Timeline saved.");
    } catch (err) {
      console.error("Timeline save failed:", err);
      toast.error(DATABASE_ERRORS.QUESTIONNAIRE_UPDATE_FAILED);
    } finally {
      setSaving(false);
    }
  };

  if (!sessionChecked) {
    return (
      <div className="min-h-screen bg-[#020202] text-[#f6e1bd] flex items-center justify-center">
        <p role="status" aria-live="polite" className="text-sm text-[#a3a3a3]">
          Verifying admin access…
        </p>
      </div>
    );
  }

  if (!authorizedAdmin) {
    return (
      <div className="min-h-screen bg-[#020202] text-[#f6e1bd] flex items-center justify-center px-4">
        <div className="space-y-3 text-center">
          <p className="text-sm text-[#a3a3a3]">
            {AUTH_ERRORS.ADMIN_ACCESS_REQUIRED}
          </p>
          <Link
            href="/?mode=admin"
            className="inline-flex items-center justify-center rounded-full border border-white/20 px-5 py-2 text-sm text-[#f6e1bd] hover:border-[#cb6b1e] hover:text-[#cb6b1e]"
          >
            Return to access portal
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020202] text-[#f6e1bd]">
      <AdminNav adminLabel={adminLabel || undefined} />
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[1.5fr_1fr] lg:px-8"
      >
        <section className="space-y-6 rounded-3xl border border-[#1f1f1f] bg-[#0b0b0b]/90 p-6">
          <header className="space-y-1">
            <p className="text-[11px] uppercase tracking-[0.3em] text-[#cb6b1e]">
              Timeline editor
            </p>
            <h1 className="text-2xl font-semibold">
              Update schedule & Gantt control
            </h1>
            <p className="text-sm text-[#a3a3a3]">
              {adminLabel
                ? `Signed in as ${adminLabel}. Publish timeline edits to keep the investor page in sync.`
                : "Admin session active."}
            </p>
          </header>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-[#cb6b1e] px-4 py-2 text-sm font-semibold text-black hover:bg-[#e37a2e] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? "Saving…" : "Save timeline"}
            </button>
            <button
              type="button"
              onClick={() => void loadTimeline()}
              disabled={saving}
              className="rounded-lg border border-[#2a2a2a] px-4 py-2 text-sm text-[#f6e1bd] hover:border-[#cb6b1e] disabled:cursor-not-allowed disabled:opacity-70"
            >
              Reload live data
            </button>
            <Link
              href="/admin"
              className="text-xs text-[#a3a3a3] underline-offset-4 hover:underline"
            >
              Back to admin workspace
            </Link>
          </div>

          {loading && (
            <div
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[#a3a3a3]"
              role="status"
              aria-live="polite"
            >
              Loading latest timeline…
            </div>
          )}

          {error && (
            <div
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100"
              role="alert"
              aria-live="assertive"
            >
              {error}
            </div>
          )}

          {validationIssues.length > 0 && (
            <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100">
              <p className="font-semibold">Resolve the following:</p>
              <ul className="mt-2 list-disc pl-4 text-xs space-y-1">
                {validationIssues.map((issue, index) => (
                  <li key={`${issue}-${index}`}>{issue}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-6">
            <section className="space-y-3 rounded-2xl border border-[#1f1f1f] bg-[#090909] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold">Timeline metadata</h2>
                  <p className="text-xs text-[#737373]">
                    Controls the hero copy on the public schedule page.
                  </p>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                  Title
                  <input
                    className={`${fieldClasses} mt-1`}
                    value={timeline.title}
                    onChange={(event) =>
                      setTimeline((prev) => ({ ...prev, title: event.target.value }))
                    }
                  />
                </label>
                <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                  Subtitle
                  <input
                    className={`${fieldClasses} mt-1`}
                    value={timeline.subtitle}
                    onChange={(event) =>
                      setTimeline((prev) => ({
                        ...prev,
                        subtitle: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                  Start date
                  <input
                    type="date"
                    className={`${fieldClasses} mt-1`}
                    value={timeline.timelineStart}
                    onChange={(event) =>
                      setTimeline((prev) => ({
                        ...prev,
                        timelineStart: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                  End date
                  <input
                    type="date"
                    className={`${fieldClasses} mt-1`}
                    value={timeline.timelineEnd}
                    onChange={(event) =>
                      setTimeline((prev) => ({
                        ...prev,
                        timelineEnd: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
              <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                Footer text
                <textarea
                  rows={2}
                  className={`${fieldClasses} mt-1`}
                  value={timeline.footerText}
                  onChange={(event) =>
                    setTimeline((prev) => ({
                      ...prev,
                      footerText: event.target.value,
                    }))
                  }
                />
              </label>
            </section>

            <section className="space-y-3 rounded-2xl border border-[#1f1f1f] bg-[#090909] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold">Timeline months</h2>
                  <p className="text-xs text-[#737373]">
                    Enter one label per line (e.g., &quot;Dec 2025&quot;).
                  </p>
                </div>
              </div>
              <textarea
                rows={4}
                className={`${fieldClasses} font-mono`}
                value={monthsInput}
                onChange={(event) => handleMonthsChange(event.target.value)}
              />
            </section>

            <section className="space-y-4 rounded-2xl border border-[#1f1f1f] bg-[#090909] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold">Phases</h2>
                  <p className="text-xs text-[#737373]">
                    Each phase drives the legend, table, and bar placement.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addPhase}
                  className="rounded-lg border border-[#2a2a2a] px-3 py-1 text-xs hover:border-[#cb6b1e]"
                >
                  + Add phase
                </button>
              </div>
              {timeline.phases.length === 0 && (
                <p className="text-xs text-[#a3a3a3]">No phases configured.</p>
              )}
              {timeline.phases.map((phase, index) => (
                <div
                  key={phase.id}
                  className="space-y-3 rounded-xl border border-[#1f1f1f] bg-[#050505] p-4"
                >
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[#737373]">
                    <span>
                      Phase {index + 1}: {phase.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => removePhase(phase.id)}
                      className="text-[#f87171]"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                      Label
                      <input
                        className={`${fieldClasses} mt-1`}
                        value={phase.label}
                        onChange={(event) =>
                          updatePhase(phase.id, "label", event.target.value)
                        }
                      />
                    </label>
                    <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                      Timing
                      <input
                        className={`${fieldClasses} mt-1`}
                        value={phase.timing}
                        onChange={(event) =>
                          updatePhase(phase.id, "timing", event.target.value)
                        }
                      />
                    </label>
                  </div>
                  <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                    Focus
                    <textarea
                      rows={2}
                      className={`${fieldClasses} mt-1`}
                      value={phase.focus}
                      onChange={(event) =>
                        updatePhase(phase.id, "focus", event.target.value)
                      }
                    />
                  </label>
                  <div className="grid gap-3 md:grid-cols-3">
                    <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                      Type
                      <select
                        className={`${fieldClasses} mt-1`}
                        value={phase.type}
                        onChange={(event) =>
                          updatePhase(phase.id, "type", event.target.value)
                        }
                      >
                        {phaseTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                      Start Date
                      <input
                        type="date"
                        className={`${fieldClasses} mt-1`}
                        value={phase.startDate ?? ""}
                        onChange={(event) => {
                          updatePhase(phase.id, "startDate", event.target.value);
                          // Auto-update timing when dates change
                          if (phase.endDate) {
                            const newTiming = generateTimingFromDates(event.target.value, phase.endDate);
                            updatePhase(phase.id, "timing", newTiming);
                          }
                        }}
                      />
                    </label>
                    <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                      End Date
                      <input
                        type="date"
                        className={`${fieldClasses} mt-1`}
                        value={phase.endDate ?? ""}
                        onChange={(event) => {
                          updatePhase(phase.id, "endDate", event.target.value);
                          // Auto-update timing when dates change
                          if (phase.startDate) {
                            const newTiming = generateTimingFromDates(phase.startDate, event.target.value);
                            updatePhase(phase.id, "timing", newTiming);
                          }
                        }}
                      />
                    </label>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                      Solid color
                      <input
                        className={`${fieldClasses} mt-1`}
                        value={phase.color ?? ""}
                        onChange={(event) =>
                          updatePhase(phase.id, "color", event.target.value)
                        }
                      />
                    </label>
                    <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                      Gradient CSS
                      <input
                        className={`${fieldClasses} mt-1`}
                        value={phase.colorGradient ?? ""}
                        onChange={(event) =>
                          updatePhase(phase.id, "colorGradient", event.target.value)
                        }
                      />
                    </label>
                  </div>
                </div>
              ))}
            </section>

            <section className="space-y-4 rounded-2xl border border-[#1f1f1f] bg-[#090909] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold">Milestones</h2>
                  <p className="text-xs text-[#737373]">
                    Displayed as cards beneath the Gantt chart.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addMilestone}
                  className="rounded-lg border border-[#2a2a2a] px-3 py-1 text-xs hover:border-[#cb6b1e]"
                >
                  + Add milestone
                </button>
              </div>
              {timeline.milestones.map((milestone, index) => (
                <div
                  key={milestone.id}
                  className="space-y-3 rounded-xl border border-[#1f1f1f] bg-[#050505] p-4"
                >
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[#737373]">
                    <span>
                      Milestone {index + 1}: {milestone.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeMilestone(milestone.id)}
                      className="text-[#f87171]"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                      Title
                      <input
                        className={`${fieldClasses} mt-1`}
                        value={milestone.title}
                        onChange={(event) =>
                          updateMilestone(milestone.id, "title", event.target.value)
                        }
                      />
                    </label>
                    <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                      Date
                      <input
                        type="date"
                        className={`${fieldClasses} mt-1`}
                        value={milestone.date}
                        onChange={(event) =>
                          updateMilestone(milestone.id, "date", event.target.value)
                        }
                      />
                    </label>
                  </div>
                  <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                    Meta label (optional)
                    <input
                      className={`${fieldClasses} mt-1`}
                      value={milestone.meta ?? ""}
                      onChange={(event) =>
                        updateMilestone(milestone.id, "meta", event.target.value)
                      }
                    />
                  </label>
                </div>
              ))}
            </section>

            <section className="space-y-3 rounded-2xl border border-[#1f1f1f] bg-[#090909] p-4">
              <div>
                <h2 className="text-sm font-semibold">Color palette</h2>
                <p className="text-xs text-[#737373]">
                  Used for the legend and fallback colors.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {phaseTypes.map((type) => (
                  <label
                    key={type}
                    className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]"
                  >
                    {type} color
                    <input
                      className={`${fieldClasses} mt-1`}
                      value={timeline.colors[type]}
                      onChange={(event) =>
                        setTimeline((prev) => ({
                          ...prev,
                          colors: { ...prev.colors, [type]: event.target.value },
                        }))
                      }
                    />
                  </label>
                ))}
              </div>
            </section>

            <section className="space-y-3 rounded-2xl border border-[#1f1f1f] bg-[#090909] p-4">
              <h2 className="text-sm font-semibold">Update note</h2>
              <p className="text-xs text-[#737373]">
                Optional note saved alongside the history entry.
              </p>
              <textarea
                rows={3}
                className={fieldClasses}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="e.g., Synced countdown dates with facility launch sprint."
              />
            </section>
          </div>
        </section>

        <aside className="space-y-4 rounded-3xl border border-[#1f1f1f] bg-[#050505]/90 p-4 lg:sticky lg:top-10 lg:h-fit">
          <div>
            <h2 className="text-sm font-semibold text-[#f6e1bd]">
              Live preview
            </h2>
            <p className="text-xs text-[#737373]">
              Matches the investor-facing /update-schedule route.
            </p>
          </div>
          <TimelineBoard timeline={timeline} showBackLink={false} variant="preview" />
        </aside>
      </main>
    </div>
  );
};

export default AdminTimelinePage;
