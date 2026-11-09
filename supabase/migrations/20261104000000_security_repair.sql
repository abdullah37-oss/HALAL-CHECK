-- Security hardening for the existing analytics schema.
-- This migration does not delete data or change existing rows.

revoke all on function public.admin_is_authorized() from public, anon;
grant execute on function public.admin_is_authorized() to authenticated;

create or replace function public.admin_is_authorized()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
      and is_active = true
  )
$$;

revoke all on function public.admin_is_authorized() from public, anon;
grant execute on function public.admin_is_authorized() to authenticated;

create or replace function public.insert_analytics_event(
  p_event_name pg_catalog.text,
  p_session_hash pg_catalog.text,
  p_page_path pg_catalog.text,
  p_language pg_catalog.text,
  p_device_category pg_catalog.text,
  p_referrer_host pg_catalog.text default null,
  p_country_code pg_catalog.text default null,
  p_metadata pg_catalog.jsonb default '{}'::jsonb
) returns pg_catalog.void language plpgsql security definer set search_path = ''
as $$
begin
  if p_event_name not in ('page_opened','scan_started','barcode_completed','manual_lookup','lookup_succeeded','lookup_failed','guide_opened','language_changed','pwa_installed')
    or p_session_hash !~ '^[A-Za-z0-9]{16,128}$'
    or pg_catalog.char_length(coalesce(p_page_path, '/')) > 256
    or pg_catalog.char_length(coalesce(p_language, 'en')) > 12
    or p_device_category not in ('mobile', 'tablet', 'desktop', 'unknown')
    or pg_catalog.char_length(coalesce(p_referrer_host, '')) > 160
    or pg_catalog.char_length(coalesce(p_country_code, '')) > 2
    or pg_catalog.jsonb_typeof(coalesce(p_metadata, '{}'::jsonb)) <> 'object'
    or pg_catalog.pg_column_size(coalesce(p_metadata, '{}'::jsonb)) > 2048 then
    raise exception 'invalid analytics event';
  end if;

  insert into public.analytics_events(event_name, session_hash, page_path, language, device_category, referrer_host, country_code, metadata)
  values (p_event_name, pg_catalog.left(p_session_hash, 128), pg_catalog.left(coalesce(p_page_path, '/'), 256), pg_catalog.left(coalesce(p_language, 'en'), 12), p_device_category, pg_catalog.left(p_referrer_host, 160), pg_catalog.left(p_country_code, 2), coalesce(p_metadata, '{}'::jsonb));
end
$$;

revoke all on function public.insert_analytics_event(pg_catalog.text,pg_catalog.text,pg_catalog.text,pg_catalog.text,pg_catalog.text,pg_catalog.text,pg_catalog.text,pg_catalog.jsonb) from public;
grant execute on function public.insert_analytics_event(pg_catalog.text,pg_catalog.text,pg_catalog.text,pg_catalog.text,pg_catalog.text,pg_catalog.text,pg_catalog.text,pg_catalog.jsonb) to anon, authenticated;

create or replace function public.get_admin_analytics(p_days integer default 30)
returns pg_catalog.jsonb language plpgsql security definer set search_path = ''
as $$
declare
  result jsonb;
begin
  if not public.admin_is_authorized() then
    raise insufficient_privilege using message = 'admin authorization required';
  end if;
  if p_days < 1 or p_days > 90 then
    raise invalid_parameter_value using message = 'invalid analytics range';
  end if;

  select pg_catalog.jsonb_build_object(
    'totalEvents', pg_catalog.count(*)::integer,
    'eventCounts', coalesce((select pg_catalog.jsonb_object_agg(event_name, event_count) from (
      select event_name, pg_catalog.count(*)::integer as event_count
      from public.analytics_events
      where occurred_at >= pg_catalog.now() - pg_catalog.make_interval(days => p_days)
      group by event_name
    ) counts), '{}'::pg_catalog.jsonb),
    'dailyActivity', coalesce((select pg_catalog.jsonb_object_agg(activity_day, event_count) from (
      select pg_catalog.to_char(occurred_at at time zone 'UTC', 'YYYY-MM-DD') as activity_day, pg_catalog.count(*)::integer as event_count
      from public.analytics_events
      where occurred_at >= pg_catalog.now() - pg_catalog.make_interval(days => p_days)
      group by activity_day
      order by activity_day
    ) daily), '{}'::pg_catalog.jsonb)
  )
  into result
  from public.analytics_events
  where occurred_at >= pg_catalog.now() - pg_catalog.make_interval(days => p_days);

  return result;
end
$$;

revoke all on function public.get_admin_analytics(integer) from public, anon;
grant execute on function public.get_admin_analytics(integer) to authenticated;

create or replace function public.purge_old_analytics_events()
returns pg_catalog.void language sql security definer set search_path = ''
as $$
  delete from public.analytics_events
  where occurred_at < pg_catalog.now() - pg_catalog.make_interval(days => 30)
$$;

revoke all on function public.purge_old_analytics_events() from public, anon, authenticated;
