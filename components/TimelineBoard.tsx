"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import BaselineLogo from "./BaselineLogo";
import {
  calculateTodayLinePosition,
  calculatePhasePosition,
  formatMilestoneDate,
  type Phase,
  type TimelineData,
} from "@/lib/timeline";

type TimelineBoardProps = {
  timeline: TimelineData;
  showBackLink?: boolean;
  variant?: "page" | "preview";
};

const formatRangeLabel = (start: string, end: string) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  });

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return `${start} – ${end}`;
  }

  return `${formatter.format(startDate)} – ${formatter.format(endDate)}`;
};

const buildFallbackMonths = (start: string, end: string) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return [];
  }

  const months: string[] = [];
  const cursor = new Date(startDate);
  cursor.setDate(1);

  while (cursor <= endDate) {
    months.push(
      cursor.toLocaleDateString("en-US", { month: "short", year: "numeric" })
    );
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months;
};

const clampPercent = (value: number) => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(Math.max(value, 0), 100);
};

const getPhaseColor = (phase: Phase, palette: TimelineData["colors"]) => {
  if (phase.colorGradient) return phase.colorGradient;
  if (phase.color) return phase.color;
  const hex = palette[phase.type];
  return hex ?? "#cb6b1e";
};

const TimelineBoard = ({
  timeline,
  showBackLink = true,
  variant = "page",
}: TimelineBoardProps) => {
  // Calculate today line position only on client to avoid hydration mismatch
  const [todayPercent, setTodayPercent] = useState(0);

  useEffect(() => {
    setTodayPercent(
      calculateTodayLinePosition(timeline.timelineStart, timeline.timelineEnd)
    );
  }, [timeline.timelineStart, timeline.timelineEnd]);

  const rangeLabel = formatRangeLabel(
    timeline.timelineStart,
    timeline.timelineEnd
  );
  const monthLabels =
    timeline.timelineMonths.length > 0
      ? timeline.timelineMonths
      : buildFallbackMonths(timeline.timelineStart, timeline.timelineEnd);

  const updatedDetail = useMemo(() => {
    if (!timeline.updatedAt) {
      return "Timeline data";
    }
    const formatted = new Date(timeline.updatedAt).toLocaleDateString(
      "en-US",
      {
        month: "long",
        day: "numeric",
        year: "numeric",
      }
    );
    return `Updated ${formatted}${timeline.updatedBy ? ` by ${timeline.updatedBy}` : ""}`;
  }, [timeline.updatedAt, timeline.updatedBy]);

  const containerClasses =
    variant === "preview"
      ? "rounded-2xl border border-[#1f1f1f] bg-[#050505]/90 p-5 text-sm space-y-5"
      : "rounded-3xl border border-[#1f1f1f] bg-[#050505]/95 p-8 space-y-6 shadow-2xl";

  const titleClasses =
    variant === "preview" ? "text-xl" : "text-2xl sm:text-3xl";

  const headerSpacing = variant === "preview" ? "gap-3" : "gap-4";

  return (
    <div className={containerClasses}>
      {showBackLink && (
        <div className="flex justify-end">
          <Link
            href="/"
            className="inline-flex items-center rounded-full border border-white/20 px-4 py-1 text-[11px] uppercase tracking-[0.3em] text-[#f6e1bd] hover:border-[#cb6b1e] hover:text-[#cb6b1e]"
          >
            ← Investor Pulse
          </Link>
        </div>
      )}
      <header className={`flex flex-col ${headerSpacing}`}>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl border border-white/15 bg-[#0b0b0b] flex items-center justify-center">
            <BaselineLogo size="w-10 h-10" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-[#cb6b1e]">
              Baseline Analytics
            </p>
            <p className={`font-semibold text-[#f6e1bd] ${titleClasses}`}>
              {timeline.title}
            </p>
          </div>
        </div>
        <p className="text-sm text-[#d4c2a2]">{timeline.subtitle}</p>
        <div className="text-xs uppercase tracking-[0.2em] text-[#a99b82]">
          {rangeLabel}
        </div>
        <p className="text-[11px] text-[#8c846d]">{updatedDetail}</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xs uppercase tracking-[0.3em] text-[#4f9edb]">
          Phase overview
        </h2>
        <div className="flex flex-wrap gap-3 text-[11px] text-[#d4c2a2]">
          {Object.entries(timeline.colors).map(([key, color]) => (
            <span key={key} className="inline-flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full"
                style={{ background: color }}
                aria-hidden="true"
              />
              {key}
            </span>
          ))}
        </div>
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-white/5 text-[11px] uppercase tracking-[0.2em] text-[#a99b82]">
              <tr>
                <th className="px-4 py-3 text-left">Phase</th>
                <th className="px-4 py-3 text-left">Timing</th>
                <th className="px-4 py-3 text-left">Focus</th>
              </tr>
            </thead>
            <tbody>
              {timeline.phases.map((phase) => (
                <tr
                  key={phase.id}
                  className="border-t border-white/5 text-[#f6e1bd]"
                >
                  <td className="px-4 py-3 font-semibold uppercase tracking-[0.15em]">
                    {phase.label}
                  </td>
                  <td className="px-4 py-3 text-[#d4c2a2]">{phase.timing}</td>
                  <td className="px-4 py-3 text-[#a99b82]">{phase.focus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs uppercase tracking-[0.3em] text-[#f6e1bd]">
              Detailed timeline
            </h2>
            <p className="text-[12px] text-[#a99b82]">{rangeLabel}</p>
          </div>
          <div className="text-[11px] text-[#cb6b1e] uppercase tracking-[0.2em]">
            Today marker
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 text-[11px] uppercase tracking-[0.2em] text-[#a99b82] mb-4">
            {monthLabels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          <div className="space-y-3">
            {timeline.phases.map((phase) => {
              // Calculate position from dates if available, fall back to legacy percentages
              const hasDateFields = phase.startDate && phase.endDate;
              const { startPercent: calcStart, widthPercent: calcWidth } = hasDateFields
                ? calculatePhasePosition(phase, timeline.timelineStart, timeline.timelineEnd)
                : { startPercent: phase.startPercent ?? 0, widthPercent: phase.widthPercent ?? 20 };

              const start = clampPercent(calcStart);
              const width = clampPercent(calcWidth);
              const resolvedWidth =
                start + width > 100 ? 100 - start : width;
              return (
                <div
                  key={`gantt-${phase.id}`}
                  className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4"
                >
                  <div className="w-full sm:w-48 text-[11px] uppercase tracking-[0.2em] text-[#d4c2a2]">
                    {phase.label}
                  </div>
                  <div className="relative h-6 flex-1 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="absolute top-0 bottom-0 rounded-full"
                      style={{
                        left: `${start}%`,
                        width: `${resolvedWidth}%`,
                        background: getPhaseColor(phase, timeline.colors),
                      }}
                    />
                    <div
                      className="absolute top-0 bottom-0 w-[2px] bg-[#f26c1a] shadow-[0_0_10px_rgba(242,108,26,0.7)]"
                      style={{ left: `${todayPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs uppercase tracking-[0.3em] text-[#4f9edb]">
          Key milestones
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {timeline.milestones.map((milestone) => (
            <div
              key={milestone.id}
              className="rounded-2xl border border-white/10 bg-black/30 p-4"
            >
              <p className="text-[11px] uppercase tracking-[0.25em] text-[#a99b82]">
                {milestone.title}
              </p>
              <p className="text-sm text-[#f6e1bd]">
                {milestone.meta || formatMilestoneDate(milestone.date)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <footer className="text-[11px] text-[#8c846d]">
        {timeline.footerText || "Timeline synced with Supabase update schedule."}
      </footer>
    </div>
  );
};

export default TimelineBoard;
