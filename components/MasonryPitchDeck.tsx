"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatPitchDeckText } from "@/lib/formatPitchDeckText";
import {
  PitchDeckSlide,
  SlideSize,
  sortSlides,
} from "@/lib/pitchDeck";

type MasonryPitchDeckProps = {
  slides: PitchDeckSlide[];
  editMode?: boolean;
  uploadingFiles?: Record<string, boolean>;
  onUpdateSlide?: (
    slideId: string,
    updates: Partial<PitchDeckSlide>
  ) => void;
  onDeleteSlide?: (slideId: string) => void;
  onMoveSlide?: (slideId: string, direction: "up" | "down") => void;
  onUploadAsset?: (
    slideId: string,
    file: File,
    fileType: "pdf" | "video"
  ) => void;
};

const sizeLabels: Record<SlideSize, string> = {
  small: "Small (1x1)",
  medium: "Medium (2x2)",
  large: "Large (2x3)",
  wide: "Wide (3x2)",
  full: "Full width",
};

const textSizeClasses: Record<
  NonNullable<PitchDeckSlide["textSize"]>,
  string
> = {
  small: "text-sm",
  normal: "text-base",
  large: "text-lg",
  xl: "text-xl",
};

const alignmentClasses: Record<
  NonNullable<PitchDeckSlide["textAlign"]>,
  string
> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(
    () =>
      typeof window !== "undefined"
        ? window.innerWidth < 768
        : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isMobile;
};

const getResponsiveClasses = (
  slide: PitchDeckSlide,
  index: number,
  slides: PitchDeckSlide[],
  isMobile: boolean
) => {
  const baseSize: SlideSize = slide.size || "medium";

  if (isMobile) {
    if (slide.type === "text") {
      return "col-span-2";
    }

    if (baseSize === "small") {
      const nextIsSmall = slides[index + 1]?.size === "small";
      const prevIsSmall = slides[index - 1]?.size === "small";
      return nextIsSmall || prevIsSmall ? "col-span-1" : "col-span-2";
    }

    if (baseSize === "full") {
      return "col-span-2";
    }

    return "col-span-2";
  }

  const desktopSizeMap: Record<SlideSize, string> = {
    small: "col-span-1 row-span-1",
    medium: "col-span-2 row-span-2",
    large: "col-span-2 row-span-3",
    wide: "col-span-3 row-span-2",
    full: "col-span-full row-span-2",
  };

  return desktopSizeMap[baseSize];
};

const getYouTubeEmbed = (url: string | undefined) => {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtube.com")) {
      const videoId = parsed.searchParams.get("v");
      return videoId
        ? `https://www.youtube.com/embed/${videoId}`
        : null;
    }
    if (parsed.hostname === "youtu.be") {
      const id = parsed.pathname.replace("/", "");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
  } catch {
    return null;
  }
  return null;
};

