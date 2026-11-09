-- Separate owner-approved production maintenance change, not applied by db push.
-- Supabase supports pg_cron; the read-only preflight confirmed it is available.
-- Do not run until the analytics boundary has been applied and owner approval recorded.
begin;
do $$
begin
 if has_function_privilege('anon','public.insert_analytics_event(text,text,text,text,text,text,text,jsonb)','execute') then
  raise exception 'Apply the analytics boundary before scheduling retention';
 end if;
end $$;
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('halalcheck-analytics-retention','17 3 * * *','select public.purge_old_analytics_events()');
commit;
-- The job removes records older than 30 days at 03:17 UTC. No immediate purge here.
