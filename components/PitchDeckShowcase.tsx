"use client";

import { useMemo } from "react";
import {
  PitchDeckContent,
  PitchDeckSlide,
  sortSlides,
} from "@/lib/pitchDeck";
import MasonryPitchDeck from "./MasonryPitchDeck";

type PitchDeckShowcaseProps = {
  content: PitchDeckContent | null;
  loading?: boolean;
};

export const PitchDeckShowcase = ({
  content,
  loading,
}: PitchDeckShowcaseProps) => {
  const slides = useMemo<PitchDeckSlide[]>(() => {
    if (!content?.slides?.length) {
      return [];
    }
    return sortSlides(content.slides);
  }, [content]);

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

  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-xl shadow-2xl">
      <MasonryPitchDeck slides={slides} />
    </div>
  );
};

export default PitchDeckShowcase;
