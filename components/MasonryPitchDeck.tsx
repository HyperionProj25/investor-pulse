"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
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

const sizeToResponsiveClass: Record<SlideSize, string> = {
  small: "col-span-1 md:col-span-1 lg:col-span-1",
  medium: "col-span-1 md:col-span-2 lg:col-span-2",
  large: "col-span-1 md:col-span-2 lg:col-span-3",
  wide: "col-span-1 md:col-span-3 lg:col-span-3",
  full: "col-span-1 md:col-span-3 lg:col-span-4",
};

const getResponsiveClasses = (slide: PitchDeckSlide) => {
  if (slide.type === "text") {
    return "col-span-1 md:col-span-2 lg:col-span-2";
  }
  const baseSize: SlideSize = slide.size || "medium";
  return sizeToResponsiveClass[baseSize];
};

const depthMap: Record<number, string> = {
  0: "shadow-none",
  1: "shadow-[0_4px_12px_rgba(0,0,0,0.15)]",
  2: "shadow-[0_10px_25px_rgba(0,0,0,0.25)]",
  3: "shadow-[0_18px_35px_rgba(0,0,0,0.35)]",
  4: "shadow-[0_24px_45px_rgba(0,0,0,0.45)]",
  5: "shadow-[0_30px_60px_rgba(0,0,0,0.55)]",
};

const getDepthStyles = (depth: number = 2) => {
  return depthMap[depth] || depthMap[2];
};

