-- Seed initial timeline data from updateschedule.html
-- Migration: 20251209_seed_timeline_data

INSERT INTO public.update_schedule_state (
  timeline_start,
  timeline_end,
  timeline_months,
  phases,
  milestones,
  title,
  subtitle,
  footer_text,
  colors,
  is_active,
  version
) VALUES (
  '2025-12-01',
  '2026-06-30',

  -- Timeline months array
  '["Dec 2025", "Jan 2026", "Feb 2026", "Mar 2026", "Apr 2026", "May 2026", "Jun 2026"]'::jsonb,

  -- Phases array (5 phases with Gantt positioning)
  '[
    {
      "id": "phase-planning",
      "type": "planning",
      "label": "Phase 1 – Planning",
      "timing": "Dec 2025",
      "focus": "MVP scope, data models, and facility onboarding architecture.",
      "startPercent": 3,
      "widthPercent": 20,
      "color": "#6b7280",
      "colorGradient": "linear-gradient(90deg, #6b7280, #9ca3af)"
    },
    {
      "id": "phase-dev",
      "type": "dev",
      "label": "Phase 2 – Build",
      "timing": "Jan – Feb 2026",
      "focus": "Facility OS foundations, ingestion pipeline, investor hub v1.",
      "startPercent": 18,
      "widthPercent": 35,
      "color": "#4f9edb",
      "colorGradient": "linear-gradient(90deg, #4f9edb, #7cc0ff)"
    },
    {
      "id": "phase-test",
      "type": "test",
      "label": "Phase 3 – Validation",
      "timing": "Mar 2026",
      "focus": "Closed pilots, QA, data quality sweeps, investor preview.",
      "startPercent": 48,
      "widthPercent": 20,
      "color": "#eab308",
      "colorGradient": "linear-gradient(90deg, #facc15, #fde047)"
    },
    {
      "id": "phase-launch",
      "type": "launch",
      "label": "Phase 4 – Launch",
      "timing": "May 2026",
      "focus": "MVP release, enablement, and investor launch cadence.",
      "startPercent": 61,
      "widthPercent": 15,
      "color": "#f26c1a",
      "colorGradient": "linear-gradient(90deg, #f26c1a, #faae6b)"
    },
    {
      "id": "phase-post",
      "type": "post",
      "label": "Phase 5 – Post-Launch & Phase 2 Prep",
      "timing": "Late May – Jun 2026",
      "focus": "Metrics review, second facility cohort, Phase 2 scope.",
      "startPercent": 72,
      "widthPercent": 15,
      "color": "#22c55e",
      "colorGradient": "linear-gradient(90deg, #22c55e, #4ade80)"
    }
  ]'::jsonb,

  -- Milestones array (10 key milestones)
  '[
    {
      "id": "m1",
      "title": "MVP Scope Defined",
      "date": "2025-12-15",
      "meta": "Dec 15, 2025"
    },
    {
      "id": "m2",
      "title": "Architecture Finalized",
      "date": "2025-12-22",
      "meta": "Dec 22, 2025"
    },
    {
      "id": "m3",
      "title": "UI/UX Complete",
      "date": "2026-01-10",
      "meta": "Jan 10, 2026"
    },
    {
      "id": "m4",
      "title": "Core Features Built",
      "date": "2026-03-01",
      "meta": "Mar 1, 2026"
    },
    {
      "id": "m5",
      "title": "Feature Freeze",
      "date": "2026-03-08",
      "meta": "Mar 8, 2026"
    },
    {
      "id": "m6",
      "title": "Alpha Testing",
      "date": "2026-03-10",
      "meta": "Starts Mar 10, 2026"
    },
    {
      "id": "m7",
      "title": "Beta Launch",
      "date": "2026-04-01",
      "meta": "Apr 1, 2026"
    },
    {
      "id": "m8",
      "title": "MVP Public Launch",
      "date": "2026-05-10",
      "meta": "May 10, 2026"
    },
    {
      "id": "m9",
      "title": "Metrics Review",
      "date": "2026-05-25",
      "meta": "Late May 2026"
    },
    {
      "id": "m10",
      "title": "Phase 2 Planning",
      "date": "2026-06-15",
      "meta": "June 2026"
    }
  ]'::jsonb,

  -- Metadata
  'Baseline Analytics – MVP Gantt',
  'MVP build for Facility OS, investor reporting, and internal dashboard infrastructure.',
  'Edit dates, text, and bar widths in this file to refresh the roadmap.',

  -- Colors for each phase type
  '{
    "planning": "#6b7280",
    "dev": "#4f9edb",
    "test": "#eab308",
    "launch": "#f26c1a",
    "post": "#22c55e"
  }'::jsonb,

  true,  -- is_active
  1      -- version
)
ON CONFLICT DO NOTHING;

-- Add comment
COMMENT ON TABLE public.update_schedule_state IS 'Timeline data migrated from updateschedule.html. This seed data provides the initial state for the visual timeline editor.';
