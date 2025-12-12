import { NextResponse } from "next/server";
import { AUTH_ERRORS } from "../../../../lib/errorMessages";
import { getServiceSupabaseClient } from "../../../../lib/supabaseClient";
import { ADMIN_SLUGS } from "../../../../lib/adminUsers";
import { SESSION_COOKIE, verifySessionToken } from "../../../../lib/session";
import { cookies } from "next/headers";

export async function GET() {
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

    // Fetch session stats for all investors
    const supabase = getServiceSupabaseClient();
    const { data: sessions, error } = await supabase
      .from("investor_sessions")
      .select("investor_slug, login_timestamp")
      .order("login_timestamp", { ascending: false });

    if (error) {
      throw error;
    }

    // Aggregate stats per investor
    const stats: Record<string, { lastLogin: string | null; totalVisits: number }> = {};

    sessions?.forEach((session) => {
      const slug = session.investor_slug;
      if (!stats[slug]) {
        stats[slug] = {
          lastLogin: session.login_timestamp,
          totalVisits: 0,
        };
      }
      stats[slug].totalVisits += 1;
    });

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Failed to fetch session stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch session stats" },
      { status: 500 }
    );
  }
}
