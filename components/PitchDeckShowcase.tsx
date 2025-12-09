"use client";

import { useMemo, useState } from "react";
import { PitchDeckContent, PitchDeckSlide, sortSlides } from "@/lib/pitchDeck";
import { formatPitchDeckText } from "@/lib/formatPitchDeckText";
import { VALIDATION_ERRORS } from "@/lib/errorMessages";

type PitchDeckShowcaseProps = {
  content: PitchDeckContent | null;
  loading?: boolean;
};

const SlideCard = ({ slide }: { slide: PitchDeckSlide }) => {
  if (slide.type === "text") {
    return (
      <div className="prose prose-invert max-w-none text-lg">
        <div
          className="text-[#f6e1bd] leading-relaxed"
          dangerouslySetInnerHTML={{
            __html: formatPitchDeckText(slide.textContent || ""),
          }}
        />
      </div>
    );
  }

  if (slide.type === "pdf") {
    if (!slide.pdfUrl) {
      return (
        <div className="text-sm text-[#a3a3a3] text-center py-12">
          PDF slide coming soon.
        </div>
      );
    }
    return (
      <div className="aspect-[16/9] bg-white/5 rounded-2xl overflow-hidden">
        <iframe
          src={slide.pdfUrl}
          className="w-full h-full"
          title={slide.pdfFileName || "Pitch deck slide"}
          allowFullScreen
        />
      </div>
    );
  }

  if (slide.type === "video") {
    if (!slide.videoUrl) {
      return (
        <div className="text-sm text-[#a3a3a3] text-center py-12">
          Video slide coming soon.
        </div>
      );
    }

    if (slide.videoSource === "youtube") {
      const embedUrl = getYouTubeEmbed(slide.videoUrl);
      return embedUrl ? (
        <div className="aspect-video bg-white/5 rounded-2xl overflow-hidden">
          <iframe
            src={embedUrl}
            className="w-full h-full"
            title="Pitch deck video slide"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="text-sm text-[#a3a3a3] text-center py-12">
          {VALIDATION_ERRORS.PITCH_DECK_VIDEO_URL_INVALID}
        </div>
      );
    }

    return (
      <div className="aspect-video bg-white/5 rounded-2xl overflow-hidden">
        <video
          src={slide.videoUrl}
          controls
          className="w-full h-full"
          playsInline
        />
      </div>
    );
  }

  return null;
};

const getYouTubeEmbed = (url: string) => {
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
  } catch (error) {
    console.error(VALIDATION_ERRORS.PITCH_DECK_VIDEO_URL_INVALID, error);
  }
  return null;
};

export const PitchDeckShowcase = ({
  content,
  loading,
}: PitchDeckShowcaseProps) => {
  const slides = useMemo(() => {
    if (!content?.slides?.length) {
      return [];
    }
    return sortSlides(content.slides);
  }, [content]);

  const [activeIndex, setActiveIndex] = useState(0);

  if (loading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-[#a3a3a3]">
        Loading deck...
      </div>
    );
  }

  if (!content || !slides.length) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-[#a3a3a3]">
        Pitch deck content will appear here once it is published.
      </div>
    );
  }

  if (content.displayMode === "carousel") {
    const slide = slides[activeIndex] ?? slides[0];
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-10 shadow-2xl">
          <SlideCard slide={slide} />
        </div>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() =>
              setActiveIndex((prev) =>
                prev === 0 ? slides.length - 1 : prev - 1
              )
            }
            className="p-3 rounded-xl border border-white/20 bg-white/10 text-[#f6e1bd] hover:bg-white/20 disabled:opacity-50"
            disabled={slides.length <= 1}
          >
            {"<"}
          </button>
          <span className="text-sm text-[#a3a3a3]">
            {activeIndex + 1} / {slides.length}
          </span>
          <button
            onClick={() =>
              setActiveIndex((prev) =>
                prev === slides.length - 1 ? 0 : prev + 1
              )
            }
            className="p-3 rounded-xl border border-white/20 bg-white/10 text-[#f6e1bd] hover:bg-white/20 disabled:opacity-50"
            disabled={slides.length <= 1}
          >
            {">"}
          </button>
        </div>
        <div className="flex justify-center gap-2">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === activeIndex
                  ? "w-8 bg-[#cb6b1e]"
                  : "w-2 bg-white/30 hover:bg-white/50"
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {slides.map((slide) => (
        <div
          key={slide.id}
          className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-10 shadow-2xl"
        >
          <SlideCard slide={slide} />
        </div>
      ))}
    </div>
  );
};

export default PitchDeckShowcase;
