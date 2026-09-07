-- WordList PWA: progress blobs keyed by authenticated Supabase user.
-- Table stays off PostgREST; clients call the RPCs with a user JWT.

create table if not exists wordlist.progress_account (
  user_id uuid primary key references auth.users (id) on delete cascade,
  blob text not null,
  saved_at bigint not null,
  updated_at timestamptz not null default now(),
  constraint progress_account_blob_chk check (
    char_length(blob) >= 8 and char_length(blob) <= 800000
  )
);

alter table wordlist.progress_account enable row level security;

revoke all on table wordlist.progress_account from public, anon, authenticated;

drop policy if exists progress_account_own on wordlist.progress_account;
create policy progress_account_own on wordlist.progress_account
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create or replace function public.wordlist_get_account()
returns table (blob text, saved_at bigint)
language plpgsql
stable
security definer
set search_path = wordlist, public
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  return query
    select s.blob, s.saved_at
    from wordlist.progress_account s
    where s.user_id = auth.uid()
    limit 1;
end;
$$;

create or replace function public.wordlist_put_account(
  p_blob text,
  p_saved_at bigint
)
returns boolean
language plpgsql
security definer
set search_path = wordlist, public
as $$
declare
  v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'not signed in';
  end if;
  if p_blob is null or char_length(p_blob) < 8 or char_length(p_blob) > 800000 then
    raise exception 'bad payload';
  end if;
  if p_saved_at is null or p_saved_at < 0 then
    raise exception 'bad timestamp';
  end if;

  insert into wordlist.progress_account as t (user_id, blob, saved_at)
  values (v_uid, p_blob, p_saved_at)
  on conflict (user_id) do update
    set blob = excluded.blob,
        saved_at = excluded.saved_at,
        updated_at = now()
    where t.saved_at <= excluded.saved_at;

  return true;
end;
$$;

revoke all on function public.wordlist_get_account() from public, anon;
revoke all on function public.wordlist_put_account(text, bigint) from public, anon;
grant execute on function public.wordlist_get_account() to authenticated;
grant execute on function public.wordlist_put_account(text, bigint) to authenticated;

notify pgrst, 'reload schema';
