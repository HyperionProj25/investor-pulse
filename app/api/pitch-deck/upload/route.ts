import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { FILE_UPLOAD_ERRORS, VALIDATION_ERRORS, AUTH_ERRORS } from "@/lib/errorMessages";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { ADMIN_SLUGS } from "@/lib/adminUsers";
import { cookies } from "next/headers";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { Canvas, createCanvas } from "canvas";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(VALIDATION_ERRORS.SUPABASE_SERVICE_CONFIG_MISSING);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const BUCKET_NAME = "pitch-deck-files";
const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
]);
const ALLOWED_EXTENSIONS = new Set(["pdf", "mp4", "webm", "mov", "avi"]);

const ensureBucketExists = async () => {
  const { data, error } = await supabase.storage.getBucket(BUCKET_NAME);
  if (data) {
    return;
  }
  if (error && !/not found/i.test(error.message ?? "")) {
    throw error;
  }
  const { error: createError } = await supabase.storage.createBucket(
    BUCKET_NAME,
    {
      public: true,
      fileSizeLimit: MAX_SIZE_BYTES,
      allowedMimeTypes: Array.from(ALLOWED_MIME_TYPES),
    }
  );
  if (
    createError &&
    !/already exists/i.test(createError.message ?? "creation failed")
  ) {
    throw createError;
  }
};

const isAllowedType = (file: File) => {
  const mime = (file.type || "").toLowerCase();
  if (mime && ALLOWED_MIME_TYPES.has(mime)) {
    return true;
  }
  const extension = file.name.split(".").pop()?.toLowerCase();
  return extension ? ALLOWED_EXTENSIONS.has(extension) : false;
};

// Helper function to extract slides from PDF
const extractPDFSlides = async (pdfBuffer: Buffer) => {
  try {
    // Load PDF document
    const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer });
    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;
    const slides: Buffer[] = [];

    // Extract each page as an image
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2.0 }); // 2x scale for better quality

      // Create canvas
      const canvas = createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext("2d");

      // Render PDF page to canvas
      await page.render({
        canvasContext: context as any,
        viewport: viewport,
        canvas: canvas as any,
      }).promise;

      // Convert canvas to PNG buffer
      const imageBuffer = canvas.toBuffer("image/png");
      slides.push(imageBuffer);
    }

    return slides;
  } catch (error) {
    console.error("PDF extraction failed:", error);
    throw new Error("Failed to extract slides from PDF");
  }
};

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

    if (!session) {
      return NextResponse.json(
        { error: AUTH_ERRORS.SESSION_INVALID },
        { status: 401 }
      );
    }

    // Only admins can upload files
    if (session.role !== "admin" || !ADMIN_SLUGS.includes(session.slug)) {
      return NextResponse.json(
        { error: AUTH_ERRORS.ADMIN_ACCESS_REQUIRED },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: FILE_UPLOAD_ERRORS.FIELD_MISSING },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: FILE_UPLOAD_ERRORS.EMPTY_FILE },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: FILE_UPLOAD_ERRORS.TOO_LARGE },
        { status: 400 }
      );
    }

    if (!isAllowedType(file)) {
      return NextResponse.json(
        {
          error: FILE_UPLOAD_ERRORS.TYPE_UNSUPPORTED,
        },
        { status: 400 }
      );
    }

    await ensureBucketExists();

    const sanitizedBaseName = file.name
      .replace(/[^a-z0-9.\-_]/gi, "_")
      .toLowerCase();
    const objectName = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}-${sanitizedBaseName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(objectName, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase storage upload failed:", uploadError);
      return NextResponse.json(
        { error: FILE_UPLOAD_ERRORS.UPLOAD_FAILED },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(objectName);

    if (!publicUrlData?.publicUrl) {
      console.error("Public URL generation failed: No URL returned");
      return NextResponse.json(
        { error: FILE_UPLOAD_ERRORS.PUBLIC_URL_FAILED },
        { status: 500 }
      );
    }

    // If it's a PDF, extract slides and store them
    const isPDF = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    let slidesExtracted = 0;

    if (isPDF) {
      try {
        // Extract slides from PDF
        const slides = await extractPDFSlides(buffer);

        // Delete existing slides
        await supabase.from("pitch_deck_slides").delete().neq("id", "00000000-0000-0000-0000-000000000000");

        // Upload each slide and save metadata
        for (let i = 0; i < slides.length; i++) {
          const slideBuffer = slides[i];
          const slideObjectName = `slides/slide-${i + 1}-${Date.now()}.png`;

          // Upload slide image
          const { error: slideUploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(slideObjectName, slideBuffer, {
              contentType: "image/png",
              upsert: false,
            });

          if (slideUploadError) {
            console.error(`Failed to upload slide ${i + 1}:`, slideUploadError);
            continue;
          }

          // Get public URL for slide
          const { data: slideUrlData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(slideObjectName);

          if (!slideUrlData?.publicUrl) {
            console.error(`Failed to get public URL for slide ${i + 1}`);
            continue;
          }

          // Save slide metadata to database
          const { error: dbError } = await supabase
            .from("pitch_deck_slides")
            .insert({
              slide_number: i + 1,
              display_order: i + 1,
              image_url: slideUrlData.publicUrl,
              storage_path: slideObjectName,
              is_active: true,
            });

          if (dbError) {
            console.error(`Failed to save slide ${i + 1} metadata:`, dbError);
          } else {
            slidesExtracted++;
          }
        }
      } catch (extractError) {
        console.error("Slide extraction failed:", extractError);
        // Don't fail the whole upload, just log the error
      }
    }

    return NextResponse.json({
      fileName: objectName,
      originalName: file.name,
      url: publicUrlData.publicUrl,
      contentType: file.type,
      size: file.size,
      isPDF,
      slidesExtracted,
    });
  } catch (error) {
    console.error("Pitch deck file upload error:", error);
    return NextResponse.json(
      { error: FILE_UPLOAD_ERRORS.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}
