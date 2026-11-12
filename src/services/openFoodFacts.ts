import type { Product, IngredientEvidenceInfo } from '../models/productModel';
import { normalizeBarcode, isRetailBarcode, sameBarcode } from '../lib/barcode';
import { splitIngredientLabel } from '../utils/ingredientParsing';
export const OFF_VERSION = '3.6';
export const OFF_USER_AGENT = 'HalalCheck/2.0 (https://github.com/abdullah37-oss/HALAL-CHECK)';
export const PRODUCT_TTL = 60 * 60 * 1000;
export const SUPPORTED_LANGUAGES = ['en', 'it', 'ar', 'ur', 'hi', 'bn', 'fr', 'de', 'es', 'tr', 'ms', 'id'];
export type LookupResult = {
    status: 'verified';
    product: Product;
    stale?: boolean;
} | {
    status: 'identity-mismatch';
    scannedBarcode: string;
    returnedBarcode?: unknown;
} | {
    status: 'invalid-barcode' | 'not-found' | 'lookup-failed' | 'malformed-data' | 'timeout' | 'offline' | 'rate-limited' | 'service-unavailable';
    retryAt?: number;
};
export const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown, max = 10000): string => typeof value === 'string' ? value.trim().slice(0, max) : '';
const list = (value: unknown): string[] => Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string').slice(0, 100).map(v => v.slice(0, 200)) : [];
export function safeProductImage(value: unknown): string | undefined { try {
    const u = new URL(text(value, 2000));
    return u.protocol === 'https:' && u.hostname === 'images.openfoodfacts.org' && !u.username && !u.password && !u.search && !u.hash && /^\/images\/products\/[\d/]+\/[a-z0-9_.-]+$/i.test(u.pathname) ? u.href : undefined;
}
catch {
    return undefined;
} }
export function isProduct(value: unknown): value is Product {
    if (!record(value) || !['scannedBarcode', 'returnedBarcode', 'productName', 'brand', 'ingredientsRaw', 'ingredientDataSource', 'dataQuality', 'lastUpdated', 'certification'].every(k => typeof value[k] === 'string' && String(value[k]).length <= 10000))
        return false;
    return Array.isArray(value.ingredients) && value.ingredients.length <= 200 && value.ingredients.every(i => record(i) && typeof i.originalText === 'string' && i.originalText.length <= 10000 && typeof i.normalizedName === 'string' && typeof i.id === 'string' && typeof i.source === 'string' && typeof i.confidence === 'number' && Number.isFinite(i.confidence) && i.confidence >= 0 && i.confidence <= 1);
}
export function isOffProduct(value: unknown): value is Product {
    if (!isProduct(value) || value.ingredientDataSource !== 'Open Food Facts' || !sameBarcode(value.scannedBarcode, value.returnedBarcode) || !Number.isFinite(Date.parse(value.lastUpdated)))
        return false;
    if (value.catalogue !== undefined && (!record(value.catalogue) || !['VERIFIED', 'REVIEW_REQUIRED', 'INCOMPLETE', 'REJECTED'].includes(String(value.catalogue.status)) || typeof value.catalogue.stale !== 'boolean' || !/^[a-f0-9]{64}$/.test(String(value.catalogue.ingredientHash)) || !/^\d{4}\.\d{2}\.\d{2}$/.test(String(value.catalogue.policyVersion)) || (value.catalogue.status !== 'VERIFIED' || value.catalogue.stale) && (value.ingredientsRaw !== '' || value.ingredients.length !== 0))) return false;
    const evidence = value.ingredientEvidence;
    return record(evidence) && ['complete', 'partial', 'missing', 'conflicting'].includes(String(evidence.state)) && ['label-text', 'structured', 'tags-only', 'none'].includes(String(evidence.kind)) && (evidence.language === null || typeof evidence.language === 'string' && /^[a-z]{2}$/.test(evidence.language)) && (evidence.state !== 'complete' || evidence.kind === 'label-text' && !!value.ingredientsRaw && value.ingredients.length > 0) && (value.sourceLabels === undefined || Array.isArray(value.sourceLabels) && value.sourceLabels.length <= 100 && value.sourceLabels.every(v => typeof v === 'string' && v.length <= 200));
}
function structuredText(items: unknown, depth = 0): string[] { if (!Array.isArray(items) || depth > 3)
    return []; return items.slice(0, 60).flatMap(item => record(item) ? [text(item.text, 500), ...structuredText(item.ingredients, depth + 1)].filter(Boolean) : []); }
