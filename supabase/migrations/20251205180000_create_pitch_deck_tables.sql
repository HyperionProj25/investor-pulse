-- Create pitch_deck_state table for storing pitch deck content
CREATE TABLE IF NOT EXISTS public.pitch_deck_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  updated_at timestamptz DEFAULT now(),
  payload jsonb NOT NULL,
  version integer DEFAULT 1,
  updated_by text
);

-- Create pitch_deck_update_history table for audit trail
CREATE TABLE IF NOT EXISTS public.pitch_deck_update_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  author text,
  payload jsonb NOT NULL,
  notes text
);

-- Enable Row Level Security
ALTER TABLE public.pitch_deck_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pitch_deck_update_history ENABLE ROW LEVEL SECURITY;

-- Allow public read access to pitch_deck_state
CREATE POLICY "Allow public read access to pitch_deck_state"
  ON public.pitch_deck_state
  FOR SELECT
  USING (true);

-- Allow service_role full access to pitch_deck_state
CREATE POLICY "Allow service_role full access to pitch_deck_state"
  ON public.pitch_deck_state
  FOR ALL
  USING (auth.role() = 'service_role');

-- Allow service_role full access to pitch_deck_update_history
CREATE POLICY "Allow service_role full access to pitch_deck_update_history"
  ON public.pitch_deck_update_history
  FOR ALL
  USING (auth.role() = 'service_role');

-- Seed initial pitch deck data
INSERT INTO public.pitch_deck_state (payload, version, updated_by)
VALUES (
  '{
    "title": "Baseline Analytics",
    "displayMode": "vertical",
    "countdown": {
      "targetDate": "2026-03-01T00:00:00-08:00",
      "label": "Launch milestone"
    },
    "slides": [
      {
        "id": "slide-welcome",
        "type": "text",
        "order": 0,
        "textContent": "# Welcome to Baseline\n\nBuilding the performance data layer for baseball and softball.",
        "textPosition": "full"
      }
    ]
  }'::jsonb,
  1,
  'Initial Seed'
);

-- Insert same data into pitch_deck_update_history
INSERT INTO public.pitch_deck_update_history (author, payload, notes)
VALUES (
  'Initial Seed',
  '{
    "title": "Baseline Analytics",
    "displayMode": "vertical",
    "countdown": {
      "targetDate": "2026-03-01T00:00:00-08:00",
      "label": "Launch milestone"
    },
    "slides": [
      {
        "id": "slide-welcome",
        "type": "text",
        "order": 0,
        "textContent": "# Welcome to Baseline\n\nBuilding the performance data layer for baseball and softball.",
        "textPosition": "full"
      }
    ]
  }'::jsonb,
  'Initial pitch deck setup'
);
