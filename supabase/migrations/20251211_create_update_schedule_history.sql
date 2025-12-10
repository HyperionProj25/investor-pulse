-- Track every timeline publish for auditing + note storage
-- Migration: 20251211_create_update_schedule_history

CREATE TABLE IF NOT EXISTS public.update_schedule_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  author text,
  version integer,
  timeline jsonb NOT NULL,
  notes text
);

-- Enable row-level security
ALTER TABLE public.update_schedule_history ENABLE ROW LEVEL SECURITY;

-- Only admins/service role can access history records
CREATE POLICY "Service role can manage update_schedule_history"
  ON public.update_schedule_history
  FOR ALL
  TO service_role, authenticated
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.update_schedule_history IS 'Audit log for update_schedule_state changes including optional admin notes.';
