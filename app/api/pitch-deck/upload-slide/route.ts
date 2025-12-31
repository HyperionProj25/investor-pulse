import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { AUTH_ERRORS } from "@/lib/errorMessages";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { ADMIN_SLUGS } from "@/lib/adminUsers";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Supabase configuration missing");
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const BUCKET_NAME = "pitch-deck-files";

const ensureBucketExists = async () => {
  const { data, error } = await supabase.storage.getBucket(BUCKET_NAME);
  if (data) return;
  if (error && !/not found/i.test(error.message ?? "")) throw error;

  const { error: createError } = await supabase.storage.createBucket(
    BUCKET_NAME,
    {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024, // 10MB per slide
    }
  );
  if (createError && !/already exists/i.test(createError.message ?? "")) {
    throw createError;
  }
};

// POST - Upload a single slide image
export async function POST(request: NextRequest) {
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

    const formData = await request.formData();
    const file = formData.get("file");
    const slideNumber = formData.get("slideNumber");
    const isFirst = formData.get("isFirst") === "true";

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!slideNumber) {
      return NextResponse.json(
        { error: "Slide number required" },
        { status: 400 }
      );
    }

    await ensureBucketExists();

    // If this is the first slide, delete all existing slides
    if (isFirst) {
      await supabase
        .from("pitch_deck_slides")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
    }

    // Upload to storage
    const slideObjectName = `slides/slide-${slideNumber}-${Date.now()}.png`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(slideObjectName, buffer, {
        contentType: "image/png",
        upsert: false,
      });

    if (uploadError) {
      console.error("Failed to upload slide:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload slide" },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(slideObjectName);

    if (!urlData?.publicUrl) {
      return NextResponse.json(
        { error: "Failed to get slide URL" },
        { status: 500 }
      );
    }

    // Save to database
    const { data: slideData, error: dbError } = await supabase
      .from("pitch_deck_slides")
      .insert({
        slide_number: parseInt(slideNumber as string),
        display_order: parseInt(slideNumber as string),
        image_url: urlData.publicUrl,
        storage_path: slideObjectName,
        is_active: true,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Failed to save slide metadata:", dbError);
      return NextResponse.json(
        { error: "Failed to save slide" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      slide: slideData,
    });
  } catch (error) {
    console.error("Slide upload error:", error);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}
