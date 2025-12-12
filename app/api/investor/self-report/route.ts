import { NextResponse } from "next/server";
import { AUTH_ERRORS, DATABASE_ERRORS } from "../../../../lib/errorMessages";
import { getServiceSupabaseClient } from "../../../../lib/supabaseClient";
import { SESSION_COOKIE, verifySessionToken } from "../../../../lib/session";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    // Verify session authentication
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

    // Only investors can self-report
    if (session.role !== "investor") {
      return NextResponse.json(
        { error: "Only investors can self-report" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { investorSlug } = body ?? {};

    // Verify the session belongs to this investor
    if (session.slug !== investorSlug) {
      return NextResponse.json(
        { error: "Cannot report for another investor" },
        { status: 403 }
      );
    }

    // Get current site state
    const supabase = getServiceSupabaseClient();
    const { data: currentState, error: fetchError } = await supabase
      .from("site_state")
      .select("*")
      .limit(1)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    // Update the investor's count
    const payload = currentState.payload;
    const investors = payload.investors || [];
    const updatedInvestors = investors.map((inv: any) => {
      if (inv.slug === investorSlug) {
        return {
          ...inv,
          dickheadCount: (inv.dickheadCount || 0) + 1,
        };
      }
      return inv;
    });

    const updatedPayload = {
      ...payload,
      investors: updatedInvestors,
    };

    const nextVersion = (currentState?.version ?? 0) + 1;

    // Update site_state
    const { error: updateError } = await supabase
      .from("site_state")
      .update({
        payload: updatedPayload,
        version: nextVersion,
        updated_by: `Self-report: ${investorSlug}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", currentState?.id);

    if (updateError) {
      throw updateError;
    }

    // Find updated count
    const updatedInvestor = updatedInvestors.find((inv: any) => inv.slug === investorSlug);

    return NextResponse.json({
      ok: true,
      newCount: updatedInvestor?.dickheadCount || 0,
    });
  } catch (error) {
    console.error("Self-report failed", error);
    return NextResponse.json(
      { error: DATABASE_ERRORS.QUESTIONNAIRE_UPDATE_FAILED },
      { status: 500 }
    );
  }
}
