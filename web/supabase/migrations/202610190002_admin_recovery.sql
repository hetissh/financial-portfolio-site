-- Stores one-time recovery and email-change links outside the local auth JSON.

create table public.portfolio_admin_resets (
  token_hash text primary key check (token_hash ~ '^[a-f0-9]{64}$'),
  admin_id text not null references public.portfolio_admins (id) on delete restrict,
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index portfolio_admin_resets_admin_time
on public.portfolio_admin_resets (admin_id, created_at);

create table public.portfolio_admin_email_changes (
  token_hash text primary key check (token_hash ~ '^[a-f0-9]{64}$'),
  admin_id text not null references public.portfolio_admins (id) on delete restrict,
  requested_by text not null references public.portfolio_admins (id) on delete restrict,
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  auth_version bigint not null check (auth_version > 0),
  email text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.portfolio_admin_resets enable row level security;
alter table public.portfolio_admin_email_changes enable row level security;
