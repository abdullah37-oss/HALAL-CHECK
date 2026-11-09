import { createClient } from "https://esm.sh/@supabase/supabase-js@2.119.0";
const origin = Deno.env.get("HALALCHECK_ADMIN_ORIGIN") ?? "";
const cors = { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "GET, OPTIONS", "Vary": "Origin", "Cache-Control": "no-store" };
Deno.serve(async (request) => {
  try {
  if (!origin) return new Response("Server origin is not configured", { status: 500 });
  if (request.headers.get("Origin") !== origin) return new Response("Forbidden", { status: 403, headers: cors });
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "GET") return new Response("Method not allowed", { status: 405, headers: cors });
  const auth = request.headers.get("Authorization");
  if (!auth || !/^Bearer\s+\S+$/i.test(auth)) return new Response("Unauthorized", { status: 401, headers: cors });
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: { user }, error: userError } = await admin.auth.getUser(token);
  if (userError || !user) return new Response("Unauthorized", { status: 401, headers: cors });
  const url = new URL(request.url);
  const days = Number(url.searchParams.get("days") || 30);
  if (!Number.isInteger(days) || days < 1 || days > 90) return new Response("Invalid range", { status: 400, headers: cors });
  const { data, error } = await admin.rpc("get_admin_analytics", { p_days: days });
  if (error?.code === "42501") return new Response("Forbidden", { status: 403, headers: cors });
  if (error) return new Response("Unable to load statistics", { status: 500, headers: cors });
  return new Response(JSON.stringify({ ...(data ?? { totalEvents: 0, eventCounts: {}, dailyActivity: {} }), retentionDays: 30 }), { headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });
  } catch { return new Response("Unable to load statistics", { status: 503, headers: { ...cors, "Cache-Control": "no-store" } }); }
});
