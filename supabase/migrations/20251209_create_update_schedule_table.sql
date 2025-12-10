-- Create update_schedule_state table for timeline editor
-- Migration: 20251209_create_update_schedule_table

CREATE TABLE IF NOT EXISTS public.update_schedule_state (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  updated_by text,
  version integer DEFAULT 1 NOT NULL,

  -- Timeline configuration
  timeline_start date NOT NULL,
  timeline_end date NOT NULL,
  timeline_months jsonb NOT NULL,

  -- Phases data (array of 5 phase objects)
  phases jsonb NOT NULL,

  -- Milestones data (array of 10 milestone objects)
  milestones jsonb NOT NULL,

  -- Metadata
  title text DEFAULT 'Baseline Analytics – MVP Gantt',
  subtitle text,
  footer_text text,

  -- Visual settings (color scheme for phases)
  colors jsonb DEFAULT '{
    "planning": "#6b7280",
    "dev": "#4f9edb",
    "test": "#eab308",
    "launch": "#f26c1a",
    "post": "#22c55e"
  }'::jsonb,

  -- Mark as active (only one active timeline at a time)
  is_active boolean DEFAULT true NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.update_schedule_state ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Policy 1: Public (anonymous) users can read the active timeline
CREATE POLICY "Public can read active schedule"
  ON public.update_schedule_state
  FOR SELECT
  TO anon
  USING (is_active = true);

-- Policy 2: Authenticated users can read the active timeline
CREATE POLICY "Authenticated can read active schedule"
  ON public.update_schedule_state
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Policy 3: Service role (backend) has full access
CREATE POLICY "Service role has full access"
  ON public.update_schedule_state
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create index on is_active for faster queries
CREATE INDEX IF NOT EXISTS idx_update_schedule_active
  ON public.update_schedule_state(is_active)
  WHERE is_active = true;

-- Create index on version for history tracking
CREATE INDEX IF NOT EXISTS idx_update_schedule_version
  ON public.update_schedule_state(version DESC);

-- Add comment to table
COMMENT ON TABLE public.update_schedule_state IS 'Stores timeline/Gantt chart data for the update schedule page. Supports visual editor with drag-and-drop phase bars and editable milestones.';
