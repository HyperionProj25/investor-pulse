// Timeline data models, validation, and utility functions
// Used by the visual timeline editor for the update schedule

export type PhaseType = 'planning' | 'dev' | 'test' | 'launch' | 'post';

export type Phase = {
  id: string;
  type: PhaseType;
  label: string;              // e.g., "Phase 1 – Planning"
  timing: string;             // e.g., "Dec 2025"
  focus: string;              // Description of phase goals

  // Gantt bar positioning (as percentages 0-100)
  startPercent: number;       // Where the bar starts
  widthPercent: number;       // How wide the bar is

  // Visual styling
  color: string;              // Solid color hex
  colorGradient: string;      // CSS gradient string
};

export type Milestone = {
  id: string;
  title: string;              // e.g., "MVP Scope Defined"
  date: string;               // ISO date string
  meta?: string;              // Optional formatted display (e.g., "Dec 15, 2025")
};

export type TimelineData = {
  id?: string;
  timelineStart: string;      // ISO date for timeline start
  timelineEnd: string;        // ISO date for timeline end
  timelineMonths: string[];   // Month labels (e.g., ['Dec 2025', 'Jan 2026', ...])
  phases: Phase[];            // Array of 5 phases
  milestones: Milestone[];    // Array of 10 milestones
  title: string;
  subtitle: string;
  footerText: string;
  colors: Record<PhaseType, string>;  // Color scheme
  version?: number;
  updatedBy?: string;
  updatedAt?: string;
};

/**
 * Create a default timeline with initial values
 */
export const createDefaultTimeline = (): TimelineData => ({
  timelineStart: '2025-12-01',
  timelineEnd: '2026-06-30',
  timelineMonths: ['Dec 2025', 'Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026'],
  phases: [
    {
      id: 'phase-planning',
      type: 'planning',
      label: 'Phase 1 – Planning',
      timing: 'Dec 2025',
      focus: 'MVP scope, data models, and facility onboarding architecture.',
      startPercent: 3,
      widthPercent: 20,
      color: '#6b7280',
      colorGradient: 'linear-gradient(90deg, #6b7280, #9ca3af)'
    },
    {
      id: 'phase-dev',
      type: 'dev',
      label: 'Phase 2 – Build',
      timing: 'Jan – Feb 2026',
      focus: 'Facility OS foundations, ingestion pipeline, investor hub v1.',
      startPercent: 18,
      widthPercent: 35,
      color: '#4f9edb',
      colorGradient: 'linear-gradient(90deg, #4f9edb, #7cc0ff)'
    },
    {
      id: 'phase-test',
      type: 'test',
      label: 'Phase 3 – Validation',
      timing: 'Mar 2026',
      focus: 'Closed pilots, QA, data quality sweeps, investor preview.',
      startPercent: 48,
      widthPercent: 20,
      color: '#eab308',
      colorGradient: 'linear-gradient(90deg, #facc15, #fde047)'
    },
    {
      id: 'phase-launch',
      type: 'launch',
      label: 'Phase 4 – Launch',
      timing: 'May 2026',
      focus: 'MVP release, enablement, and investor launch cadence.',
      startPercent: 61,
      widthPercent: 15,
      color: '#f26c1a',
      colorGradient: 'linear-gradient(90deg, #f26c1a, #faae6b)'
    },
    {
      id: 'phase-post',
      type: 'post',
      label: 'Phase 5 – Post-Launch & Phase 2 Prep',
      timing: 'Late May – Jun 2026',
      focus: 'Metrics review, second facility cohort, Phase 2 scope.',
      startPercent: 72,
      widthPercent: 15,
      color: '#22c55e',
      colorGradient: 'linear-gradient(90deg, #22c55e, #4ade80)'
    }
  ],
  milestones: [
    { id: 'm1', title: 'MVP Scope Defined', date: '2025-12-15', meta: 'Dec 15, 2025' },
    { id: 'm2', title: 'Architecture Finalized', date: '2025-12-22', meta: 'Dec 22, 2025' },
    { id: 'm3', title: 'UI/UX Complete', date: '2026-01-10', meta: 'Jan 10, 2026' },
    { id: 'm4', title: 'Core Features Built', date: '2026-03-01', meta: 'Mar 1, 2026' },
    { id: 'm5', title: 'Feature Freeze', date: '2026-03-08', meta: 'Mar 8, 2026' },
    { id: 'm6', title: 'Alpha Testing', date: '2026-03-10', meta: 'Starts Mar 10, 2026' },
    { id: 'm7', title: 'Beta Launch', date: '2026-04-01', meta: 'Apr 1, 2026' },
    { id: 'm8', title: 'MVP Public Launch', date: '2026-05-10', meta: 'May 10, 2026' },
    { id: 'm9', title: 'Metrics Review', date: '2026-05-25', meta: 'Late May 2026' },
    { id: 'm10', title: 'Phase 2 Planning', date: '2026-06-15', meta: 'June 2026' }
  ],
  title: 'Baseline Analytics – MVP Gantt',
  subtitle: 'MVP build for Facility OS, investor reporting, and internal dashboard infrastructure.',
  footerText: 'Edit dates, text, and bar widths in this file to refresh the roadmap.',
  colors: {
    planning: '#6b7280',
    dev: '#4f9edb',
    test: '#eab308',
    launch: '#f26c1a',
    post: '#22c55e'
  }
});

