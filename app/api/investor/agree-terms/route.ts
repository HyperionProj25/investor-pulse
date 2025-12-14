import { NextResponse } from "next/server";
import { AUTH_ERRORS } from "../../../../lib/errorMessages";
import { getServiceSupabaseClient } from "../../../../lib/supabaseClient";
import { SESSION_COOKIE, verifySessionToken } from "../../../../lib/session";
import { cookies } from "next/headers";

export async function POST() {
  try {
    // Verify investor session
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE)?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { error: AUTH_ERRORS.NOT_AUTHENTICATED },
        { status: 401 }
      );
    }

    const session = verifySessionToken(sessionCookie);

    if (!session || session.role !== "investor") {
      return NextResponse.json(
        { error: AUTH_ERRORS.NOT_AUTHENTICATED },
        { status: 403 }
      );
    }

    const investorSlug = session.slug;

    // Record agreement in database
    const supabase = getServiceSupabaseClient();

    // Check if already agreed
    const { data: existingAgreement } = await supabase
      .from("investor_agreements")
      .select("*")
      .eq("investor_slug", investorSlug)
      .single();

    if (existingAgreement) {
      // Already agreed, just return success
      return NextResponse.json({
        success: true,
        alreadyAgreed: true,
        agreedAt: existingAgreement.agreed_at,
      });
    }

    // Insert new agreement
    const { error } = await supabase
      .from("investor_agreements")
      .insert({
        investor_slug: investorSlug,
        agreed_at: new Date().toISOString(),
      });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      alreadyAgreed: false,
      message: "Agreement recorded successfully",
    });
  } catch (error) {
    console.error("Failed to record agreement:", error);
    return NextResponse.json(
      { error: "Failed to record agreement" },
      { status: 500 }
    );
  }
}

// GET endpoint to check if investor has agreed
export async function GET() {
  try {
    // Verify investor session
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE)?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { error: AUTH_ERRORS.NOT_AUTHENTICATED },
        { status: 401 }
      );
    }

    const session = verifySessionToken(sessionCookie);

    if (!session || session.role !== "investor") {
      return NextResponse.json(
        { error: AUTH_ERRORS.NOT_AUTHENTICATED },
        { status: 403 }
      );
    }

    const investorSlug = session.slug;

    // Check if agreement exists
    const supabase = getServiceSupabaseClient();
    const { data: agreement, error } = await supabase
      .from("investor_agreements")
      .select("*")
      .eq("investor_slug", investorSlug)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 is "no rows returned", which is fine
      throw error;
    }

    return NextResponse.json({
      hasAgreed: !!agreement,
      agreedAt: agreement?.agreed_at || null,
    });
  } catch (error) {
    console.error("Failed to check agreement:", error);
    return NextResponse.json(
      { error: "Failed to check agreement" },
      { status: 500 }
    );
  }
}
