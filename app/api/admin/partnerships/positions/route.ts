import { NextResponse } from "next/server";
import { AUTH_ERRORS, DATABASE_ERRORS } from "../../../../../lib/errorMessages";
import { getServiceSupabaseClient, getBrowserSupabaseClient } from "../../../../../lib/supabaseClient";
import { ADMIN_SLUGS } from "../../../../../lib/adminUsers";
import { SESSION_COOKIE, verifySessionToken } from "../../../../../lib/session";
import { cookies } from "next/headers";

// GET - Fetch all node positions
export async function GET() {
  try {
    const supabase = getBrowserSupabaseClient();

    const { data: positions, error } = await supabase
      .from("partner_node_positions")
      .select("*");

    if (error) {
      throw error;
    }

    return NextResponse.json({
      ok: true,
      positions,
    });
  } catch (error) {
    console.error("Failed to fetch positions", error);
    return NextResponse.json(
      { error: DATABASE_ERRORS.PARTNERSHIPS_FETCH_FAILED },
      { status: 500 }
    );
  }
}

// POST - Create or update node position (upsert)
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

    const body = await request.json();
    const { partnerId, x, y } = body;

    if (!partnerId) {
      return NextResponse.json(
        { error: "Partner ID is required" },
        { status: 400 }
      );
    }

    if (x === undefined || y === undefined) {
      return NextResponse.json(
        { error: "Position coordinates (x, y) are required" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabaseClient();

    // Upsert - insert or update if exists
    const { data: position, error: upsertError } = await supabase
      .from("partner_node_positions")
      .upsert(
        {
          partner_id: partnerId,
          x_position: x,
          y_position: y,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "partner_id",
        }
      )
      .select()
      .single();

    if (upsertError) {
      throw upsertError;
    }

    return NextResponse.json({
      ok: true,
      position,
    });
  } catch (error) {
    console.error("Failed to save position", error);
    return NextResponse.json(
      { error: DATABASE_ERRORS.PARTNERSHIPS_SAVE_FAILED },
      { status: 500 }
    );
  }
}

// PUT - Batch update positions (for saving all node positions at once)
export async function PUT(request: Request) {
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

    const body = await request.json();
    const { positions } = body;

    if (!positions || !Array.isArray(positions)) {
      return NextResponse.json(
        { error: "Positions array is required" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabaseClient();

    // Upsert all positions
    const upsertData = positions.map((pos: { partnerId: string; x: number; y: number }) => ({
      partner_id: pos.partnerId,
      x_position: pos.x,
      y_position: pos.y,
      updated_at: new Date().toISOString(),
    }));

    const { error: upsertError } = await supabase
      .from("partner_node_positions")
      .upsert(upsertData, {
        onConflict: "partner_id",
      });

    if (upsertError) {
      throw upsertError;
    }

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    console.error("Failed to save positions", error);
    return NextResponse.json(
      { error: DATABASE_ERRORS.PARTNERSHIPS_SAVE_FAILED },
      { status: 500 }
    );
  }
}
