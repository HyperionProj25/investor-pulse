-- Business Operating System (BOS) Tables
-- Created: 2025-12-26

-- 1. Create bos_state table (Current BOS Content)
create table if not exists public.bos_state (
  id uuid default gen_random_uuid() primary key,
  updated_at timestamptz default now(),
  payload jsonb not null,
  version integer default 1,
  updated_by text
);

-- 2. Create bos_update_history table (Audit Trail)
create table if not exists public.bos_update_history (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  author text,
  payload jsonb not null,
  notes text
);

-- 3. Enable Security (RLS)
alter table public.bos_state enable row level security;
alter table public.bos_update_history enable row level security;

-- 4. Add Access Policies
-- Only admins can read BOS state (internal tool)
create policy "Admins can read bos_state"
  on public.bos_state for select to service_role, authenticated using (true);

-- Only admins can update BOS state
create policy "Admins can update bos_state"
  on public.bos_state for all to service_role, authenticated using (true);

-- Only admins can touch BOS history
create policy "Admins can interact with bos_history"
  on public.bos_update_history for all to service_role, authenticated using (true);

-- 5. Add indexes for performance
create index if not exists idx_bos_state_updated_at on public.bos_state(updated_at desc);
create index if not exists idx_bos_history_created_at on public.bos_update_history(created_at desc);
