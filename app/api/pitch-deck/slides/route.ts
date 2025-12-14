import { NextRequest, NextResponse } from "next/server";
import { AUTH_ERRORS } from "../../../../lib/errorMessages";
import { getServiceSupabaseClient } from "../../../../lib/supabaseClient";
import { ADMIN_SLUGS } from "../../../../lib/adminUsers";
import { SESSION_COOKIE, verifySessionToken } from "../../../../lib/session";
import { cookies } from "next/headers";

// GET - Fetch all active slides
export async function GET() {
  try {
    // Verify admin or deck session
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE)?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { error: AUTH_ERRORS.NOT_AUTHENTICATED },
        { status: 401 }
      );
    }

    const session = verifySessionToken(sessionCookie);

    if (!session || !["admin", "deck"].includes(session.role)) {
      return NextResponse.json(
        { error: AUTH_ERRORS.NOT_AUTHENTICATED },
        { status: 403 }
      );
    }

    const supabase = getServiceSupabaseClient();

    // Fetch all active slides ordered by display_order
    const { data: slides, error } = await supabase
      .from("pitch_deck_slides")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error) {
      throw error;
    }

    // Fetch settings
    const { data: settings } = await supabase
      .from("pitch_deck_settings")
      .select("*")
      .single();

    return NextResponse.json({
      slides: slides || [],
      settings: settings || { slide_size: "medium" },
    });
  } catch (error) {
    console.error("Failed to fetch slides:", error);
    return NextResponse.json(
      { error: "Failed to fetch slides" },
      { status: 500 }
    );
  }
}

// POST - Update slides (delete, reorder)
export async function POST(request: NextRequest) {
  try {
    // Verify admin session only
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE)?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { error: AUTH_ERRORS.NOT_AUTHENTICATED },
        { status: 401 }
      );
    }

    const session = verifySessionToken(sessionCookie);

    if (!session || session.role !== "admin" || !ADMIN_SLUGS.includes(session.slug)) {
      return NextResponse.json(
        { error: AUTH_ERRORS.ADMIN_ACCESS_REQUIRED },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, slideId, slides } = body;

    const supabase = getServiceSupabaseClient();

    if (action === "delete") {
      // Mark slide as inactive
      const { error } = await supabase
        .from("pitch_deck_slides")
        .update({ is_active: false })
        .eq("id", slideId);

      if (error) {
        throw error;
      }

      return NextResponse.json({ success: true });
    }

    if (action === "reorder") {
      // Update display_order for all slides
      for (const slide of slides) {
        const { error } = await supabase
          .from("pitch_deck_slides")
          .update({ display_order: slide.display_order })
          .eq("id", slide.id);

        if (error) {
          throw error;
        }
      }

      return NextResponse.json({ success: true });
    }

    if (action === "update_size") {
      // Update slide size setting
      const { size } = body;

      const { error } = await supabase
        .from("pitch_deck_settings")
        .update({ slide_size: size, updated_at: new Date().toISOString() })
        .eq("id", (await supabase.from("pitch_deck_settings").select("id").single()).data?.id);

      if (error) {
        throw error;
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Failed to update slides:", error);
    return NextResponse.json(
      { error: "Failed to update slides" },
      { status: 500 }
    );
  }
}
