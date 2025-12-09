-- 1. Create site_state table (Current Live Content)
create table public.site_state (
  id uuid default gen_random_uuid() primary key,
  updated_at timestamptz default now(),
  payload jsonb not null,
  version integer default 1,
  updated_by text
);

-- 2. Create update_history table (Archive)
create table public.update_history (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  author text,
  payload jsonb not null,
  notes text
);

-- 4. Enable Security (RLS)
alter table public.site_state enable row level security;
alter table public.update_history enable row level security;

-- 5. Add Access Policies
-- Everyone can read the live state
create policy "Public can read site_state"
  on public.site_state for select to anon using (true);

-- Only admins can update the live state
create policy "Admins can update site_state"
  on public.site_state for all to service_role, authenticated using (true);

-- Only admins can touch history
create policy "Admins can interact with history"
  on public.update_history for all to service_role, authenticated using (true);