/**
 * Calculate the position of the "today line" on the Gantt chart
 * Returns a percentage (0-100) representing where today falls on the timeline
 */
export const calculateTodayLinePosition = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();

  const totalDuration = end.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();

  const percent = (elapsed / totalDuration) * 100;
  return Math.min(Math.max(percent, 0), 100);
};

/**
 * Format a milestone date for display
 */
export const formatMilestoneDate = (isoDate: string): string => {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Validate a single phase
 * Returns array of error messages (empty if valid)
 */
export const validatePhase = (phase: Phase): string[] => {
  const errors: string[] = [];

  if (!phase.label?.trim()) {
    errors.push('Phase label is required');
  }
  if (!phase.timing?.trim()) {
    errors.push('Phase timing is required');
  }
  if (!phase.focus?.trim()) {
    errors.push('Phase focus is required');
  }
  if (phase.startPercent < 0 || phase.startPercent > 100) {
    errors.push('Start position must be between 0-100%');
  }
  if (phase.widthPercent <= 0 || phase.widthPercent > 100) {
    errors.push('Width must be between 1-100%');
  }
  if (phase.startPercent + phase.widthPercent > 100) {
    errors.push('Phase extends beyond 100% of timeline');
  }

  return errors;
};

/**
 * Validate a single milestone
 * Returns array of error messages (empty if valid)
 */
export const validateMilestone = (milestone: Milestone): string[] => {
  const errors: string[] = [];

  if (!milestone.title?.trim()) {
    errors.push('Milestone title is required');
  }
  if (!milestone.date) {
    errors.push('Milestone date is required');
  } else {
    const date = new Date(milestone.date);
    if (isNaN(date.getTime())) {
      errors.push('Invalid milestone date');
    }
  }

  return errors;
};

/**
 * Validate the entire timeline
 * Returns an object with field paths as keys and error arrays as values
 */
export const validateTimeline = (timeline: TimelineData): Record<string, string[]> => {
  const errors: Record<string, string[]> = {};

  // Validate timeline dates
  const start = new Date(timeline.timelineStart);
  const end = new Date(timeline.timelineEnd);

  if (isNaN(start.getTime())) {
    errors.timeline = ['Invalid start date'];
  }
  if (isNaN(end.getTime())) {
    errors.timeline = [...(errors.timeline || []), 'Invalid end date'];
  }
  if (start >= end) {
    errors.timeline = [...(errors.timeline || []), 'End date must be after start date'];
  }

  // Validate title
  if (!timeline.title?.trim()) {
    errors.title = ['Title is required'];
  }

  // Validate phases
  timeline.phases.forEach((phase, idx) => {
    const phaseErrors = validatePhase(phase);
    if (phaseErrors.length > 0) {
      errors[`phase-${idx}`] = phaseErrors;
    }
  });

  // Validate milestones
  timeline.milestones.forEach((milestone, idx) => {
    const milestoneErrors = validateMilestone(milestone);
    if (milestoneErrors.length > 0) {
      errors[`milestone-${idx}`] = milestoneErrors;
    }
  });

  return errors;
};

/**
 * Check if a timeline has any validation errors
 */
export const hasValidationErrors = (errors: Record<string, string[]>): boolean => {
  return Object.keys(errors).length > 0;
};

/**
 * Generate a unique ID for new phases or milestones
 */
export const generateId = (prefix: string): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
