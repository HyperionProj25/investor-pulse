import { getServiceSupabaseClient } from "./supabaseClient";
import {
  createDefaultTimeline,
  type TimelineData,
  type Phase,
  type Milestone,
} from "./timeline";

const mapPhaseRecord = (raw: Phase): Phase => ({
  id: raw.id,
  type: raw.type,
  label: raw.label,
  timing: raw.timing,
  focus: raw.focus,
  startPercent: raw.startPercent,
  widthPercent: raw.widthPercent,
  color: raw.color,
  colorGradient: raw.colorGradient,
});

const mapMilestoneRecord = (raw: Milestone): Milestone => ({
  id: raw.id,
  title: raw.title,
  date: raw.date,
  meta: raw.meta,
});

export const fetchActiveTimeline = async (): Promise<TimelineData> => {
  const fallback = createDefaultTimeline();
  try {
    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase
      .from("update_schedule_state")
      .select("*")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Failed to load timeline data:", error);
      return createDefaultTimeline();
    }

    if (!data) {
      return createDefaultTimeline();
    }

    return {
      id: data.id,
      timelineStart: data.timeline_start,
      timelineEnd: data.timeline_end,
      timelineMonths: Array.isArray(data.timeline_months)
        ? data.timeline_months
        : fallback.timelineMonths,
      phases: Array.isArray(data.phases)
        ? (data.phases as Phase[]).map(mapPhaseRecord)
        : fallback.phases,
      milestones: Array.isArray(data.milestones)
        ? (data.milestones as Milestone[]).map(mapMilestoneRecord)
        : fallback.milestones,
      title: data.title ?? fallback.title,
      subtitle: data.subtitle ?? "",
      footerText: data.footer_text ?? "",
      colors: data.colors ?? fallback.colors,
      version: data.version ?? 1,
      updatedBy: data.updated_by ?? undefined,
      updatedAt: data.updated_at ?? undefined,
    };
  } catch (error) {
    console.error("Timeline fetch failed:", error);
    return createDefaultTimeline();
  }
};
