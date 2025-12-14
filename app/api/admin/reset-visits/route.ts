import { NextResponse } from "next/server";
import { AUTH_ERRORS } from "../../../../lib/errorMessages";
import { getServiceSupabaseClient } from "../../../../lib/supabaseClient";
import { ADMIN_SLUGS } from "../../../../lib/adminUsers";
import { SESSION_COOKIE, verifySessionToken } from "../../../../lib/session";
import { cookies } from "next/headers";

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

    if (!session || session.role !== "admin" || !ADMIN_SLUGS.includes(session.slug)) {
      return NextResponse.json(
        { error: AUTH_ERRORS.ADMIN_ACCESS_REQUIRED },
        { status: 403 }
      );
    }

    // Get investor slug from request body
    const body = await request.json();
    const { investorSlug } = body;

    if (!investorSlug || typeof investorSlug !== "string") {
      return NextResponse.json(
        { error: "Investor slug is required" },
        { status: 400 }
      );
    }

    // Delete all session records for this investor
    const supabase = getServiceSupabaseClient();
    const { error } = await supabase
      .from("investor_sessions")
      .delete()
      .eq("investor_slug", investorSlug);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: `Visit count reset for ${investorSlug}`
    });
  } catch (error) {
    console.error("Failed to reset visit count:", error);
    return NextResponse.json(
      { error: "Failed to reset visit count" },
      { status: 500 }
    );
  }
}
