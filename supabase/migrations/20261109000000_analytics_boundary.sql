-- Apply only after owner approval. Keeps the existing schema and historical rows.
-- The database is the enforcement point; CORS alone cannot protect a public RPC.
revoke all on function public.insert_analytics_event(text,text,text,text,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.insert_analytics_event(text,text,text,text,text,text,text,jsonb) to service_role;

create or replace function public.insert_analytics_event(
 p_event_name text, p_session_hash text, p_page_path text, p_language text,
 p_device_category text, p_referrer_host text default null,
 p_country_code text default null, p_metadata jsonb default '{}'::jsonb
) returns void language plpgsql security definer set search_path = '' as $$
begin
 if p_event_name is null or p_event_name not in ('page_opened','scan_started','barcode_completed','manual_lookup','lookup_succeeded','lookup_failed','guide_opened','language_changed','pwa_installed','analysis_completed')
 or p_session_hash is null or p_session_hash !~ '^[A-Za-z0-9]{16,128}$'
 or p_page_path is distinct from '/' or p_language is null or p_language !~ '^[a-z]{2}$'
 or p_device_category is null or p_device_category not in ('mobile','tablet','desktop','unknown')
 or p_metadata is distinct from '{}'::jsonb or p_referrer_host is not null or p_country_code is not null then
  raise invalid_parameter_value using message = 'invalid analytics event';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_session_hash, 0));
 if (select count(*) from public.analytics_events where session_hash = p_session_hash and occurred_at > now() - interval '1 minute') >= 60 then
  raise exception 'analytics rate limit';
 end if;
 insert into public.analytics_events(event_name,session_hash,page_path,language,device_category)
 values(p_event_name,p_session_hash,'/',p_language,p_device_category);
end $$;

create or replace function public.get_admin_analytics(p_days integer default 30)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
 if not public.admin_is_authorized() then raise insufficient_privilege using message = 'admin authorization required'; end if;
 if p_days is null or p_days < 1 or p_days > 90 then raise invalid_parameter_value using message = 'invalid analytics range'; end if;
 select jsonb_build_object(
  'totalEvents', count(*),
  'sessions', count(distinct session_hash),
  'eventCounts', coalesce((select jsonb_object_agg(event_name,n) from (select event_name,count(*) n from public.analytics_events where occurred_at >= now()-make_interval(days=>p_days) group by event_name) x),'{}'::jsonb),
  'languages', coalesce((select jsonb_object_agg(language,n) from (select language,count(*) n from public.analytics_events where occurred_at >= now()-make_interval(days=>p_days) group by language) x),'{}'::jsonb),
  'devices', coalesce((select jsonb_object_agg(device_category,n) from (select device_category,count(*) n from public.analytics_events where occurred_at >= now()-make_interval(days=>p_days) group by device_category) x),'{}'::jsonb),
  'dailyActivity', coalesce((select jsonb_object_agg(activity_day,n) from (select to_char(occurred_at at time zone 'UTC','YYYY-MM-DD') as activity_day,count(*) n from public.analytics_events where occurred_at >= now()-make_interval(days=>p_days) group by activity_day) x),'{}'::jsonb)
 ) into result from public.analytics_events where occurred_at >= now()-make_interval(days=>p_days);
 return result;
end $$;
revoke all on function public.get_admin_analytics(integer) from public, anon;
grant execute on function public.get_admin_analytics(integer) to authenticated;
-- Retention is scheduled explicitly by the operator; no extension is assumed.


-- Use an existing pg_cron installation without assuming extension availability.
do $$
begin
 if exists(select 1 from pg_catalog.pg_extension where extname = 'pg_cron') then
  perform cron.schedule('halalcheck-analytics-retention', '17 3 * * *', 'select public.purge_old_analytics_events()');
 else
  raise notice 'Schedule daily select public.purge_old_analytics_events() using a privileged maintenance job; pg_cron is unavailable';
 end if;
end $$;
