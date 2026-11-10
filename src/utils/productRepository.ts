import type { Product } from '../models/productModel';
export type LookupResult = { status: 'verified'; product: Product } | { status: 'identity-mismatch'; scannedBarcode: string; returnedBarcode?: unknown; product?: Product } | { status: 'invalid-barcode' | 'not-found' | 'lookup-failed' | 'malformed-data'; scannedBarcode?: string };
export const productRepository = (() => {
  const cacheKey = 'halalcheck-products-v2';
  const catalog = window.productCatalog;
  const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
  const isProduct = (value: unknown): value is Product => {
    if (!isRecord(value)) return false;
    return ['scannedBarcode', 'returnedBarcode', 'productName', 'brand', 'ingredientsRaw', 'ingredientDataSource', 'dataQuality', 'lastUpdated', 'certification'].every(key => typeof value[key] === 'string')
      && Array.isArray(value.ingredients) && value.ingredients.every(item => isRecord(item) && typeof item.originalText === 'string' && typeof item.source === 'string' && typeof item.confidence === 'number');
  };
  const readCache = (): Record<string, Product> => {
    try {
      const cached: unknown = JSON.parse(localStorage.getItem(cacheKey) || '{}');
      if (!isRecord(cached) || cached.version !== window.productModel.CACHE_VERSION || !isRecord(cached.products)) return {};
      return Object.fromEntries(Object.entries(cached.products).filter((entry): entry is [string, Product] => isProduct(entry[1])));
    } catch { return {}; }
  };
  const writeCache = (products: Record<string, Product>) => { try { localStorage.setItem(cacheKey, JSON.stringify({ version: window.productModel.CACHE_VERSION, products })); } catch { /* Optional cache. */ } };
  const getByBarcode = (scannedBarcode: unknown): LookupResult => {
    if (!window.productModel.isValidBarcode(scannedBarcode)) return { status: 'invalid-barcode' };
    const normalized = window.productModel.normalizeBarcode(scannedBarcode);
    const canonical = window.productModel.canonicalBarcode(normalized);
    const entry = readCache()[canonical];
    const age = entry ? Date.now() - Date.parse(entry.lastUpdated) : NaN;
    const cached = entry && age >= 0 && age < 86400000 ? entry : null;
    const product = cached || catalog.find(item => window.productModel.canonicalBarcode(item.returnedBarcode) === canonical);
    if (!product) return { status: 'not-found', scannedBarcode: normalized };
    if (window.productModel.canonicalBarcode(product.returnedBarcode) !== canonical) return { status: 'identity-mismatch', scannedBarcode: normalized, product };
    return { status: 'verified', product: { ...product, scannedBarcode: normalized } };
  };
  const save = (product: Product) => {
    const products = readCache();
    products[window.productModel.canonicalBarcode(product.returnedBarcode)] = product;
    const keys = Object.keys(products);
    for (const key of keys.slice(0, Math.max(0, keys.length - 100))) delete products[key];
    writeCache(products);
  };
  const reanalyze = (product: Product): Product => {
    const refreshed = { ...product, lastUpdated: new Date().toISOString(), dataQuality: `${product.dataQuality}; reanalysed` };
    save(refreshed); return refreshed;
  };
  const validateReturnedProduct = (scannedBarcode: string, returnedProduct: unknown): LookupResult => window.productModel.isValidBarcode(scannedBarcode) && isProduct(returnedProduct) && window.productModel.isValidBarcode(returnedProduct.returnedBarcode) && window.productModel.canonicalBarcode(scannedBarcode) === window.productModel.canonicalBarcode(returnedProduct.returnedBarcode) ? { status: 'verified', product: returnedProduct } : { status: 'identity-mismatch', scannedBarcode, returnedBarcode: isRecord(returnedProduct) ? returnedProduct.returnedBarcode : undefined };
  const pending = new Map<string, Promise<LookupResult>>();
  const lookup = async (barcode: string, { fetcher = window.fetch.bind(window), timeoutMs = 6000 }: { fetcher?: typeof fetch; timeoutMs?: number } = {}): Promise<LookupResult> => {
    const local = getByBarcode(barcode);
    if (local.status !== 'not-found') return local;
    const key = window.productModel.canonicalBarcode(barcode);
    const existing = pending.get(key); if (existing) return existing;
    const request = (async (): Promise<LookupResult> => {
      for (let attempt = 0; attempt < 2; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const response = await fetcher(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}?fields=code,product_name,brands,ingredients_text,last_modified_t`, { signal: controller.signal, credentials: 'omit' });
          if (response.status === 404) return { status: 'not-found' };
          if (!response.ok) { if (response.status < 500) return { status: 'lookup-failed' }; throw new Error('Product service unavailable'); }
          const body: unknown = await response.json();
          if (!isRecord(body)) return { status: 'malformed-data' };
          if (body.status === 0) return { status: 'not-found' };
          const raw = body.product;
          if (!isRecord(raw) || typeof raw.code !== 'string' || (raw.ingredients_text !== undefined && typeof raw.ingredients_text !== 'string')) return { status: 'malformed-data' };
          const ingredients = typeof raw.ingredients_text === 'string' ? raw.ingredients_text.slice(0, 10000) : '';
          const product = window.productModel.createProduct({ scannedBarcode: barcode, returnedBarcode: raw.code, productName: typeof raw.product_name === 'string' ? raw.product_name.slice(0, 200) : 'Unnamed product', brand: typeof raw.brands === 'string' ? raw.brands.slice(0, 200) : 'Unknown brand', ingredientsRaw: ingredients, ingredientDataSource: 'Open Food Facts', dataQuality: ingredients ? 'Community data; verify current packaging' : 'missing ingredients', lastUpdated: new Date().toISOString() });
          const verified = validateReturnedProduct(barcode, product);
          if (verified.status === 'verified') save(product);
          return verified;
        } catch { if (attempt === 1) return { status: 'lookup-failed' }; }
        finally { clearTimeout(timer); }
      }
      return { status: 'lookup-failed' };
    })();
    pending.set(key, request);
    try { return await request; } finally { pending.delete(key); }
  };
  return { getByBarcode, lookup, save, reanalyze, validateReturnedProduct };
})();
window.productRepository = productRepository;
