import { fetchProduct, PRODUCT_TTL, SUPPORTED_LANGUAGES, type LookupResult } from '../services/openFoodFacts';
import { isRetailBarcode, barcodeIdentity, sameBarcode } from '../lib/barcode';
import { createCatalogueLookup } from './catalogue';
import type { Product } from '../models/productModel';
interface Entry {
    result: LookupResult;
    expires: number;
}
export function createProductHandler({ fetcher = fetch, now = Date.now, sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)), catalogueLookup = createCatalogueLookup() }: {
    fetcher?: typeof fetch;
    now?: () => number;
    sleep?: (ms: number) => Promise<void>;
    catalogueLookup?: (barcode: string) => Product | null;
} = {}) {
    const cache = new Map<string, Entry>(), pending = new Map<string, Promise<LookupResult>>();
    let upstreamTimes: number[] = [], ingressTimes: number[] = [], blockedUntil = 0;
    const budget = () => { upstreamTimes = upstreamTimes.filter(t => now() - t < 60000); if (upstreamTimes.length >= 10)
        return false; upstreamTimes.push(now()); return true; };
    const send = (status: number, payload: unknown, headers: Record<string, string> = {}) => new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers } });
    return async function handler(request: Request): Promise<Response> {
        const url = new URL(request.url), match = url.pathname.match(/^\/api\/products\/(\d{8}|\d{12,14})\/?$/);
        if (request.method !== 'GET')
            return send(405, { error: 'method-not-allowed' }, { Allow: 'GET' });
        // Vercel's dynamic routing also binds the path segment as a query value.
        // Accept that binding only when it exactly matches the requested path.
        const bindings = url.searchParams.getAll('barcode');
        const functionPath = ['/api/products/[barcode]', '/api/products/%5Bbarcode%5D'].includes(url.pathname);
        const barcode = match?.[1] || (functionPath && bindings.length === 1 ? bindings[0] : '');
        if (!isRetailBarcode(barcode) || [...url.searchParams.keys()].some(k => k !== 'lang' && k !== 'barcode') || url.searchParams.getAll('lang').length > 1 || bindings.length > 1 || bindings.length === 1 && bindings[0] !== barcode)
            return send(400, { error: 'invalid-request' });
        const origin = request.headers.get('origin');
        if (request.headers.get('sec-fetch-site') === 'cross-site' || origin && origin !== url.origin)
            return send(403, { error: 'cross-origin-request-denied' });
        const language = url.searchParams.get('lang') || 'en';
        if (!SUPPORTED_LANGUAGES.includes(language))
            return send(400, { error: 'invalid-language' });
        ingressTimes = ingressTimes.filter(t => now() - t < 60000);
        if (ingressTimes.length >= 60)
            return send(429, { error: 'rate-limited' }, { 'Retry-After': '60' });
        ingressTimes.push(now());
        // Reviewed, current packaging stays authoritative. Research records may
        // fall back to a fresh OFF lookup, but are never themselves promoted.
        let local: Product | null = null;
        const fallback = () => send(200, { schema: 'halalcheck.off.v1', product: local });
        try {
            local = catalogueLookup(barcode);
            if (local && (!sameBarcode(barcode, local.returnedBarcode) || !sameBarcode(barcode, local.scannedBarcode))) return send(503, { error: 'catalogue-identity-mismatch' });
            if (local?.catalogue?.status === 'REJECTED' || local?.catalogue?.status === 'VERIFIED' && !local.catalogue.stale) return fallback();
        } catch { return send(503, { error: 'service-unavailable' }, { 'Retry-After': '60' }); }
        const key = barcodeIdentity(barcode) + ':' + language;
        for (const [k, v] of cache)
            if (v.expires <= now())
                cache.delete(k);
        const stored = cache.get(key);
        let result: LookupResult;
        if (stored)
            result = stored.result;
        else {
            if (blockedUntil > now())
                return local ? fallback() : send(429, { error: 'rate-limited' }, { 'Retry-After': String(Math.max(1, Math.ceil((blockedUntil - now()) / 1000))) });
            let work = pending.get(key);
            if (!work) {
                if (pending.size >= 8)
                    return local ? fallback() : send(503, { error: 'service-unavailable' }, { 'Retry-After': '10' });
                work = fetchProduct(barcode, { fetcher, language, transport: 'upstream', now, sleep, canRequest: budget });
                pending.set(key, work);
            }
            try {
                result = await work;
            }
            finally {
                pending.delete(key);
            }
            if (result.status === 'rate-limited' || result.status === 'service-unavailable' && result.retryAt)
                blockedUntil = Math.max(blockedUntil, result.retryAt || now() + 60000);
            if (result.status === 'verified' || result.status === 'not-found') {
                cache.set(key, { result, expires: now() + (result.status === 'verified' ? PRODUCT_TTL : 60000) });
                while (cache.size > 100)
                    cache.delete(cache.keys().next().value!);
            }
        }
        if (result.status === 'verified')
            return send(200, { schema: 'halalcheck.off.v1', product: { ...result.product, scannedBarcode: barcode, certification: 'not-verified' } }, { 'Cache-Control': 'public, max-age=0, s-maxage=3600' });
        // Integrity failures stay explicit. Availability failures can return
        // only the catalogue adapter's withheld/uncertain evidence.
        if (local && !['identity-mismatch', 'malformed-data'].includes(result.status)) return fallback();
        if (result.status === 'not-found')
            return send(404, { status: 'not-found' }, { 'Cache-Control': 'public, max-age=0, s-maxage=60' });
        const status = result.status === 'rate-limited' ? 429 : result.status === 'timeout' ? 504 : result.status === 'service-unavailable' || result.status === 'offline' ? 503 : 502;
        const retryAt = 'retryAt' in result ? result.retryAt : undefined;
        return send(status, { error: result.status }, retryAt ? { 'Retry-After': String(Math.max(1, Math.ceil((retryAt - now()) / 1000))) } : {});
    };
}
