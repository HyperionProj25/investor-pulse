import { NextResponse } from "next/server";
import { getServiceSupabaseClient } from "../../../lib/supabaseClient";

export async function GET() {
  try {
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
      { error: "Unable to load site state" },
      { status: 500 }
    );
  }
}
