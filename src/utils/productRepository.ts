import type { Product } from '../models/productModel';
import { fetchProduct, isProduct, isOffProduct, record, PRODUCT_TTL, type LookupResult } from '../services/openFoodFacts';
import { barcodeIdentity, isRetailBarcode, sameBarcode } from '../lib/barcode';
export type { LookupResult } from '../services/openFoodFacts';
export const productRepository = (() => {
    const cacheKey = 'halalcheck-off-products-v1', pending = new Map<string, Promise<LookupResult>>();
    let blockedUntil = 0;
    const readCache = (legacy = false): Record<string, Product> => { try {
        const raw: unknown = JSON.parse(localStorage.getItem(cacheKey) || '{}');
        if (!record(raw) || raw.version !== 1 || !record(raw.products) || !legacy && raw.catalogueGeneration !== 'italy-v1')
            return {};
        return Object.fromEntries(Object.entries(raw.products).filter((entry): entry is [
            string,
            Product
        ] => isOffProduct(entry[1])).map(([key, product]) => [key, { ...product, certification: 'not-verified' }]));
    }
    catch {
        return {};
    } };
    const keyFor = (barcode: string, language: string) => barcodeIdentity(barcode) + ':' + language;
    const save = (product: Product, language = 'en') => { if (!isOffProduct(product))
        return; const products = readCache(); products[keyFor(product.scannedBarcode, language)] = product; const ordered = Object.entries(products).sort(([, a], [, b]) => Date.parse(b.lastUpdated) - Date.parse(a.lastUpdated)).slice(0, 100); try {
        localStorage.setItem(cacheKey, JSON.stringify({ version: 1, catalogueGeneration: 'italy-v1', products: Object.fromEntries(ordered) }));
    }
    catch { /* The optional product cache may be unavailable or full. */ } };
    const validateReturnedProduct = (scannedBarcode: string, returnedProduct: unknown): LookupResult => isProduct(returnedProduct) && sameBarcode(scannedBarcode, returnedProduct.returnedBarcode) ? { status: 'verified', product: { ...returnedProduct, scannedBarcode } } : { status: 'identity-mismatch', scannedBarcode, returnedBarcode: record(returnedProduct) ? returnedProduct.returnedBarcode : undefined };
    const getByBarcode = (barcode: unknown, language = 'en'): LookupResult => { if (!isRetailBarcode(barcode))
        return { status: 'invalid-barcode' }; const code = String(barcode).trim(), p = readCache()[keyFor(code, language)]; if (!p)
        return { status: 'not-found' }; const age = Date.now() - Date.parse(p.lastUpdated); return age >= 0 && age < PRODUCT_TTL ? validateReturnedProduct(code, p) : { status: 'not-found' }; };
    const fallback = (barcode: string, language: string): LookupResult => { const cached = readCache(true)[keyFor(barcode, language)], age = cached ? Date.now() - Date.parse(cached.lastUpdated) : NaN; const product = cached && age >= 0 && age < 7 * 86400000 ? cached : window.productCatalog.find(p => sameBarcode(barcode, p.returnedBarcode)); return product ? { status: 'verified', product: { ...product, scannedBarcode: barcode }, stale: true } : { status: 'offline' }; };
    const lookup = async (barcode: string, { fetcher = window.fetch.bind(window), timeoutMs = 15000, language = 'en', online = typeof navigator === 'undefined' || navigator.onLine }: {
        fetcher?: typeof fetch;
        timeoutMs?: number;
        language?: string;
        online?: boolean;
    } = {}): Promise<LookupResult> => {
        if (!isRetailBarcode(barcode))
            return { status: 'invalid-barcode' };
        barcode = barcode.trim();
        if (!online)
            return fallback(barcode, language);
        const local = getByBarcode(barcode, language);
        if (local.status === 'verified')
            return local;
        if (blockedUntil > Date.now())
            return { status: 'rate-limited', retryAt: blockedUntil };
        const key = keyFor(barcode, language), existing = pending.get(key);
        if (existing)
            return existing;
        const request = (async () => { const result = await fetchProduct(barcode, { fetcher, timeoutMs, language, transport: 'proxy' }); if (result.status === 'verified')
            save(result.product, language);
        else if (result.status === 'rate-limited' || result.status === 'service-unavailable' && result.retryAt)
            blockedUntil = Math.max(blockedUntil, result.retryAt || Date.now() + 60000);
        else if (result.status === 'offline') {
            const saved = fallback(barcode, language);
            if (saved.status === 'verified')
                return saved;
        } return result; })();
        pending.set(key, request);
        try {
            return await request;
        }
        finally {
            pending.delete(key);
        }
    };
    const reanalyze = (product: Product): Product => ({ ...product });
    return { getByBarcode, lookup, save, reanalyze, validateReturnedProduct };
})();
window.productRepository = productRepository;