const MasonryPitchDeck = ({
  slides,
  editMode,
  uploadingFiles,
  onUpdateSlide,
  onDeleteSlide,
  onMoveSlide,
  onUploadAsset,
}: MasonryPitchDeckProps) => {
  const orderedSlides = useMemo(
    () => sortSlides(slides || []),
    [slides]
  );
  const isMobile = useIsMobile();

  if (!orderedSlides.length) {
    return (
      <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-8 text-center text-[#a3a3a3]">
        No slides yet. Use the controls above to add your first slide.
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 grid-flow-row-dense auto-rows-auto md:auto-rows-[200px] gap-3 md:gap-4 p-3 md:p-4"
      style={
        isMobile
          ? { gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }
          : undefined
      }
    >
      {orderedSlides.map((slide, index) => {
        const gridClasses = getResponsiveClasses(
          slide,
          index,
          orderedSlides,
          isMobile
        );
        const baseClasses =
          slide.type === "text"
            ? "bg-gradient-to-br from-white/10 to-white/0 border border-white/10"
            : "bg-white/5 border border-white/20";

        return (
          <div
            key={slide.id}
            className={`${gridClasses} relative flex`}
          >
            <div
              className={`group relative flex h-full w-full flex-col overflow-hidden rounded-2xl backdrop-blur-xl shadow-2xl transition-all hover:-translate-y-0.5 hover:border-[#cb6b1e]/40 ${baseClasses}`}
            >
              <SlideActions
                slideId={slide.id}
                editMode={Boolean(editMode)}
                onDeleteSlide={onDeleteSlide}
                onMoveSlide={onMoveSlide}
              />

              {slide.type === "text" ? (
                <TextBox
                  slide={slide}
                  editMode={Boolean(editMode)}
                  onUpdateSlide={onUpdateSlide}
                />
              ) : (
                <ContentBox
                  slide={slide}
                  editMode={Boolean(editMode)}
                  uploading={Boolean(
                    uploadingFiles?.[slide.id]
                  )}
                  onUpdateSlide={onUpdateSlide}
                  onUploadAsset={onUploadAsset}
                />
              )}

              {editMode && (
                <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2 rounded-xl border border-white/15 bg-[#0a0a0a]/70 px-3 py-2 text-xs text-[#a3a3a3] shadow-lg">
                  <label
                    htmlFor={`slide-size-${slide.id}`}
                    className="uppercase tracking-[0.2em]"
                  >
                    Size
                  </label>
                  <select
                    id={`slide-size-${slide.id}`}
                    value={slide.size || "medium"}
                    onChange={(e) =>
                      onUpdateSlide?.(slide.id, {
                        size: e.target.value as SlideSize,
                      })
                    }
                    className="rounded-lg bg-white/5 px-2 py-1 text-[#f6e1bd] focus:outline-none focus:ring-1 focus:ring-[#cb6b1e]"
                  >
                    {Object.entries(sizeLabels).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      )
                    )}
                  </select>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

type SlideActionProps = {
  slideId: string;
  editMode: boolean;
  onDeleteSlide?: (slideId: string) => void;
  onMoveSlide?: (slideId: string, direction: "up" | "down") => void;
};

const SlideActions = ({
  slideId,
  editMode,
  onDeleteSlide,
  onMoveSlide,
}: SlideActionProps) => {
  if (!editMode) return null;

  return (
    <div className="pointer-events-none absolute top-3 right-3 z-30 flex gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
      <button
        type="button"
        onClick={() => onMoveSlide?.(slideId, "up")}
        className="pointer-events-auto rounded-lg border border-white/20 bg-black/40 px-2 py-1 text-xs text-[#f6e1bd] hover:border-[#cb6b1e]"
        aria-label="Move slide up"
      >
        ↑
      </button>
      <button
        type="button"
        onClick={() => onMoveSlide?.(slideId, "down")}
        className="pointer-events-auto rounded-lg border border-white/20 bg-black/40 px-2 py-1 text-xs text-[#f6e1bd] hover:border-[#cb6b1e]"
        aria-label="Move slide down"
      >
        ↓
      </button>
      <button
        type="button"
        onClick={() => onDeleteSlide?.(slideId)}
        className="pointer-events-auto rounded-lg border border-white/20 bg-black/40 px-2 py-1 text-xs text-red-300 hover:border-red-400"
      >
        ✕
      </button>
    </div>
  );
};

type TextBoxProps = {
  slide: PitchDeckSlide;
  editMode: boolean;
  onUpdateSlide?: (
    slideId: string,
    updates: Partial<PitchDeckSlide>
  ) => void;
};

const TextBox = ({
  slide,
  editMode,
  onUpdateSlide,
}: TextBoxProps) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const textSizeClass =
    textSizeClasses[slide.textSize || "normal"];
  const alignmentClass =
    alignmentClasses[slide.textAlign || "left"];

  useEffect(() => {
    if (!textareaRef.current) return;
    const el = textareaRef.current;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [slide.textContent]);

  const wrapSelection = (wrapper: string) => {
    if (!textareaRef.current || !onUpdateSlide) return;
    const textarea = textareaRef.current;
    const { selectionStart, selectionEnd, value } = textarea;
    const selected = value.slice(selectionStart, selectionEnd);
    const replacement = `${wrapper}${selected || "text"}${wrapper}`;

    const newValue =
      value.slice(0, selectionStart) +
      replacement +
      value.slice(selectionEnd);

    onUpdateSlide(slide.id, { textContent: newValue });
    requestAnimationFrame(() => {
      const nextStart =
        selectionStart + wrapper.length;
      const nextEnd =
        selectionStart +
        wrapper.length +
        (selected ? selected.length : 4);
      textarea.selectionStart = nextStart;
      textarea.selectionEnd = nextEnd;
      textarea.focus();
    });
  };

  const handleTextChange = (value: string) => {
    onUpdateSlide?.(slide.id, { textContent: value });
  };

  const handleSizeChange = (
    value: NonNullable<PitchDeckSlide["textSize"]>
  ) => {
    onUpdateSlide?.(slide.id, { textSize: value });
  };

  const handleColorChange = (value: string) => {
    onUpdateSlide?.(slide.id, { textColor: value });
    setShowColorPicker(false);
  };

  const handleAlignChange = (
    value: NonNullable<PitchDeckSlide["textAlign"]>
  ) => {
    onUpdateSlide?.(slide.id, { textAlign: value });
  };

  const handleClearFormatting = () => {
    onUpdateSlide?.(slide.id, {
      textAlign: undefined,
      textColor: undefined,
      textSize: undefined,
    });
  };

  if (!editMode) {
    return (
      <div className="h-full w-full p-6">
        <div
          className={`${textSizeClass} ${alignmentClass} text-[#f6e1bd] leading-relaxed`}
          style={{ color: slide.textColor || "#f6e1bd" }}
          dangerouslySetInnerHTML={{
            __html: formatPitchDeckText(slide.textContent || ""),
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-4">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-2 text-sm text-[#f6e1bd]">
        <button
          type="button"
          onClick={() => wrapSelection("**")}
          className="rounded px-2 py-1 font-semibold hover:bg-white/10"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => wrapSelection("*")}
          className="rounded px-2 py-1 italic hover:bg-white/10"
        >
          I
        </button>
        <select
          value={slide.textSize || "normal"}
          onChange={(e) =>
            handleSizeChange(
              e.target.value as NonNullable<
                PitchDeckSlide["textSize"]
              >
            )
          }
          className="rounded bg-white/10 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#cb6b1e]"
        >
          <option value="small">Small</option>
          <option value="normal">Normal</option>
          <option value="large">Large</option>
          <option value="xl">XL</option>
        </select>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowColorPicker((prev) => !prev)}
            className="rounded px-2 py-1 hover:bg-white/10"
          >
            Color
          </button>
          {showColorPicker && (
            <div className="absolute right-0 top-full z-40 mt-2 w-48 rounded-xl border border-white/20 bg-[#1a1a1a] p-3 shadow-xl">
              <p className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                Brand Colors
              </p>
              <div className="mt-2 flex gap-2">
                {["#cb6b1e", "#f6e1bd", "#ffffff"].map(
                  (color) => (
                    <button
                      key={color}
                      type="button"
                      className="h-8 w-8 rounded-full border border-white/20"
                      style={{ backgroundColor: color }}
                      onClick={() => handleColorChange(color)}
                    />
                  )
                )}
              </div>
              <p className="mt-3 text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                Custom
              </p>
              <input
                type="color"
                value={slide.textColor || "#f6e1bd"}
                onChange={(e) =>
                  handleColorChange(e.target.value)
                }
                className="mt-2 w-full cursor-pointer rounded border border-white/20 bg-transparent"
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {(["left", "center", "right"] as const).map(
            (value) => (
              <button
                key={value}
                type="button"
                onClick={() => handleAlignChange(value)}
                className={`rounded px-2 py-1 text-xs uppercase tracking-[0.2em] ${
                  slide.textAlign === value
                    ? "bg-white/20 text-white"
                    : "hover:bg-white/10"
                }`}
              >
                {value[0].toUpperCase()}
              </button>
            )
          )}
        </div>
        <button
          type="button"
          onClick={handleClearFormatting}
          className="ml-auto rounded px-2 py-1 text-xs uppercase tracking-[0.2em] text-[#a3a3a3] hover:bg-white/10"
        >
          Clear
        </button>
      </div>
      <textarea
        ref={textareaRef}
        value={slide.textContent || ""}
        onChange={(e) => handleTextChange(e.target.value)}
        className={`mt-3 flex-1 resize-none rounded-2xl border-2 border-dashed border-[#cb6b1e]/40 bg-black/20 px-4 py-3 font-mono text-sm text-[#f6e1bd] focus:outline-none focus:border-[#cb6b1e] ${textSizeClass} ${alignmentClass}`}
        placeholder="Write your narrative... (# headers, **bold**, *italic*, markdown supported)"
      />
    </div>
  );
};

type ContentBoxProps = {
  slide: PitchDeckSlide;
  editMode: boolean;
  uploading: boolean;
  onUpdateSlide?: (
    slideId: string,
    updates: Partial<PitchDeckSlide>
  ) => void;
  onUploadAsset?: (
    slideId: string,
    file: File,
    fileType: "pdf" | "video"
  ) => void;
};

const ContentBox = ({
  slide,
  editMode,
  uploading,
  onUpdateSlide,
  onUploadAsset,
}: ContentBoxProps) => {
  if (slide.type === "pdf") {
    if (editMode) {
      return (
        <div className="flex h-full flex-col gap-3 p-4 text-[#f6e1bd]">
          <input
            type="text"
            value={slide.pdfUrl || ""}
            onChange={(e) =>
              onUpdateSlide?.(slide.id, { pdfUrl: e.target.value })
            }
            placeholder="PDF URL or embed link"
            className="rounded-xl border border-white/20 bg-black/30 px-3 py-2 text-sm focus:outline-none focus:border-[#cb6b1e]"
          />
          <input
            type="text"
            value={slide.pdfFileName || ""}
            onChange={(e) =>
              onUpdateSlide?.(slide.id, { pdfFileName: e.target.value })
            }
            placeholder="Display name"
            className="rounded-xl border border-white/20 bg-black/30 px-3 py-2 text-sm focus:outline-none focus:border-[#cb6b1e]"
          />
          {onUploadAsset && (
            <label className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-[#cb6b1e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#e37a2e]">
              {uploading ? "Uploading..." : "Upload PDF"}
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                disabled={uploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    onUploadAsset(slide.id, file, "pdf");
                  }
                }}
              />
            </label>
          )}
        </div>
      );
    }

    if (!slide.pdfUrl) {
      return (
        <div className="flex h-full items-center justify-center p-6 text-[#a3a3a3]">
          PDF slide coming soon.
        </div>
      );
    }

    return (
      <div className="h-full w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-2xl">
        <iframe
          src={slide.pdfUrl}
          className="h-full w-full"
          title={slide.pdfFileName || "PDF slide"}
          style={{ border: "none", background: "transparent" }}
        />
      </div>
    );
  }

  if (slide.type === "video") {
    if (editMode) {
      return (
        <div className="flex h-full flex-col gap-3 p-4 text-[#f6e1bd]">
          <input
            type="text"
            value={slide.videoUrl || ""}
            onChange={(e) =>
              onUpdateSlide?.(slide.id, { videoUrl: e.target.value })
            }
            placeholder="Video URL (auto-filled after upload)"
            className="rounded-xl border border-white/20 bg-black/30 px-3 py-2 text-sm focus:outline-none focus:border-[#cb6b1e]"
            readOnly={!slide.videoSource || slide.videoSource === "upload"}
          />
          {onUploadAsset && (
            <label className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-[#cb6b1e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#e37a2e]">
              {uploading ? "Uploading..." : "Upload Video"}
              <input
                type="file"
                accept="video/*"
                className="hidden"
                disabled={uploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    onUploadAsset(slide.id, file, "video");
                  }
                }}
              />
            </label>
          )}
        </div>
      );
    }

    if (!slide.videoUrl) {
      return (
        <div className="flex h-full items-center justify-center p-6 text-[#a3a3a3]">
          Video slide coming soon.
        </div>
      );
    }

    if (slide.videoSource === "youtube") {
      const embedUrl = getYouTubeEmbed(slide.videoUrl);
      if (!embedUrl) {
        return (
          <div className="flex h-full items-center justify-center p-6 text-[#a3a3a3]">
            Unable to load video.
          </div>
        );
      }

      return (
        <div className="h-full w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-2xl">
          <iframe
            src={embedUrl}
            className="h-full w-full"
            title="Pitch deck video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }

    return (
      <div className="h-full w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-2xl">
        <video
          src={slide.videoUrl}
          controls
          loop={slide.videoAutoplay}
          autoPlay={slide.videoAutoplay}
          muted={slide.videoAutoplay}
          className="h-full w-full object-cover"
          style={{ boxShadow: "inset 0 2px 4px rgba(0,0,0,0.3)" }}
        />
      </div>
    );
  }

  return null;
};

export default MasonryPitchDeck;
