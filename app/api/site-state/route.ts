import { NextResponse } from "next/server";
import { DATABASE_ERRORS, AUTH_ERRORS } from "../../../lib/errorMessages";
import { getServiceSupabaseClient } from "../../../lib/supabaseClient";
import { SESSION_COOKIE, verifySessionToken } from "../../../lib/session";
import { cookies } from "next/headers";

export async function GET() {
  try {
    // Require authentication - investors, deck viewers, or admins
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

    // Allow investors, deck viewers, and admins
    if (!["investor", "deck", "admin"].includes(session.role)) {
      return NextResponse.json(
        { error: AUTH_ERRORS.NOT_AUTHENTICATED },
        { status: 403 }
      );
    }

    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase
      .from("site_state")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      id: data.id,
      updated_at: data.updated_at,
      version: data.version,
      payload: data.payload,
    });
  } catch (error) {
    console.error("Site state fetch failed", error);
    return NextResponse.json(
      { error: DATABASE_ERRORS.SITE_STATE_FETCH },
      { status: 500 }
    );
  }
}
