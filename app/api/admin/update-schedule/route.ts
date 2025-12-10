// API route for managing update schedule timeline data
// GET: Fetch active timeline
// POST: Create or update timeline

import { NextResponse } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabaseClient";
import { AUTH_ERRORS, DATABASE_ERRORS, VALIDATION_ERRORS } from "@/lib/errorMessages";
import { ADMIN_SLUGS } from "@/lib/adminUsers";
import { validateTimeline, hasValidationErrors, type TimelineData } from "@/lib/timeline";

/**
 * GET /api/admin/update-schedule
 * Fetch the active timeline for display or editing
 * Public access (anyone can read the active schedule)
 */
export async function GET() {
  try {
    const supabase = getServiceSupabaseClient();

    const { data, error } = await supabase
      .from('update_schedule_state')
      .select('*')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Supabase error fetching timeline:', error);
      throw error;
    }

    // If no timeline exists, return null
    if (!data) {
      return NextResponse.json(null);
    }

    // Transform database record to TimelineData format
    const timeline: TimelineData = {
      id: data.id,
      timelineStart: data.timeline_start,
      timelineEnd: data.timeline_end,
      timelineMonths: data.timeline_months,
      phases: data.phases,
      milestones: data.milestones,
      title: data.title,
      subtitle: data.subtitle || '',
      footerText: data.footer_text || '',
      colors: data.colors,
      version: data.version,
      updatedBy: data.updated_by,
      updatedAt: data.updated_at
    };

    return NextResponse.json(timeline);
  } catch (error) {
    console.error('Failed to fetch timeline:', error);
    return NextResponse.json(
      { error: DATABASE_ERRORS.SITE_STATE_FETCH },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/update-schedule
 * Create or update the timeline
 * Requires admin authorization
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { adminSlug, timeline, notes } = body;

    // Validate admin authorization
    if (!adminSlug || !ADMIN_SLUGS.includes(adminSlug)) {
      return NextResponse.json(
        { error: AUTH_ERRORS.ADMIN_ACCESS_REQUIRED },
        { status: 401 }
      );
    }

    if (!timeline) {
      return NextResponse.json(
        { error: VALIDATION_ERRORS.PAYLOAD_REQUIRED },
        { status: 400 }
      );
    }

    // Validate timeline data
    const validationErrors = validateTimeline(timeline as TimelineData);
    if (hasValidationErrors(validationErrors)) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationErrors
        },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabaseClient();

    // Get current active timeline (if any)
    const { data: current, error: fetchError } = await supabase
      .from('update_schedule_state')
      .select('*')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error('Supabase error fetching current timeline:', fetchError);
      throw fetchError;
    }

    const nextVersion = (current?.version ?? 0) + 1;

    // Prepare timeline record for database
    const timelineRecord = {
      timeline_start: timeline.timelineStart,
      timeline_end: timeline.timelineEnd,
      timeline_months: timeline.timelineMonths,
      phases: timeline.phases,
      milestones: timeline.milestones,
      title: timeline.title,
      subtitle: timeline.subtitle,
      footer_text: timeline.footerText,
      colors: timeline.colors,
      version: nextVersion,
      updated_by: adminSlug,
      updated_at: new Date().toISOString(),
      is_active: true
    };

    let result;

    if (current) {
      // Update existing timeline
      const { data, error } = await supabase
        .from('update_schedule_state')
        .update(timelineRecord)
        .eq('id', current.id)
        .select()
        .single();

      if (error) {
        console.error('Supabase error updating timeline:', error);
        throw error;
      }
      result = data;
    } else {
      // Create new timeline
      const { data, error } = await supabase
        .from('update_schedule_state')
        .insert(timelineRecord)
        .select()
        .single();

      if (error) {
        console.error('Supabase error creating timeline:', error);
        throw error;
      }
      result = data;
    }

    // Transform result back to TimelineData format
    const savedTimeline: TimelineData = {
      id: result.id,
      timelineStart: result.timeline_start,
      timelineEnd: result.timeline_end,
      timelineMonths: result.timeline_months,
      phases: result.phases,
      milestones: result.milestones,
      title: result.title,
      subtitle: result.subtitle,
      footerText: result.footer_text,
      colors: result.colors,
      version: result.version,
      updatedBy: result.updated_by,
      updatedAt: result.updated_at
    };

    const { error: historyError } = await supabase
      .from('update_schedule_history')
      .insert({
        author: adminSlug,
        version: nextVersion,
        timeline,
        notes: notes ?? null
      });

    if (historyError) {
      console.error('Supabase error inserting timeline history:', historyError);
      throw historyError;
    }

    return NextResponse.json({
      ok: true,
      version: nextVersion,
      timeline: savedTimeline
    });
  } catch (error) {
    console.error('Timeline update failed:', error);
    return NextResponse.json(
      { error: DATABASE_ERRORS.QUESTIONNAIRE_UPDATE_FAILED },
      { status: 500 }
    );
  }
}
