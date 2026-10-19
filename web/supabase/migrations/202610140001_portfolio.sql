-- Stores the portfolio's live content and two fixed administrator slots in Supabase.
-- Browser clients can read approved public content only; all mutations require a
-- trusted server that validates the Supabase user and the fixed admin slot.

create table public.portfolio_profile (
  id integer primary key default 1 check (id = 1),
  body jsonb not null check (jsonb_typeof(body) = 'object'),
  version bigint not null default 1 check (version > 0),
  updated_at timestamptz not null default now()
);

create table public.portfolio_research (
  id text primary key,
  slug text not null unique,
  status text not null check (status in ('draft', 'sample', 'published')),
  body jsonb not null check (jsonb_typeof(body) = 'object'),
  version bigint not null default 1 check (version > 0),
  updated_at timestamptz not null default now(),
  constraint portfolio_research_body_keys check (
    body ->> 'id' = id and body ->> 'slug' = slug and body ->> 'status' = status
  )
);

create table public.portfolio_research_order (
  id integer primary key default 1 check (id = 1),
  note_ids jsonb not null default '[]'::jsonb check (jsonb_typeof(note_ids) = 'array'),
  version bigint not null default 1 check (version > 0),
  updated_at timestamptz not null default now()
);

-- The check constraint prevents a third slot. Only a trusted server may bind
-- these slots to invited Supabase Auth users or change their status.
create table public.portfolio_admins (
  id text primary key check (id in ('admin-1', 'admin-2')),
  auth_user_id uuid unique references auth.users (id) on delete restrict,
  name text not null check (length(btrim(name)) between 1 and 100),
  status text not null default 'active' check (status in ('active', 'disabled')),
  version bigint not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz
);

insert into public.portfolio_admins (id, name)
values ('admin-1', 'Admin One'), ('admin-2', 'Admin Two');

-- Keep exactly the two fixed IDs even if a trusted key is used by mistake.
create function public.portfolio_guard_admin_slots() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' or tg_op = 'DELETE' then
    raise exception 'Administrator slots are fixed';
  end if;
  if new.id <> old.id then
    raise exception 'Administrator slot ID cannot change';
  end if;
  if old.status = 'active' and new.status = 'disabled' and
     (select count(*) from public.portfolio_admins where status = 'active') <= 1 then
    raise exception 'The last active administrator cannot be disabled';
  end if;
  return new;
end;
$$;

create trigger portfolio_fixed_admin_slots
before insert or update or delete on public.portfolio_admins
for each row execute function public.portfolio_guard_admin_slots();

create table public.portfolio_research_trash (
  id bigint generated always as identity primary key,
  note_id text not null,
  body jsonb not null check (jsonb_typeof(body) = 'object'),
  removed_by text not null check (removed_by in ('admin-1', 'admin-2')),
  removed_at timestamptz not null default now()
);

alter table public.portfolio_profile enable row level security;
alter table public.portfolio_research enable row level security;
alter table public.portfolio_research_order enable row level security;
alter table public.portfolio_admins enable row level security;
alter table public.portfolio_research_trash enable row level security;

-- The visitor-facing API may read only an approved profile and published notes.
-- Admin reads and all writes use a secret key on the trusted server after checking
-- the signed-in user's active portfolio_admins slot; no browser write policies exist.
create policy portfolio_public_profile_read on public.portfolio_profile
  for select to anon, authenticated
  using (body ->> 'isPlaceholder' = 'false');

create policy portfolio_public_research_read on public.portfolio_research
  for select to anon, authenticated
  using (status = 'published');

-- The order file can contain draft IDs. Return only published IDs to visitors.
create function public.portfolio_public_order() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(entry.note_id order by entry.ordinal), '[]'::jsonb)
  from public.portfolio_research_order as saved
  cross join lateral jsonb_array_elements_text(saved.note_ids)
    with ordinality as entry(note_id, ordinal)
  join public.portfolio_research as note on note.id = entry.note_id
  where saved.id = 1 and note.status = 'published';
$$;
revoke all on function public.portfolio_public_order() from public;
grant execute on function public.portfolio_public_order() to anon, authenticated;

-- Keep source uploads private. The public bucket contains only derivatives and
-- downloads that the admin has deliberately published. Do not upload drafts there.
insert into storage.buckets (id, name, public, file_size_limit)
values
  ('portfolio-private', 'portfolio-private', false, 10485760),
  ('portfolio-public', 'portfolio-public', true, 10485760);

create policy portfolio_public_assets_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'portfolio-public');
