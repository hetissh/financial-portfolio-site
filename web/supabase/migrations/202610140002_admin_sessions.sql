-- Keeps revocable, short-lived admin sessions in Postgres while Supabase Auth
-- owns passwords. Browser clients have no direct access to this table.
create table public.portfolio_admin_sessions (
  token_hash text primary key check (token_hash ~ '^[a-f0-9]{64}$'),
  admin_id text not null references public.portfolio_admins (id) on delete restrict,
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  auth_version bigint not null check (auth_version > 0),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index portfolio_admin_sessions_expiry on public.portfolio_admin_sessions (expires_at);
create index portfolio_admin_sessions_user on public.portfolio_admin_sessions (auth_user_id);
alter table public.portfolio_admin_sessions enable row level security;
