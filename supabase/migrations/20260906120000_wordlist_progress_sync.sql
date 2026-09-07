-- WordList PWA: encrypted progress blobs keyed by an 8-character sync code.
-- The table is not exposed to PostgREST; clients only call the RPCs below.

create schema if not exists wordlist;

create table if not exists wordlist.progress_sync (
  code text primary key,
  blob text not null,
  saved_at bigint not null,
  updated_at timestamptz not null default now(),
  constraint progress_sync_code_chk check (
    code ~ '^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$'
  ),
  constraint progress_sync_blob_chk check (
    char_length(blob) >= 8 and char_length(blob) <= 800000
  )
);

alter table wordlist.progress_sync enable row level security;

revoke all on schema wordlist from public, anon, authenticated;
revoke all on table wordlist.progress_sync from public, anon, authenticated;

create or replace function public.wordlist_get_sync(p_code text)
returns table (blob text, saved_at bigint)
language sql
stable
security definer
set search_path = wordlist, public
as $$
  select s.blob, s.saved_at
  from wordlist.progress_sync s
  where s.code = upper(trim(p_code))
  limit 1;
$$;

create or replace function public.wordlist_put_sync(
  p_code text,
  p_blob text,
  p_saved_at bigint
)
returns boolean
language plpgsql
security definer
set search_path = wordlist, public
as $$
declare
  v_code text;
begin
  v_code := upper(trim(p_code));
  if v_code !~ '^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$' then
    raise exception 'bad code';
  end if;
  if p_blob is null or char_length(p_blob) < 8 or char_length(p_blob) > 800000 then
    raise exception 'bad payload';
  end if;
  if p_saved_at is null or p_saved_at < 0 then
    raise exception 'bad timestamp';
  end if;

  insert into wordlist.progress_sync as t (code, blob, saved_at)
  values (v_code, p_blob, p_saved_at)
  on conflict (code) do update
    set blob = excluded.blob,
        saved_at = excluded.saved_at,
        updated_at = now()
    where t.saved_at <= excluded.saved_at;

  return true;
end;
$$;

revoke all on function public.wordlist_get_sync(text) from public;
revoke all on function public.wordlist_put_sync(text, text, bigint) from public;
grant execute on function public.wordlist_get_sync(text) to anon, authenticated;
grant execute on function public.wordlist_put_sync(text, text, bigint) to anon, authenticated;

notify pgrst, 'reload schema';
