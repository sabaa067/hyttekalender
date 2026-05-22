
create table public.app_users (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  password text not null unique,
  role text not null check (role in ('admin','viewer')),
  created_at timestamptz not null default now()
);

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.app_users(id) on delete set null,
  actor_name text not null,
  action text not null check (action in ('create','update','delete')),
  entry_title text not null,
  entry_category text,
  start_date date,
  end_date date,
  created_at timestamptz not null default now()
);

create index activity_log_created_at_idx on public.activity_log (created_at desc);

create table public.activity_reads (
  user_id uuid primary key references public.app_users(id) on delete cascade,
  last_read_at timestamptz not null default now()
);

alter table public.app_users enable row level security;
alter table public.activity_log enable row level security;
alter table public.activity_reads enable row level security;

create policy "anyone read users" on public.app_users for select using (true);
create policy "anyone read log" on public.activity_log for select using (true);
create policy "anyone insert log" on public.activity_log for insert with check (true);
create policy "anyone read reads" on public.activity_reads for select using (true);
create policy "anyone insert reads" on public.activity_reads for insert with check (true);
create policy "anyone update reads" on public.activity_reads for update using (true);

alter publication supabase_realtime add table public.activity_log;
alter publication supabase_realtime add table public.calendar_entries;

insert into public.app_users (name, password, role) values
  ('Farfar','farfarerbest','admin'),
  ('Morten','kabelbakke','admin'),
  ('Jørgen','stødig','admin'),
  ('Sander','sanderseralt','viewer');
