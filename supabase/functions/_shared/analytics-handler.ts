// Dependency-injected handler: the same validation runs in Edge and isolated QA.
type EventParams = { p_event_name: string; p_session_hash: string; p_page_path: string; p_language: string; p_device_category: string; p_referrer_host: null; p_country_code: null; p_metadata: Record<string, never> };
export function createAnalyticsHandler({ origin, insert }: { origin: string; insert: (params: EventParams) => PromiseLike<{ error: { code?: string } | null }> }) {
  const events = new Set(['page_opened','scan_started','barcode_completed','manual_lookup','lookup_succeeded','lookup_failed','guide_opened','language_changed','pwa_installed','analysis_completed']);
  return async (request: Request) => {
    const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin', 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
    const reply = (status: number, body: { accepted: boolean }) => new Response(JSON.stringify(body), { status, headers });
    if (!origin) return reply(503, { accepted: false });
    if (request.headers.get('Origin') !== origin) return reply(403, { accepted: false });
    if (request.method === 'OPTIONS') return reply(200, { accepted: true });
    if (request.method !== 'POST') return reply(405, { accepted: false });
    try {
      // Bound the stream before parsing, including chunked requests.
      const reader = request.body?.getReader();
      if (!reader) return reply(400, { accepted: false });
      let size = 0; const chunks = [];
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        size += value.byteLength;
        if (size > 4096) { await reader.cancel(); return reply(413, { accepted: false }); }
        chunks.push(value);
      }
      const bytes = new Uint8Array(size); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      const body = JSON.parse(new TextDecoder().decode(bytes));
      if (!body || !events.has(body.eventName) || !/^[A-Za-z0-9]{16,128}$/.test(body.sessionHash || '') || typeof body.sessionHash !== 'string' || !['/', '/index.html'].includes(body.pagePath) || !/^[a-z]{2}$/.test(body.language || '') || !['mobile','tablet','desktop','unknown'].includes(body.deviceCategory) || (body.metadata !== undefined && (body.metadata === null || Array.isArray(body.metadata) || typeof body.metadata !== 'object' || Object.keys(body.metadata).length))) return reply(400, { accepted: false });
      const { error } = await insert({ p_event_name: body.eventName, p_session_hash: body.sessionHash, p_page_path: '/', p_language: body.language, p_device_category: body.deviceCategory, p_referrer_host: null, p_country_code: null, p_metadata: {} });
      if (error) return reply(error.code === 'P0001' ? 429 : 503, { accepted: false });
      return reply(200, { accepted: true });
    } catch { return reply(400, { accepted: false }); }
  };
}
