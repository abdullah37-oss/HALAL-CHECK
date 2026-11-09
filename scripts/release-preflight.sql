-- Read-only release inventory. No user identifiers, credentials or event payloads.
select jsonb_build_object(
 'appliedMigrations', (select jsonb_agg(version order by version) from supabase_migrations.schema_migrations),
 'activeAdminCount', (select count(*) from public.admin_users a join auth.users u on u.id=a.user_id where a.is_active),
 'rlsEnabled', (select jsonb_object_agg(c.relname,c.relrowsecurity) from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('analytics_events','admin_users')),
 'anonymousIngestionAllowed', has_function_privilege('anon','public.insert_analytics_event(text,text,text,text,text,text,text,jsonb)','execute'),
 'authenticatedIngestionAllowed', has_function_privilege('authenticated','public.insert_analytics_event(text,text,text,text,text,text,text,jsonb)','execute'),
 'serviceRoleIngestionAllowed', has_function_privilege('service_role','public.insert_analytics_event(text,text,text,text,text,text,text,jsonb)','execute'),
 'anonymousReportingAllowed', has_function_privilege('anon','public.get_admin_analytics(integer)','execute'),
 'pgCronInstalled', exists(select 1 from pg_catalog.pg_extension where extname='pg_cron')
) as release_inventory;
