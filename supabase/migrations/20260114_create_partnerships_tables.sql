-- Partnerships Tables
-- Created: 2026-01-14

-- 1. Create partners table
create table if not exists public.partners (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  type text not null check (type in ('ecosystem', 'tech', 'person')),
  location_city text,
  location_state text,
  location_country text default 'USA',
  latitude decimal,
  longitude decimal,
  ecosystem_impact integer not null check (ecosystem_impact >= 1 and ecosystem_impact <= 10),
  population_reach integer,
  company_size text check (company_size is null or company_size in ('startup', 'small', 'medium', 'large', 'enterprise')),
  client_potential integer,
  status text not null default 'target' check (status in ('target', 'contacted', 'in_progress', 'secured', 'inactive')),
  end_game text,
  notes text,
  website text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Create partner_connections table
create table if not exists public.partner_connections (
  id uuid default gen_random_uuid() primary key,
  from_partner_id uuid not null references public.partners(id) on delete cascade,
  to_partner_id uuid not null references public.partners(id) on delete cascade,
  connection_type text not null check (connection_type in ('works_at', 'knows', 'target_intro', 'client_of', 'partner_of')),
  strength integer not null check (strength >= 1 and strength <= 5),
  notes text,
  created_at timestamptz default now(),
  constraint different_partners check (from_partner_id != to_partner_id)
);

-- 3. Create partner_node_positions table
create table if not exists public.partner_node_positions (
  id uuid default gen_random_uuid() primary key,
  partner_id uuid not null references public.partners(id) on delete cascade unique,
  x_position decimal not null,
  y_position decimal not null,
  updated_at timestamptz default now()
);

-- 4. Enable Security (RLS)
alter table public.partners enable row level security;
alter table public.partner_connections enable row level security;
alter table public.partner_node_positions enable row level security;

-- 5. Add Access Policies for partners
create policy "Service role can do all on partners"
  on public.partners for all to service_role using (true);

create policy "Anon can read partners"
  on public.partners for select to anon using (true);

-- 6. Add Access Policies for partner_connections
create policy "Service role can do all on partner_connections"
  on public.partner_connections for all to service_role using (true);

create policy "Anon can read partner_connections"
  on public.partner_connections for select to anon using (true);

-- 7. Add Access Policies for partner_node_positions
create policy "Service role can do all on partner_node_positions"
  on public.partner_node_positions for all to service_role using (true);

create policy "Anon can read partner_node_positions"
  on public.partner_node_positions for select to anon using (true);

-- 8. Add indexes for performance
create index if not exists idx_partners_type on public.partners(type);
create index if not exists idx_partners_status on public.partners(status);
create index if not exists idx_partners_ecosystem_impact on public.partners(ecosystem_impact desc);
create index if not exists idx_partners_created_at on public.partners(created_at desc);
create index if not exists idx_partner_connections_from on public.partner_connections(from_partner_id);
create index if not exists idx_partner_connections_to on public.partner_connections(to_partner_id);
create index if not exists idx_partner_node_positions_partner on public.partner_node_positions(partner_id);

-- 9. Create function to auto-update updated_at timestamp
create or replace function update_partners_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 10. Create trigger for auto-updating updated_at
create trigger partners_updated_at_trigger
  before update on public.partners
  for each row execute function update_partners_updated_at();

create trigger partner_node_positions_updated_at_trigger
  before update on public.partner_node_positions
  for each row execute function update_partners_updated_at();