const getDepthTransform = (depth: number = 2): CSSProperties => {
  if (depth >= 4) {
    return {
      transform: `translateY(-${(depth - 3) * 2}px)`,
      transition: "transform 0.3s ease",
    };
  }
  return {
    transition: "transform 0.3s ease",
  };
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

  if (!orderedSlides.length) {
    return (
      <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-8 text-center text-[#a3a3a3]">
        No slides yet. Use the controls above to add your first slide.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 grid-flow-row-dense auto-rows-[minmax(220px,auto)] gap-4 md:gap-6 p-4 md:p-6">
      {orderedSlides.map((slide) => {
        const gridClasses = getResponsiveClasses(slide);
        const isText = slide.type === "text";
        const depthClass = !isText ? getDepthStyles(slide.depth || 2) : "";
        const depthTransform = !isText ? getDepthTransform(slide.depth || 2) : undefined;

        return (
          <div
            key={slide.id}
            className={`${gridClasses} relative flex`}
          >
            <div
              className={`group relative flex h-full w-full flex-col ${
                isText
                  ? ""
                  : `rounded-2xl border border-white/10 bg-black/20 backdrop-blur-sm transition-all duration-300 hover:border-[#cb6b1e]/30 overflow-hidden ${depthClass}`
              }`}
              style={depthTransform}
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

              {editMode && !isText && (
                <div className="absolute top-4 left-1/2 z-30 -translate-x-1/2 opacity-0 transition-opacity duration-200 group-hover:opacity-100 pointer-events-none">
                  <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-white/15 bg-black/85/90 px-4 py-2 shadow-lg backdrop-blur-sm">
                    <label className="text-[10px] uppercase tracking-[0.35em] text-[#a3a3a3]">
                      Depth
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={5}
                      value={slide.depth ?? 2}
                      onChange={(e) =>
                        onUpdateSlide?.(slide.id, {
                          depth: Number.parseInt(e.target.value, 10),
                        })
                      }
                      className="w-24 accent-[#cb6b1e]"
                    />
                    <span className="text-xs font-mono text-[#f6e1bd] w-8 text-right">
                      {slide.depth ?? 2}
                    </span>
                  </div>
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
      <div className="w-full p-4 md:p-6">
        <div
          className={`${textSizeClass} ${alignmentClass} leading-relaxed text-[#f6e1bd]`}
          style={{ color: slide.textColor || "#f6e1bd" }}
          dangerouslySetInnerHTML={{
            __html: formatPitchDeckText(slide.textContent || ""),
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3 rounded-2xl border border-dashed border-[#cb6b1e]/30 bg-[#050505] p-4 text-[#f6e1bd] transition-all duration-200 hover:border-[#cb6b1e]/60">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-black/60 p-2 text-sm">
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
        className={`w-full min-h-[160px] flex-1 resize-none placeholder-white/20 font-mono text-sm text-[#f6e1bd] ${textSizeClass} ${alignmentClass} ${
          editMode
            ? "bg-[#050505] p-4 rounded-xl border border-white/20 shadow-2xl relative z-20 focus:border-[#cb6b1e]"
            : "bg-transparent border-none"
        } focus:outline-none`}
        placeholder="Write your narrative... (# headers, **bold**, *italic*)"
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

const MediaContent = ({
  slide,
  editMode,
  uploading,
  onUpdateSlide,
  onUploadAsset,
}: ContentBoxProps) => {
  const getPdfSrc = (
    url: string,
    page: number = 1,
    fit: 'contain' | 'cover' = 'cover'
  ) => {
    if (!url) return "";
    const separator = url.includes("#") ? "&" : "#";
    const viewParam = fit === 'contain' ? 'view=Fit' : 'view=FitH';
    return `${url}${separator}page=${page}&${viewParam}&toolbar=0&navpanes=0&scrollbar=0`;
  };

  const defaultFit = slide.type === "video" ? "contain" : "cover";
  const mediaFit = slide.mediaFit || defaultFit;
  const pageNumber = slide.pdfPage || 1;

  if (slide.type === "pdf") {
    if (editMode && !slide.pdfUrl) {
      return (
        <div className="flex flex-col gap-3 p-6 items-center justify-center text-center h-full w-full bg-black/40">
          <div className="text-[#cb6b1e] mb-2">PDF Slide</div>
          <input
            type="text"
            value={slide.pdfUrl || ""}
            onChange={(e) =>
              onUpdateSlide?.(slide.id, { pdfUrl: e.target.value })
            }
            placeholder="Paste PDF URL"
            className="w-full max-w-[200px] rounded-lg bg-black/30 border border-white/20 px-3 py-2 text-xs text-[#f6e1bd] focus:border-[#cb6b1e] focus:outline-none"
          />
          <div className="text-[10px] text-[#737373]">OR</div>
          {onUploadAsset && (
            <label className="cursor-pointer rounded-lg bg-white/10 px-4 py-2 text-xs font-medium text-[#f6e1bd] hover:bg-white/20 transition-colors">
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

    return (
      <div className="w-full h-full relative bg-[#111] group/pdf overflow-hidden">
        {slide.pdfUrl ? (
          <>
            <iframe
              src={getPdfSrc(slide.pdfUrl, pageNumber, mediaFit)}
              className="absolute inset-0 w-full h-full"
              title={slide.pdfFileName || "PDF Slide"}
              style={{ border: "none", pointerEvents: editMode ? "none" : "auto" }}
            />
            {editMode && (
              <div className="absolute top-2 left-2 z-20 flex flex-col gap-2 opacity-0 group-hover/pdf:opacity-100 transition-opacity">
                <div className="flex items-center gap-2 bg-black/90 backdrop-blur-md rounded-lg border border-white/20 px-3 py-1.5 shadow-xl">
                  <span className="text-[10px] text-[#a3a3a3] uppercase font-bold tracking-wider">Page</span>
                  <input
                    type="number"
                    min={1}
                    value={pageNumber}
                    onChange={(e) =>
                      onUpdateSlide?.(slide.id, {
                        pdfPage: Number.parseInt(e.target.value, 10) || 1,
                      })
                    }
                    className="w-12 bg-white/10 rounded px-1 py-0.5 text-xs text-center text-[#f6e1bd] focus:outline-none focus:bg-white/20"
                  />
                </div>
                <div className="flex items-center gap-2 bg-black/90 backdrop-blur-md rounded-lg border border-white/20 px-3 py-1.5 shadow-xl">
                  <span className="text-[10px] text-[#a3a3a3] uppercase font-bold tracking-wider">View</span>
                  <select
                    value={mediaFit}
                    onChange={(e) =>
                      onUpdateSlide?.(slide.id, {
                        mediaFit: e.target.value as 'cover' | 'contain',
                      })
                    }
                    className="bg-white/10 rounded px-1 py-0.5 text-xs text-[#f6e1bd] focus:outline-none focus:bg-white/20"
                  >
                    <option value="cover">Fill (Crop)</option>
                    <option value="contain">Fit (Whole)</option>
                  </select>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[#a3a3a3] text-sm bg-white/5">
            PDF Pending
          </div>
        )}
      </div>
    );
  }

  if (slide.type === "video") {
    if (editMode && !slide.videoUrl) {
      return (
        <div className="flex flex-col gap-3 p-6 items-center justify-center text-center h-full w-full bg-black/40">
          <div className="text-[#cb6b1e] mb-2">Video Slide</div>
          <input
            type="text"
            value={slide.videoUrl || ""}
            onChange={(e) =>
              onUpdateSlide?.(slide.id, {
                videoUrl: e.target.value,
                videoSource: "youtube",
              })
            }
            placeholder="YouTube URL"
            className="w-full max-w-[200px] rounded-lg bg-black/30 border border-white/20 px-3 py-2 text-xs text-[#f6e1bd] focus:border-[#cb6b1e] focus:outline-none"
          />
          <div className="text-[10px] text-[#737373]">OR</div>
          {onUploadAsset && (
            <label className="cursor-pointer rounded-lg bg-white/10 px-4 py-2 text-xs font-medium text-[#f6e1bd] hover:bg-white/20 transition-colors">
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

    const youtubeEmbed =
      slide.videoSource === "youtube"
        ? getYouTubeEmbed(slide.videoUrl)
        : null;

    return (
      <div className="w-full h-full relative bg-black group/video">
        {youtubeEmbed ? (
          <iframe
            src={youtubeEmbed}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : slide.videoUrl ? (
          <video
            src={slide.videoUrl}
            controls={!editMode}
            className="absolute inset-0 w-full h-full"
            style={{ objectFit: mediaFit }}
            loop={slide.videoAutoplay}
            autoPlay={slide.videoAutoplay}
            muted={slide.videoAutoplay}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[#a3a3a3] text-sm">
            Video Pending
          </div>
        )}

        {editMode && slide.videoUrl && (
          <div className="absolute top-2 left-2 z-20 opacity-0 group-hover/video:opacity-100 transition-opacity">
            <div className="flex items-center gap-2 bg-black/90 backdrop-blur-md rounded-lg border border-white/20 px-3 py-1.5 shadow-xl">
              <span className="text-[10px] text-[#a3a3a3] uppercase font-bold tracking-wider">Scale</span>
              <select
                value={mediaFit}
                onChange={(e) =>
                  onUpdateSlide?.(slide.id, {
                    mediaFit: e.target.value as 'cover' | 'contain',
                  })
                }
                className="bg-white/10 rounded px-1 py-0.5 text-xs text-[#f6e1bd] focus:outline-none focus:bg-white/20"
              >
                <option value="contain">Fit (No Crop)</option>
                <option value="cover">Fill (Crop)</option>
              </select>
            </div>
          </div>
        )}
      </div>
    );
  }
  return null;
};
const ContentBox = (props: ContentBoxProps) => {
  const { slide, editMode } = props;
  const hasText =
    Boolean(slide.textContent) ||
    (editMode &&
      slide.textPosition &&
      slide.textPosition !== "full");
  const layout = slide.textPosition || "full";
  const isSideBySide =
    hasText && (layout === "left" || layout === "right");

  if (isSideBySide) {
    return (
      <div
        className={`flex h-full w-full flex-col md:flex-row ${
          layout === "right" ? "md:flex-row-reverse" : ""
        } overflow-hidden`}
      >
        <div className="flex-1 border-b border-white/5 md:border-b-0 md:border-r min-h-[220px] bg-transparent">
          <TextBox
            slide={slide}
            editMode={editMode}
            onUpdateSlide={props.onUpdateSlide}
          />
        </div>
        <div className="flex-1 min-h-[220px] bg-black/20">
          <MediaContent {...props} />
        </div>
      </div>
    );
  }

  return <MediaContent {...props} />;
};

export default MasonryPitchDeck;
