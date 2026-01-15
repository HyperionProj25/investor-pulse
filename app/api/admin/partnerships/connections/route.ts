import { NextResponse } from "next/server";
import { AUTH_ERRORS, DATABASE_ERRORS } from "../../../../../lib/errorMessages";
import { getServiceSupabaseClient, getBrowserSupabaseClient } from "../../../../../lib/supabaseClient";
import { ADMIN_SLUGS } from "../../../../../lib/adminUsers";
import { SESSION_COOKIE, verifySessionToken } from "../../../../../lib/session";
import { cookies } from "next/headers";

// GET - Fetch connections for a specific partner
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const partnerId = searchParams.get("partnerId");

    const supabase = getBrowserSupabaseClient();

    let query = supabase.from("partner_connections").select("*");

    if (partnerId) {
      query = query.or(`from_partner_id.eq.${partnerId},to_partner_id.eq.${partnerId}`);
    }

    const { data: connections, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      ok: true,
      connections,
    });
  } catch (error) {
    console.error("Failed to fetch connections", error);
    return NextResponse.json(
      { error: DATABASE_ERRORS.PARTNERSHIPS_FETCH_FAILED },
      { status: 500 }
    );
  }
}

// POST - Create a new connection
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
    const { connection } = body;

    if (!connection.from_partner_id || !connection.to_partner_id) {
      return NextResponse.json(
        { error: "Both from_partner_id and to_partner_id are required" },
        { status: 400 }
      );
    }

    if (connection.from_partner_id === connection.to_partner_id) {
      return NextResponse.json(
        { error: "Cannot connect a partner to itself" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabaseClient();

    const { data: newConnection, error: insertError } = await supabase
      .from("partner_connections")
      .insert({
        from_partner_id: connection.from_partner_id,
        to_partner_id: connection.to_partner_id,
        connection_type: connection.connection_type || "knows",
        strength: connection.strength || 3,
        notes: connection.notes || null,
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      ok: true,
      connection: newConnection,
    });
  } catch (error) {
    console.error("Failed to create connection", error);
    return NextResponse.json(
      { error: DATABASE_ERRORS.PARTNERSHIPS_SAVE_FAILED },
      { status: 500 }
    );
  }
}

// PUT - Update a connection
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
    const { id, connection } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Connection ID is required" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabaseClient();

    const { data: updatedConnection, error: updateError } = await supabase
      .from("partner_connections")
      .update({
        connection_type: connection.connection_type,
        strength: connection.strength,
        notes: connection.notes,
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      ok: true,
      connection: updatedConnection,
    });
  } catch (error) {
    console.error("Failed to update connection", error);
    return NextResponse.json(
      { error: DATABASE_ERRORS.PARTNERSHIPS_SAVE_FAILED },
      { status: 500 }
    );
  }
}

// DELETE - Delete a connection
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
        { error: "Connection ID is required" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabaseClient();

    const { error: deleteError } = await supabase
      .from("partner_connections")
      .delete()
      .eq("id", id);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    console.error("Failed to delete connection", error);
    return NextResponse.json(
      { error: DATABASE_ERRORS.PARTNERSHIPS_SAVE_FAILED },
      { status: 500 }
    );
  }
}
