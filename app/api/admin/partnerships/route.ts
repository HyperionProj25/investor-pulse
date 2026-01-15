import { NextResponse } from "next/server";
import { AUTH_ERRORS, DATABASE_ERRORS } from "../../../../lib/errorMessages";
import { getServiceSupabaseClient, getBrowserSupabaseClient } from "../../../../lib/supabaseClient";
import { ADMIN_SLUGS } from "../../../../lib/adminUsers";
import { SESSION_COOKIE, verifySessionToken } from "../../../../lib/session";
import { cookies } from "next/headers";
import type { Partner, PartnerConnection, PartnerNodePosition } from "../../../../lib/partnerships";

// GET - Fetch all partners with optional connections and positions
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeConnections = searchParams.get("connections") === "true";
    const includePositions = searchParams.get("positions") === "true";
    const type = searchParams.get("type");
    const status = searchParams.get("status");

    const supabase = getBrowserSupabaseClient();

    // Build query
    let query = supabase.from("partners").select("*");

    // Apply filters
    if (type && type !== "all") {
      query = query.eq("type", type);
    }
    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    // Order by created_at desc by default
    query = query.order("created_at", { ascending: false });

    const { data: partners, error: partnersError } = await query;

    if (partnersError) {
      throw partnersError;
    }

    let connections: PartnerConnection[] = [];
    let positions: PartnerNodePosition[] = [];

    if (includeConnections) {
      const { data: connData, error: connError } = await supabase
        .from("partner_connections")
        .select("*");

      if (connError) throw connError;
      connections = connData || [];
    }

    if (includePositions) {
      const { data: posData, error: posError } = await supabase
        .from("partner_node_positions")
        .select("*");

      if (posError) throw posError;
      positions = posData || [];
    }

    return NextResponse.json({
      ok: true,
      partners,
      connections: includeConnections ? connections : undefined,
      positions: includePositions ? positions : undefined,
    });
  } catch (error) {
    console.error("Failed to fetch partners", error);
    return NextResponse.json(
      { error: DATABASE_ERRORS.PARTNERSHIPS_FETCH_FAILED },
      { status: 500 }
    );
  }
}

// POST - Create a new partner
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
    const { partner, nodePosition } = body;

    if (!partner || !partner.name) {
      return NextResponse.json(
        { error: "Partner name is required" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabaseClient();

    // Insert partner
    const { data: newPartner, error: insertError } = await supabase
      .from("partners")
      .insert({
        name: partner.name,
        type: partner.type || "ecosystem",
        location_city: partner.location_city || null,
        location_state: partner.location_state || null,
        location_country: partner.location_country || "USA",
        latitude: partner.latitude || null,
        longitude: partner.longitude || null,
        ecosystem_impact: partner.ecosystem_impact || 5,
        population_reach: partner.population_reach || null,
        company_size: partner.company_size || null,
        client_potential: partner.client_potential || null,
        status: partner.status || "target",
        end_game: partner.end_game || null,
        notes: partner.notes || null,
        website: partner.website || null,
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // If node position provided, save it
    if (nodePosition && newPartner) {
      await supabase.from("partner_node_positions").insert({
        partner_id: newPartner.id,
        x_position: nodePosition.x,
        y_position: nodePosition.y,
      });
    }

    return NextResponse.json({
      ok: true,
      partner: newPartner,
    });
  } catch (error) {
    console.error("Failed to create partner", error);
    return NextResponse.json(
      { error: DATABASE_ERRORS.PARTNERSHIPS_SAVE_FAILED },
      { status: 500 }
    );
  }
}

// PUT - Update an existing partner
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
    const { id, partner } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Partner ID is required" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabaseClient();

    const { data: updatedPartner, error: updateError } = await supabase
      .from("partners")
      .update({
        name: partner.name,
        type: partner.type,
        location_city: partner.location_city,
        location_state: partner.location_state,
        location_country: partner.location_country,
        latitude: partner.latitude,
        longitude: partner.longitude,
        ecosystem_impact: partner.ecosystem_impact,
        population_reach: partner.population_reach,
        company_size: partner.company_size,
        client_potential: partner.client_potential,
        status: partner.status,
        end_game: partner.end_game,
        notes: partner.notes,
        website: partner.website,
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      ok: true,
      partner: updatedPartner,
    });
  } catch (error) {
    console.error("Failed to update partner", error);
    return NextResponse.json(
      { error: DATABASE_ERRORS.PARTNERSHIPS_SAVE_FAILED },
      { status: 500 }
    );
  }
}

// DELETE - Delete a partner
export async function DELETE(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Partner ID is required" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabaseClient();

    // Connections and positions will be deleted via cascade
    const { error: deleteError } = await supabase
      .from("partners")
      .delete()
      .eq("id", id);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    console.error("Failed to delete partner", error);
    return NextResponse.json(
      { error: DATABASE_ERRORS.PARTNERSHIPS_SAVE_FAILED },
      { status: 500 }
    );
  }
}
