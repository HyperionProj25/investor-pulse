// Pitch Deck Data Models

export type SlideType = 'pdf' | 'text' | 'video';

export type SlideSize = 'small' | 'medium' | 'large' | 'wide' | 'full';

export type VideoSource = 'youtube' | 'upload';

export type PitchDeckSlide = {
  id: string;
  type: SlideType;
  order: number;
  size?: SlideSize;
  depth?: number;

  // PDF slide properties
  pdfUrl?: string;
  pdfFileName?: string;

  // Text content properties (for text slides or side-by-side content)
  textContent?: string;
  textPosition?: 'left' | 'right' | 'full'; // Position relative to slide
  textAlign?: 'left' | 'center' | 'right';
  textColor?: string;
  textSize?: 'small' | 'normal' | 'large' | 'xl';
  mediaFit?: 'cover' | 'contain';

  // Video properties
  videoSource?: VideoSource;
  videoUrl?: string; // YouTube URL or upload URL
  videoAutoplay?: boolean;

  // Display options
  showWithSlide?: boolean; // Whether text/video appears alongside slide or standalone
  pdfPage?: number;
};

export type CountdownConfig = {
  targetDate: string; // ISO format
  label: string;
};

export type PitchDeckContent = {
  title: string;
  tagline?: string;
  displayMode: 'masonry'; // Fixed bento grid mode
  countdown: CountdownConfig;
  slides: PitchDeckSlide[];
};

// Default pitch deck content
export const DEFAULT_PITCH_DECK: PitchDeckContent = {
  title: "# Baseline Analytics",
  tagline: "Data **Redefined.**",
  displayMode: "masonry",
  countdown: {
    targetDate: "2026-03-01T00:00:00-08:00",
    label: "Launch milestone",
  },
  slides: [
    {
      id: "slide-1",
      type: "text",
      order: 0,
      textContent: "# Welcome to Baseline\n\nBuilding the performance data layer for baseball and softball.",
      textPosition: "full",
      size: "medium",
    },
  ],
};

// Helper function to sort slides by order
export const sortSlides = (slides: PitchDeckSlide[]): PitchDeckSlide[] => {
  return [...slides].sort((a, b) => a.order - b.order);
};

// Helper to generate unique slide ID
export const generateSlideId = (): string => {
  return `slide-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Helper to reorder slides
export const moveSlide = (
  slides: PitchDeckSlide[],
  slideId: string,
  direction: 'up' | 'down'
): PitchDeckSlide[] => {
  const sorted = sortSlides(slides);
  const index = sorted.findIndex((s) => s.id === slideId);

  if (index === -1) return slides;

  if (direction === 'up' && index === 0) return slides;
  if (direction === 'down' && index === sorted.length - 1) return slides;

  const newIndex = direction === 'up' ? index - 1 : index + 1;

  // Swap orders
  const temp = sorted[index].order;
  sorted[index].order = sorted[newIndex].order;
  sorted[newIndex].order = temp;

  return sorted;
};
