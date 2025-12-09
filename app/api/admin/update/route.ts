import { NextResponse } from "next/server";
import { AUTH_ERRORS, DATABASE_ERRORS, VALIDATION_ERRORS } from "../../../../lib/errorMessages";
import { getServiceSupabaseClient } from "../../../../lib/supabaseClient";
import { ADMIN_PERSONAS, ADMIN_SLUGS } from "../../../../lib/adminUsers";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { adminSlug, payload, notes } = body ?? {};

    if (!adminSlug || !ADMIN_SLUGS.includes(adminSlug)) {
      return NextResponse.json(
        { error: AUTH_ERRORS.ADMIN_ACCESS_REQUIRED },
        { status: 401 }
      );
    }

    if (!payload) {
      return NextResponse.json(
        { error: VALIDATION_ERRORS.PAYLOAD_REQUIRED },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabaseClient();
    const { data: currentState, error: fetchError } = await supabase
      .from("site_state")
      .select("*")
      .limit(1)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    const admin = ADMIN_PERSONAS.find(
      (person) => person.slug === adminSlug
    );
    const author = admin?.shortLabel ?? admin?.name ?? "Admin";
    const nextVersion = (currentState?.version ?? 0) + 1;

    const historyInsert = supabase.from("update_history").insert({
      author,
      payload,
      notes: notes ?? null,
    });

    const siteStateUpdate = supabase
      .from("site_state")
      .update({
        payload,
        version: nextVersion,
        updated_by: author,
        updated_at: new Date().toISOString(),
      })
      .eq("id", currentState?.id);

    const [{ error: historyError }, { error: updateError }] =
      await Promise.all([historyInsert, siteStateUpdate]);

    if (historyError) {
      throw historyError;
    }
    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      ok: true,
      version: nextVersion,
    });
  } catch (error) {
    console.error("Admin update failed", error);
    return NextResponse.json(
      { error: DATABASE_ERRORS.QUESTIONNAIRE_UPDATE_FAILED },
      { status: 500 }
    );
  }
}
