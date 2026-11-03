import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: cors });
  try {
    const body = await request.json();
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { error } = await supabase.rpc("insert_analytics_event", {
      p_event_name: body.eventName, p_session_hash: body.sessionHash, p_page_path: body.pagePath,
      p_language: body.language, p_device_category: body.deviceCategory, p_referrer_host: body.referrerHost ?? null,
      p_country_code: body.countryCode ?? null, p_metadata: body.metadata ?? {}
    });
    if (error) throw error;
    return new Response(JSON.stringify({ accepted: true }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch {
    return new Response(JSON.stringify({ accepted: false }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
