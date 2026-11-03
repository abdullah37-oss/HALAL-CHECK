import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin": "https://YOUR-VERCEL-DOMAIN.vercel.app", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  const auth = request.headers.get("Authorization");
  if (!auth) return new Response("Unauthorized", { status: 401, headers: cors });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: authorized } = await admin.rpc("admin_is_authorized");
  if (!authorized) return new Response("Forbidden", { status: 403, headers: cors });
  const url = new URL(request.url);
  const days = Math.min(Math.max(Number(url.searchParams.get("days") || 90), 1), 90);
  const { data, error } = await admin.from("analytics_events").select("event_name,occurred_at,page_path,language,device_category,referrer_host,country_code").gte("occurred_at", new Date(Date.now() - days * 86400000).toISOString());
  if (error) return new Response("Unable to load statistics", { status: 500, headers: cors });
  return new Response(JSON.stringify({ events: data ?? [], retentionDays: 365, rawEventRetentionDays: 30 }), { headers: { ...cors, "Content-Type": "application/json" } });
});
