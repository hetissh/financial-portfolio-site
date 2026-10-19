-- Keeps cloud notebook order versions current and moves deleted notes to trash atomically.

create function public.portfolio_touch_research_order() returns trigger
language plpgsql set search_path = '' as $$
begin
  update public.portfolio_research_order
  set version = version + 1, updated_at = now()
  where id = 1;
  return null;
end;
$$;

create trigger portfolio_research_changes_touch_order
after insert or update or delete on public.portfolio_research
for each statement execute function public.portfolio_touch_research_order();

create function public.portfolio_move_research_to_trash(
  p_id text,
  p_expected_version bigint,
  p_removed_by text
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  current_note public.portfolio_research%rowtype;
begin
  if p_removed_by not in ('admin-1', 'admin-2') then
    raise exception 'Invalid administrator';
  end if;
  select * into current_note
  from public.portfolio_research
  where id = p_id
  for update;
  if not found then
    raise exception 'Research note not found';
  end if;
  if current_note.version <> p_expected_version then
    raise exception 'Research note is stale';
  end if;
  insert into public.portfolio_research_trash (note_id, body, removed_by)
  values (current_note.id, current_note.body, p_removed_by);
  delete from public.portfolio_research where id = p_id;
end;
$$;

revoke all on function public.portfolio_move_research_to_trash(text,bigint,text) from public;
grant execute on function public.portfolio_move_research_to_trash(text,bigint,text) to service_role;
