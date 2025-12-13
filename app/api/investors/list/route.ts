import { NextResponse } from "next/server";
import { DATABASE_ERRORS } from "../../../../lib/errorMessages";
import { getServiceSupabaseClient } from "../../../../lib/supabaseClient";

/**
 * Public endpoint to fetch the investor list for the login dropdown.
 * This endpoint does NOT require authentication since users need to see
 * the investor list before they can authenticate.
 *
 * Only returns minimal, non-sensitive investor data:
 * - slug (for login)
 * - name (for display)
 * - firm (for display)
 * - title (for display)
 *
 * Does NOT return sensitive fields like:
 * - pin
 * - keyQuestions
 * - welcomeNote
 * - personalized content
 */
export async function GET() {
  try {
    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase
      .from("site_state")
      .select("payload")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      throw error;
    }

    // Extract only the investor list with minimal fields
    const investors = data?.payload?.investors || [];

    // Filter to only include public fields (exclude PINs and personalized content)
    const publicInvestors = investors.map((investor: any) => ({
      slug: investor.slug,
      name: investor.name,
      firm: investor.firm,
      title: investor.title,
    }));

    return NextResponse.json({
      investors: publicInvestors,
    });
  } catch (error) {
    console.error("Investor list fetch failed", error);
    return NextResponse.json(
      { error: DATABASE_ERRORS.SITE_STATE_FETCH },
      { status: 500 }
    );
  }
}