export function mapOpenFoodFacts(body: unknown, barcode: string, language = 'en', now = Date.now()): LookupResult {
    if (!isRetailBarcode(barcode))
        return { status: 'invalid-barcode' };
    if (!record(body))
        return { status: 'malformed-data' };
    if (body.status === 0 || body.status === 'failure' && (!body.product || list(body.errors).some(v => v.includes('not_found'))))
        return { status: 'not-found' };
    if (!record(body.product))
        return { status: 'malformed-data' };
    const raw = body.product;
    if (body.schema === 'halalcheck.off.v1') {
        if (!isOffProduct(raw))
            return { status: 'malformed-data' };
        if (!sameBarcode(barcode, raw.returnedBarcode))
            return { status: 'identity-mismatch', scannedBarcode: barcode, returnedBarcode: raw.returnedBarcode };
        return { status: 'verified', product: { ...raw, scannedBarcode: barcode, certification: 'not-verified', imageUrl: safeProductImage(raw.imageUrl) } };
    }
    if (typeof raw.code !== 'string')
        return { status: 'malformed-data' };
    if (!sameBarcode(barcode, raw.code))
        return { status: 'identity-mismatch', scannedBarcode: barcode, returnedBarcode: raw.code };
    if (raw.ingredients_text !== undefined && typeof raw.ingredients_text !== 'string')
        return { status: 'malformed-data' };
    const preferred = SUPPORTED_LANGUAGES.includes(language) ? language : 'en';
    const sourceLanguage = /^[a-z]{2}$/.test(text(raw.lang, 2)) ? text(raw.lang, 2) : /^[a-z]{2}$/.test(text(raw.lc, 2)) ? text(raw.lc, 2) : null;
    const candidates = [preferred, sourceLanguage, ...SUPPORTED_LANGUAGES].filter((v, index, a): v is string => !!v && a.indexOf(v) === index);
    let ingredientsRaw = '', selectedLanguage: string | null = null, kind: IngredientEvidenceInfo['kind'] = 'none';
    // Prefer a label in the selected UI language, then original-language text, then generic text.
    if (text(raw['ingredients_text_' + preferred])) {
        ingredientsRaw = text(raw['ingredients_text_' + preferred]);
        selectedLanguage = preferred;
    }
    else if (sourceLanguage && text(raw['ingredients_text_' + sourceLanguage])) {
        ingredientsRaw = text(raw['ingredients_text_' + sourceLanguage]);
        selectedLanguage = sourceLanguage;
    }
    else if (text(raw.ingredients_text)) {
        ingredientsRaw = text(raw.ingredients_text);
        selectedLanguage = sourceLanguage;
    }
    else
        for (const lang of candidates)
            if (text(raw['ingredients_text_' + lang])) {
                ingredientsRaw = text(raw['ingredients_text_' + lang]);
                selectedLanguage = lang;
                break;
            }
    if (ingredientsRaw)
        kind = 'label-text';
    const flags = [...list(raw.data_quality_errors_tags), ...list(raw.data_quality_warnings_tags)];
    const partialFlag = flags.some(f => !f.includes('environmental-score') && /ingredients/.test(f) && /missing|incomplete|truncated|percent.*(?:greater|over)|sum.*(?:greater|over)/.test(f));
    let state: IngredientEvidenceInfo['state'] = ingredientsRaw ? 'complete' : 'missing';
    if (ingredientsRaw && (partialFlag || /\.{3}|\u2026/.test(ingredientsRaw) || ingredientsRaw.length >= 10000))
        state = 'partial';
    // A substantially shorter localized list can be an incomplete translation.
    // Compare structure only: never translate, merge, or invent ingredient names.
    const clauseCount = (label: string) => splitIngredientLabel(label).length;
    if (ingredientsRaw && SUPPORTED_LANGUAGES.some(lang => { const other = text(raw['ingredients_text_' + lang]); return other.length > ingredientsRaw.length * 2 && clauseCount(other) >= clauseCount(ingredientsRaw) + 3; }))
        state = 'partial';
    const generic = text(raw.ingredients_text), native = sourceLanguage ? text(raw['ingredients_text_' + sourceLanguage]) : '';
    if (generic && native && (!selectedLanguage || selectedLanguage === sourceLanguage) && generic.toLocaleLowerCase().replace(/\s/g, '') !== native.toLocaleLowerCase().replace(/\s/g, ''))
        state = 'conflicting';
    if (!ingredientsRaw) {
        const pieces = structuredText(raw.ingredients);
        if (pieces.length) {
            ingredientsRaw = pieces.join(', ').slice(0, 10000);
            kind = 'structured';
            state = 'partial';
            selectedLanguage = sourceLanguage;
        }
        else if (list(raw.ingredients_tags).length) {
            kind = 'tags-only';
            state = 'partial';
        }
    }
    const clauses = splitIngredientLabel(ingredientsRaw).map(v => v.trim());
    if (clauses.length > 200) state = 'partial';
    const ingredients = clauses.slice(0, 200).map((originalText, index) => ({ id: 'off:' + index, originalText, normalizedName: originalText.toLowerCase(), source: 'Open Food Facts', confidence: 1, matchedIngredientId: null, assessment: null }));
    const product: Product = { scannedBarcode: normalizeBarcode(barcode), returnedBarcode: raw.code, productName: text(raw['product_name_' + preferred], 200) || text(raw.product_name, 200), brand: text(raw.brands, 200), ingredientsRaw, ingredients, ingredientDataSource: 'Open Food Facts', dataQuality: 'Community product data; verify current packaging', lastUpdated: new Date(now).toISOString(), certification: 'not-verified', ingredientEvidence: { state, kind, language: selectedLanguage }, imageUrl: safeProductImage(raw.image_front_url) || safeProductImage(raw.image_front_small_url), sourceUrl: 'https://world.openfoodfacts.org/product/' + raw.code, sourceLabels: list(raw.labels_tags), upstreamModifiedAt: typeof raw.last_modified_t === 'number' && Number.isFinite(raw.last_modified_t) ? raw.last_modified_t : undefined };
    return { status: 'verified', product };
}
export function retryTime(value: string | null, now = Date.now()): number { if (value && /^\d+$/.test(value))
    return now + Math.min(Number(value), 86400) * 1000; const date = value ? Date.parse(value) : NaN; return Number.isFinite(date) && date > now ? Math.min(date, now + 86400000) : now + 60000; }
