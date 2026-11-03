create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null check (char_length(event_name) between 1 and 80),
  occurred_at timestamptz not null default now(),
  session_hash text not null check (char_length(session_hash) between 16 and 128),
  page_path text not null default '/',
  language text not null default 'en',
  device_category text not null default 'unknown' check (device_category in ('mobile','tablet','desktop','unknown')),
  referrer_host text,
  country_code text,
  metadata jsonb not null default '{}'::jsonb
);

alter table public.analytics_events enable row level security;
revoke all on public.analytics_events from anon, authenticated;

create index if not exists analytics_events_occurred_at_idx on public.analytics_events (occurred_at);
create index if not exists analytics_events_event_name_idx on public.analytics_events (event_name);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
revoke all on public.admin_users from anon, authenticated;
create policy "admins can read own admin record" on public.admin_users for select to authenticated using (user_id = auth.uid());

create or replace function public.admin_is_authorized()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.admin_users where user_id = auth.uid() and is_active = true) $$;

create or replace function public.insert_analytics_event(
  p_event_name text,
  p_session_hash text,
  p_page_path text,
  p_language text,
  p_device_category text,
  p_referrer_host text default null,
  p_country_code text default null,
  p_metadata jsonb default '{}'::jsonb
) returns void language plpgsql security definer set search_path = public
as $$
begin
  if p_event_name not in ('page_opened','scan_started','barcode_completed','manual_lookup','lookup_succeeded','lookup_failed','guide_opened','language_changed','pwa_installed') then
    raise exception 'unsupported analytics event';
  end if;
  insert into public.analytics_events(event_name, session_hash, page_path, language, device_category, referrer_host, country_code, metadata)
  values (p_event_name, left(p_session_hash,128), left(coalesce(p_page_path,'/'),256), left(coalesce(p_language,'en'),12), left(coalesce(p_device_category,'unknown'),12), left(p_referrer_host,160), left(p_country_code,2), coalesce(p_metadata,'{}'::jsonb));
end $$;

revoke all on function public.insert_analytics_event(text,text,text,text,text,text,text,jsonb) from public;
grant execute on function public.insert_analytics_event(text,text,text,text,text,text,text,jsonb) to anon, authenticated;

create or replace function public.purge_old_analytics_events()
returns void language sql security definer set search_path = public
as $$ delete from public.analytics_events where occurred_at < now() - interval '30 days' $$;

revoke all on function public.purge_old_analytics_events() from public;
