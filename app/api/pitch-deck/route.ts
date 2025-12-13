import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { DATABASE_ERRORS, VALIDATION_ERRORS, AUTH_ERRORS } from "@/lib/errorMessages";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { ADMIN_SLUGS, ADMIN_PERSONAS } from "@/lib/adminUsers";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// GET /api/pitch-deck - Fetch current pitch deck content
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("pitch_deck_state")
      .select("id, updated_at, version, payload")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error("Error fetching pitch deck state:", error);
      return NextResponse.json(
        { error: DATABASE_ERRORS.PITCH_DECK_FETCH },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { error: DATABASE_ERRORS.GENERIC },
      { status: 500 }
    );
  }
}

// POST /api/pitch-deck - Update pitch deck content (admin only)
export async function POST(request: Request) {
  try {
    // Verify admin session
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE)?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { error: AUTH_ERRORS.NOT_AUTHENTICATED },
        { status: 401 }
      );
    }

    const session = verifySessionToken(sessionCookie);

    if (!session) {
      return NextResponse.json(
        { error: AUTH_ERRORS.SESSION_INVALID },
        { status: 401 }
      );
    }

    // Only admins can update pitch deck
    if (session.role !== "admin" || !ADMIN_SLUGS.includes(session.slug)) {
      return NextResponse.json(
        { error: AUTH_ERRORS.ADMIN_ACCESS_REQUIRED },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { payload, notes } = body;

    if (!payload) {
      return NextResponse.json(
        { error: VALIDATION_ERRORS.PAYLOAD_REQUIRED },
        { status: 400 }
      );
    }

    // Get author from session, not request body
    const admin = ADMIN_PERSONAS.find((p) => p.slug === session.slug);
    const author = admin?.shortLabel ?? admin?.name ?? session.slug;

    // Get current state to increment version
    const { data: currentState } = await supabase
      .from("pitch_deck_state")
      .select("id, version")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    const newVersion = currentState ? currentState.version + 1 : 1;

    // Update pitch_deck_state
    const { error: updateError } = await supabase
      .from("pitch_deck_state")
      .update({
        payload,
        version: newVersion,
        updated_by: author,
        updated_at: new Date().toISOString(),
      })
      .eq("id", currentState?.id);

    if (updateError) {
      console.error("Error updating pitch deck state:", updateError);
      return NextResponse.json(
        { error: DATABASE_ERRORS.PITCH_DECK_SAVE_FAILED },
        { status: 500 }
      );
    }

    // Insert into update history
    const { error: historyError } = await supabase
      .from("pitch_deck_update_history")
      .insert({
        author,
        payload,
        notes: notes || "",
      });

    if (historyError) {
      console.error("Error inserting pitch deck update history:", historyError);
      // Don't fail the request if history insert fails
    }

    return NextResponse.json({
      ok: true,
      version: newVersion,
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { error: DATABASE_ERRORS.GENERIC },
      { status: 500 }
    );
  }
}