export interface FetchOptions {
    fetcher?: typeof fetch;
    timeoutMs?: number;
    language?: string;
    transport?: 'proxy' | 'upstream';
    sleep?: (ms: number) => Promise<void>;
    now?: () => number;
    canRequest?: () => boolean;
}
class InvalidData extends Error {
}
async function boundedJson(response: Response): Promise<unknown> {
    if (!response.body?.getReader)
        return response.json();
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            size += value.byteLength;
            if (size > 1024 * 1024) {
                await reader.cancel();
                throw new InvalidData('Response too large');
            }
            chunks.push(value);
        }
    }
    finally {
        reader.releaseLock();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return JSON.parse(new TextDecoder().decode(bytes));
}
export async function fetchProduct(barcode: string, options: FetchOptions = {}): Promise<LookupResult> {
    if (!isRetailBarcode(barcode))
        return { status: 'invalid-barcode' };
    barcode = normalizeBarcode(barcode);
    const fetcher = options.fetcher || fetch, now = options.now || Date.now, sleep = options.sleep || (ms => new Promise(resolve => setTimeout(resolve, ms))), language = SUPPORTED_LANGUAGES.includes(options.language || '') ? options.language! : 'en';
    const fields = ['code', 'product_name', 'brands', 'lang', 'lc', 'ingredients_text', 'ingredients', 'ingredients_tags', 'data_quality_errors_tags', 'data_quality_warnings_tags', 'last_modified_t', 'image_front_small_url', 'image_front_url', 'labels_tags', ...SUPPORTED_LANGUAGES.flatMap(l => ['ingredients_text_' + l, 'product_name_' + l])];
    const url = options.transport === 'upstream' ? 'https://world.openfoodfacts.org/api/v' + OFF_VERSION + '/product/' + encodeURIComponent(barcode) + '.json?fields=' + fields.join(',') : '/api/products/' + encodeURIComponent(barcode) + '?lang=' + language;
    // Only the server retries upstream. The browser never multiplies proxy retries.
    const maxAttempts = options.transport === 'upstream' ? 2 : 1;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (options.canRequest && !options.canRequest())
            return { status: 'rate-limited', retryAt: now() + 60000 };
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 6000);
        let retry = false;
        try {
            // Same-origin platform access stays on our host. The server never
            // forwards those cookies or any Authorization header to OFF.
            const response = await fetcher(url, { signal: controller.signal, credentials: options.transport === 'upstream' ? 'omit' : 'same-origin', redirect: 'error', headers: options.transport === 'upstream' ? { 'Accept': 'application/json', 'User-Agent': OFF_USER_AGENT } : { 'Accept': 'application/json' } });
            if (response.status === 429)
                return { status: 'rate-limited', retryAt: retryTime(response.headers?.get('retry-after') || null, now()) };
            if (response.status === 404)
                return { status: 'not-found' };
            if (response.status === 503 || response.status >= 500) {
                const retryAfter = response.headers?.get('retry-after');
                if (retryAfter)
                    return { status: 'service-unavailable', retryAt: retryTime(retryAfter, now()) };
                retry = true;
                if (attempt + 1 === maxAttempts)
                    return { status: 'service-unavailable' };
            }
            else if (!response.ok)
                return { status: 'lookup-failed' };
            else {
                const length = Number(response.headers?.get('content-length') || 0);
                if (length > 1024 * 1024)
                    return { status: 'malformed-data' };
                const body: unknown = await boundedJson(response);
                return mapOpenFoodFacts(body, barcode, language, now());
            }
        }
        catch (error) {
            if (error instanceof SyntaxError || error instanceof InvalidData)
                return { status: 'malformed-data' };
            retry = true;
            if (attempt + 1 === maxAttempts)
                return { status: controller.signal.aborted ? 'timeout' : 'offline' };
        }
        finally {
            clearTimeout(timer);
        }
        if (retry)
            await sleep(700 * (2 ** attempt) + Math.floor(Math.random() * 200));
    }
    return { status: 'lookup-failed' };
}
