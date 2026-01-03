"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import AdminNav from "@/components/AdminNav";
import { ADMIN_PERSONAS, ADMIN_SLUGS } from "@/lib/adminUsers";

// Load PDF processing only on client-side
const loadPdfJs = async () => {
  if (typeof window === "undefined") return null;
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  return pdfjsLib;
};

type Slide = {
  id: string;
  slide_number: number;
  display_order: number;
  image_url: string;
  storage_path: string;
  is_active: boolean;
};

type SlideSize = "small" | "medium" | "large";

const AdminPitchDeckPage = () => {
  const router = useRouter();
  const [authorizedAdmin, setAuthorizedAdmin] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [slides, setSlides] = useState<Slide[]>([]);
  const [slideSize, setSlideSize] = useState<SlideSize>("medium");
  const [draggedSlideId, setDraggedSlideId] = useState<string | null>(null);
  
  const activeSlideCount = useMemo(
    () => slides.filter((slide) => slide.is_active).length,
    [slides]
  );

  const adminLabel = useMemo(() => {
    if (!authorizedAdmin) return null;
    const admin = ADMIN_PERSONAS.find((p) => p.slug === authorizedAdmin);
    return admin?.shortLabel ?? admin?.name ?? authorizedAdmin;
  }, [authorizedAdmin]);

  const fetchSlides = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const response = await fetch("/api/pitch-deck/slides?includeInactive=1");
      if (!response.ok) throw new Error("Failed to fetch slides");
      const data = await response.json();
      setSlides(data.slides || []);
      setSlideSize(data.settings?.slide_size || "medium");
    } catch (err) {
      console.error("Load failed:", err);
      toast.error("Failed to load slides");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const verifySession = async () => {
      try {
        const response = await fetch("/api/auth/session");
        if (!response.ok) {
          router.push("/?mode=admin");
          return;
        }
        const data = await response.json();
        if (data.role === "admin" && ADMIN_SLUGS.includes(data.slug)) {
          setAuthorizedAdmin(data.slug);
        } else {
          router.push("/?mode=admin");
        }
      } catch (err) {
        console.error("Session verification failed:", err);
        router.push("/?mode=admin");
      } finally {
        setSessionChecked(true);
      }
    };
    void verifySession();
  }, [router]);

  useEffect(() => {
    if (authorizedAdmin) void fetchSlides();
  }, [authorizedAdmin, fetchSlides]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPDF =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!isPDF) {
      toast.error("Please upload a PDF file");
      return;
    }

    setUploading(true);
    setUploadProgress({ current: 0, total: 0 });

    try {
      // Load pdfjs-dist (client-side only)
      const pdfjsLib = await loadPdfJs();
      if (!pdfjsLib) {
        toast.error("PDF processing not available");
        return;
      }

      // Helper to convert PDF page to PNG blob
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const renderPageToBlob = async (pdf: any, pageNum: number): Promise<Blob> => {
        const page = await pdf.getPage(pageNum);
        const scale = 2.0;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Failed to get canvas context");

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
          canvasContext: context,
          viewport: viewport,
          canvas: canvas as any,
        }).promise;

        return new Promise((resolve, reject) => {
          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error("Failed to convert canvas to blob"));
            },
            "image/png",
            0.95
          );
        });
      };

      // Load PDF in browser
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;

      setUploadProgress({ current: 0, total: numPages });
      toast.success(`Processing ${numPages} pages...`);

      // Process and upload each page
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        setUploadProgress({ current: pageNum, total: numPages });

        // Render page to blob
        const blob = await renderPageToBlob(pdf, pageNum);

        // Upload slide
        const formData = new FormData();
        formData.append("file", blob, `slide-${pageNum}.png`);
        formData.append("slideNumber", pageNum.toString());
        formData.append("isFirst", pageNum === 1 ? "true" : "false");

        const response = await fetch("/api/pitch-deck/upload-slide", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          console.error(`Failed to upload slide ${pageNum}:`, error);
        }
      }

      toast.success(`Uploaded ${numPages} slides!`);
      await fetchSlides(false);

      // Clear file input
      e.target.value = "";
    } catch (err: any) {
      console.error("Upload failed:", err);
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress({ current: 0, total: 0 });
    }
  };

  const handleDeleteSlide = async (slideId: string) => {
    try {
      const response = await fetch("/api/pitch-deck/slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", slideId }),
      });

      if (!response.ok) throw new Error("Failed to delete slide");

      setSlides((prev) => prev.filter((s) => s.id !== slideId));
      toast.success("Slide deleted");
    } catch (err) {
      console.error("Delete failed:", err);
      toast.error("Failed to delete slide");
    }
  };

  const handleToggleActive = async (slideId: string, nextActive: boolean) => {
    setSlides((prev) =>
      prev.map((slide) =>
        slide.id === slideId ? { ...slide, is_active: nextActive } : slide
      )
    );

    try {
      const response = await fetch("/api/pitch-deck/slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_active", slideId, is_active: nextActive }),
      });

      if (!response.ok) throw new Error("Failed to update slide visibility");

      toast.success(nextActive ? "Slide shown" : "Slide hidden");
    } catch (err) {
      console.error("Visibility update failed:", err);
      setSlides((prev) =>
        prev.map((slide) =>
          slide.id === slideId ? { ...slide, is_active: !nextActive } : slide
        )
      );
      toast.error("Failed to update slide visibility");
    }
  };

  const handleSizeChange = async (size: SlideSize) => {
    try {
      const response = await fetch("/api/pitch-deck/slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_size", size }),
      });

      if (!response.ok) throw new Error("Failed to update size");

      setSlideSize(size);
      toast.success("Slide size updated");
    } catch (err) {
      console.error("Size update failed:", err);
      toast.error("Failed to update size");
    }
  };

  const handleDragStart = (slideId: string) => {
    setDraggedSlideId(slideId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetSlideId: string) => {
    if (!draggedSlideId || draggedSlideId === targetSlideId) {
      setDraggedSlideId(null);
      return;
    }

    const draggedIndex = slides.findIndex((s) => s.id === draggedSlideId);
    const targetIndex = slides.findIndex((s) => s.id === targetSlideId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedSlideId(null);
      return;
    }

    const newSlides = [...slides];
    const [draggedSlide] = newSlides.splice(draggedIndex, 1);
    newSlides.splice(targetIndex, 0, draggedSlide);

    const updatedSlides = newSlides.map((slide, index) => ({
      ...slide,
      display_order: index + 1,
    }));

    setSlides(updatedSlides);
    setDraggedSlideId(null);

    try {
      const response = await fetch("/api/pitch-deck/slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reorder",
          slides: updatedSlides.map((s) => ({
            id: s.id,
            display_order: s.display_order,
          })),
        }),
      });

      if (!response.ok) throw new Error("Failed to reorder slides");

      toast.success("Slides reordered");
    } catch (err) {
      console.error("Reorder failed:", err);
      toast.error("Failed to reorder slides");
      await fetchSlides(false);
    }
  };

  // Bulk actions
  const handleShowAll = async () => {
    const hiddenSlides = slides.filter((s) => !s.is_active);
    for (const slide of hiddenSlides) {
      await handleToggleActive(slide.id, true);
    }
  };

  const handleHideAll = async () => {
    const visibleSlides = slides.filter((s) => s.is_active);
    for (const slide of visibleSlides) {
      await handleToggleActive(slide.id, false);
    }
  };

  if (!sessionChecked || loading) {
    return (
      <div className="min-h-screen bg-[#020202] text-[#f6e1bd] flex items-center justify-center">
        <p className="text-sm text-[#a3a3a3]">Loading...</p>
      </div>
    );
  }

  if (!authorizedAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#020202] text-[#f6e1bd]">
      <AdminNav adminLabel={adminLabel || undefined} />

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Pitch Deck Management</h1>
          <p className="text-sm text-[#a3a3a3]">
            Upload PDFs to extract slides, then show/hide individual slides
          </p>
        </div>

        <div className="space-y-8">
          {/* Upload Section */}
          <div className="rounded-2xl border border-[#1f1f1f] bg-[#0b0b0b] p-6">
            <h2 className="text-lg font-semibold mb-4">Upload Pitch Deck</h2>
            <div className="space-y-4">
              <div>
                <label className="block">
                  <span className="text-xs text-[#a3a3a3] mb-2 block">
                    Upload PDF (Max 50MB)
                  </span>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="block w-full text-sm text-[#f6e1bd] file:mr-4 file:rounded-lg file:border-0 file:bg-[#cb6b1e] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-black hover:file:bg-[#e37a2e] disabled:opacity-50"
                  />
                </label>
              </div>
              {uploading && (
                <div className="space-y-2">
                  <p className="text-sm text-[#cb6b1e]">
                    Processing slide {uploadProgress.current} of{" "}
                    {uploadProgress.total}...
                  </p>
                  <div className="h-2 rounded-full bg-[#1a1a1a] overflow-hidden">
                    <div
                      className="h-full bg-[#cb6b1e] transition-all duration-300"
                      style={{
                        width: `${
                          uploadProgress.total > 0
                            ? (uploadProgress.current / uploadProgress.total) *
                              100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              )}
              <p className="text-xs text-[#737373]">
                PDFs are processed in your browser and split into individual
                slides. Existing slides will be replaced.
              </p>
            </div>
          </div>

          {/* Display Settings & Bulk Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-[#1f1f1f] bg-[#0b0b0b] p-6">
              <h2 className="text-lg font-semibold mb-4">Display Size</h2>
              <div className="flex gap-3">
                {(["small", "medium", "large"] as SlideSize[]).map((size) => (
                  <button
                    key={size}
                    onClick={() => handleSizeChange(size)}
                    className={`rounded-lg px-6 py-2 text-sm font-semibold transition-colors ${
                      slideSize === size
                        ? "bg-[#cb6b1e] text-black"
                        : "bg-[#1a1a1a] text-[#f6e1bd] hover:bg-[#262626]"
                    }`}
                  >
                    {size.charAt(0).toUpperCase() + size.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[#1f1f1f] bg-[#0b0b0b] p-6">
              <h2 className="text-lg font-semibold mb-4">Selection</h2>
              <div className="flex gap-3">
                <button
                  onClick={handleShowAll}
                  disabled={slides.every((s) => s.is_active)}
                  className="rounded-lg bg-[#1a1a1a] px-4 py-2 text-sm text-[#f6e1bd] hover:bg-[#262626] disabled:opacity-50 transition-colors"
                >
                  Select All
                </button>
                <button
                  onClick={handleHideAll}
                  disabled={slides.every((s) => !s.is_active)}
                  className="rounded-lg bg-[#1a1a1a] px-4 py-2 text-sm text-[#f6e1bd] hover:bg-[#262626] disabled:opacity-50 transition-colors"
                >
                  Deselect All
                </button>
              </div>
            </div>
          </div>

          {/* Slides List */}
          <div className="rounded-2xl border border-[#1f1f1f] bg-[#0b0b0b] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                Slides ({activeSlideCount}/{slides.length} selected)
              </h2>
              {slides.length > 0 && (
                <p className="text-xs text-[#737373]">
                  Drag to reorder • Check slides to include in presentation
                </p>
              )}
            </div>

            {slides.length === 0 ? (
              <div className="rounded-xl border border-[#262626] bg-[#050505] p-8 text-center">
                <p className="text-sm text-[#a3a3a3]">
                  No slides uploaded yet. Upload a PDF to get started.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {slides.map((slide) => (
                  <div
                    key={slide.id}
                    draggable
                    onDragStart={() => handleDragStart(slide.id)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(slide.id)}
                    className={`rounded-xl border p-3 cursor-move transition-all ${
                      draggedSlideId === slide.id
                        ? "opacity-50 scale-95 border-[#cb6b1e]"
                        : slide.is_active
                          ? "border-[#262626] bg-[#050505] hover:border-[#cb6b1e]"
                          : "border-red-900/30 bg-red-950/10 opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={slide.is_active}
                          onChange={() =>
                            handleToggleActive(slide.id, !slide.is_active)
                          }
                          className="w-4 h-4 rounded border-[#3a3a3a] bg-[#1a1a1a] text-[#cb6b1e] focus:ring-[#cb6b1e] focus:ring-offset-0 cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-[#cb6b1e]">
                          #{slide.display_order}
                        </span>
                      </label>
                      <button
                        onClick={() => handleDeleteSlide(slide.id)}
                        className="rounded px-2 py-1 text-xs text-[#737373] hover:bg-red-900/30 hover:text-red-400 transition-colors"
                      >
                        ×
                      </button>
                    </div>
                    <div className="aspect-video w-full rounded-lg overflow-hidden bg-[#0a0a0a]">
                      <img
                        src={slide.image_url}
                        alt={`Slide ${slide.display_order}`}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPitchDeckPage;
