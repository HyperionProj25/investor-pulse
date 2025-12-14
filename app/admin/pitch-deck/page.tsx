"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import AdminNav from "@/components/AdminNav";
import { ADMIN_PERSONAS, ADMIN_SLUGS } from "@/lib/adminUsers";

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
  const [slides, setSlides] = useState<Slide[]>([]);
  const [slideSize, setSlideSize] = useState<SlideSize>("medium");
  const [draggedSlideId, setDraggedSlideId] = useState<string | null>(null);

  const adminLabel = useMemo(() => {
    if (!authorizedAdmin) return null;
    const admin = ADMIN_PERSONAS.find((p) => p.slug === authorizedAdmin);
    return admin?.shortLabel ?? admin?.name ?? authorizedAdmin;
  }, [authorizedAdmin]);

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
    const loadSlides = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/pitch-deck/slides");
        if (!response.ok) throw new Error("Failed to fetch slides");
        const data = await response.json();
        setSlides(data.slides || []);
        setSlideSize(data.settings?.slide_size || "medium");
      } catch (err) {
        console.error("Load failed:", err);
        toast.error("Failed to load slides");
      } finally {
        setLoading(false);
      }
    };
    if (authorizedAdmin) void loadSlides();
  }, [authorizedAdmin]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const isPDF = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isVideo = ["video/mp4", "video/webm", "video/quicktime"].includes(file.type);

    if (!isPDF && !isVideo) {
      toast.error("Please upload a PDF or video file");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/pitch-deck/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      const data = await response.json();

      if (data.isPDF && data.slidesExtracted > 0) {
        toast.success(`PDF uploaded! Extracted ${data.slidesExtracted} slides`);

        // Reload slides
        const slidesResponse = await fetch("/api/pitch-deck/slides");
        const slidesData = await slidesResponse.json();
        setSlides(slidesData.slides || []);
      } else {
        toast.success("File uploaded successfully!");
      }

      // Clear file input
      e.target.value = "";
    } catch (err: any) {
      console.error("Upload failed:", err);
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
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

    // Reorder slides array
    const newSlides = [...slides];
    const [draggedSlide] = newSlides.splice(draggedIndex, 1);
    newSlides.splice(targetIndex, 0, draggedSlide);

    // Update display_order
    const updatedSlides = newSlides.map((slide, index) => ({
      ...slide,
      display_order: index + 1,
    }));

    setSlides(updatedSlides);
    setDraggedSlideId(null);

    // Save to backend
    try {
      const response = await fetch("/api/pitch-deck/slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reorder",
          slides: updatedSlides.map((s) => ({ id: s.id, display_order: s.display_order })),
        }),
      });

      if (!response.ok) throw new Error("Failed to reorder slides");

      toast.success("Slides reordered");
    } catch (err) {
      console.error("Reorder failed:", err);
      toast.error("Failed to reorder slides");

      // Reload slides to restore original order
      const slidesResponse = await fetch("/api/pitch-deck/slides");
      const slidesData = await slidesResponse.json();
      setSlides(slidesData.slides || []);
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
            Upload PDFs to extract slides or manage existing slides
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
                    Upload PDF or Video (Max 50MB)
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.mp4,.webm,.mov"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="block w-full text-sm text-[#f6e1bd] file:mr-4 file:rounded-lg file:border-0 file:bg-[#cb6b1e] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-black hover:file:bg-[#e37a2e] disabled:opacity-50"
                  />
                </label>
              </div>
              {uploading && (
                <p className="text-sm text-[#cb6b1e]">Uploading and processing...</p>
              )}
              <p className="text-xs text-[#737373]">
                PDFs will be automatically split into individual slide images. Existing slides will be replaced.
              </p>
            </div>
          </div>

          {/* Slide Size Selector */}
          <div className="rounded-2xl border border-[#1f1f1f] bg-[#0b0b0b] p-6">
            <h2 className="text-lg font-semibold mb-4">Display Settings</h2>
            <div>
              <label className="block">
                <span className="text-xs text-[#a3a3a3] mb-2 block">Slide Size</span>
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
              </label>
            </div>
          </div>

          {/* Slides List */}
          <div className="rounded-2xl border border-[#1f1f1f] bg-[#0b0b0b] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                Slides ({slides.length})
              </h2>
              {slides.length > 0 && (
                <p className="text-xs text-[#737373]">
                  Drag to reorder
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {slides.map((slide) => (
                  <div
                    key={slide.id}
                    draggable
                    onDragStart={() => handleDragStart(slide.id)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(slide.id)}
                    className={`rounded-xl border border-[#262626] bg-[#050505] p-4 cursor-move transition-all ${
                      draggedSlideId === slide.id ? "opacity-50 scale-95" : "hover:border-[#cb6b1e]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-[#cb6b1e]">
                        Slide {slide.display_order}
                      </span>
                      <button
                        onClick={() => handleDeleteSlide(slide.id)}
                        className="rounded-md bg-red-900/30 px-2 py-1 text-xs text-red-400 hover:bg-red-900/50 transition-colors"
                      >
                        Delete
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
