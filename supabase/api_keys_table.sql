-- Create api_keys table
create table if not exists api_keys (
  id          uuid default gen_random_uuid() primary key,
  email       text not null,
  use_case    text not null,
  api_key     text not null unique,
  created_at  timestamptz default now(),
  active      boolean default true
);

-- RLS: enable
alter table api_keys enable row level security;

-- Allow anonymous inserts (signup)
create policy "Allow anonymous insert"
  on api_keys for insert
  to anon
  with check (true);

-- Only service role can read (admin/backend)
create policy "Service role select"
  on api_keys for select
  to service_role
  using (true);

-- Index for key lookups
create index idx_api_keys_key on api_keys (api_key);
create index idx_api_keys_email on api_keys (email);
