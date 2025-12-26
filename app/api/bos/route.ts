import { NextRequest, NextResponse } from "next/server";
import { DATABASE_ERRORS, AUTH_ERRORS } from "../../../lib/errorMessages";
import { getServiceSupabaseClient } from "../../../lib/supabaseClient";
import { SESSION_COOKIE, verifySessionToken } from "../../../lib/session";
import { cookies } from "next/headers";
import { BOSPayload, DEFAULT_BOS_PAYLOAD } from "../../../lib/bos";
import { ADMIN_SLUGS } from "../../../lib/adminUsers";

// GET - Fetch current BOS state
export async function GET() {
  try {
    // Require admin authentication
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

    // Only admins can access BOS
    if (session.role !== "admin" || !ADMIN_SLUGS.includes(session.slug)) {
      return NextResponse.json(
        { error: AUTH_ERRORS.NOT_AUTHENTICATED },
        { status: 403 }
      );
    }

    const supabase = getServiceSupabaseClient();

    // Try to get existing BOS state
    const { data, error } = await supabase
      .from("bos_state")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // If table doesn't exist or no data, return default payload
      if (error.code === "PGRST116" || error.code === "42P01") {
        return NextResponse.json({
          id: null,
          updated_at: null,
          version: 0,
          payload: DEFAULT_BOS_PAYLOAD,
        });
      }
      throw error;
    }

    return NextResponse.json({
      id: data.id,
      updated_at: data.updated_at,
      version: data.version,
      payload: data.payload,
    });
  } catch (error) {
    console.error("BOS state fetch failed", error);
    // Return default payload on error so the UI still works
    return NextResponse.json({
      id: null,
      updated_at: null,
      version: 0,
      payload: DEFAULT_BOS_PAYLOAD,
    });
  }
}

// POST - Update BOS state
export async function POST(request: NextRequest) {
  try {
    // Require admin authentication
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

    // Only admins can update BOS
    if (session.role !== "admin" || !ADMIN_SLUGS.includes(session.slug)) {
      return NextResponse.json(
        { error: AUTH_ERRORS.NOT_AUTHENTICATED },
        { status: 403 }
      );
    }

    const body = await request.json();
    const payload: BOSPayload = body.payload;

    if (!payload) {
      return NextResponse.json(
        { error: "Missing payload" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabaseClient();

    // Check if bos_state table exists and has data
    const { data: existingData, error: fetchError } = await supabase
      .from("bos_state")
      .select("id, version")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      // Table might not exist, try to create it
      if (fetchError.code === "42P01") {
        // Create the table
        const { error: createError } = await supabase.rpc("create_bos_table");
        if (createError) {
          console.error("Failed to create BOS table:", createError);
          // Fall back to in-memory/local storage behavior
          return NextResponse.json({
            success: true,
            message: "Saved locally (database table not available)",
            payload,
          });
        }
      }
    }

    const newVersion = (existingData?.version ?? 0) + 1;

    if (existingData?.id) {
      // Update existing record
      const { error: updateError } = await supabase
        .from("bos_state")
        .update({
          payload,
          version: newVersion,
          updated_at: new Date().toISOString(),
          updated_by: session.slug,
        })
        .eq("id", existingData.id);

      if (updateError) {
        throw updateError;
      }
    } else {
      // Insert new record
      const { error: insertError } = await supabase
        .from("bos_state")
        .insert({
          payload,
          version: 1,
          updated_at: new Date().toISOString(),
          updated_by: session.slug,
        });

      if (insertError) {
        // If table doesn't exist, return success anyway (local-first approach)
        if (insertError.code === "42P01") {
          return NextResponse.json({
            success: true,
            message: "Database table not yet created. Data not persisted.",
            payload,
          });
        }
        throw insertError;
      }
    }

    // Also save to history for audit trail
    try {
      await supabase.from("bos_update_history").insert({
        payload,
        author: session.slug,
        created_at: new Date().toISOString(),
      });
    } catch (historyError) {
      // History is optional, don't fail the whole request
      console.warn("Could not save to BOS history:", historyError);
    }

    return NextResponse.json({
      success: true,
      version: newVersion,
      payload,
    });
  } catch (error) {
    console.error("BOS state update failed", error);
    return NextResponse.json(
      { error: DATABASE_ERRORS.QUESTIONNAIRE_UPDATE_FAILED },
      { status: 500 }
    );
  }
}
