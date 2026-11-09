import { createClient } from "https://esm.sh/@supabase/supabase-js@2.119.0";
import { createAnalyticsHandler } from "../_shared/analytics-handler.ts";
const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
Deno.serve(createAnalyticsHandler({ origin: Deno.env.get('HALALCHECK_WEB_ORIGIN') ?? '', insert: (params) => client.rpc('insert_analytics_event', params) }));
