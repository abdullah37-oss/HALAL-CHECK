window.productRepository = (() => {
  const cacheKey = 'halalcheck-products-v2';
  const catalog = window.productCatalog;
  const readCache = () => {
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || '{}');
      return cached.version === window.productModel.CACHE_VERSION && cached.products ? cached.products : {};
    } catch {
      return {};
    }
  };
  const writeCache = (products) => { try { localStorage.setItem(cacheKey, JSON.stringify({ version: window.productModel.CACHE_VERSION, products })); } catch { /* Cache is optional when storage is full. */ } };
  const getByBarcode = (scannedBarcode) => {
    if (!window.productModel.isValidBarcode(scannedBarcode)) return { status: 'invalid-barcode' };
    const normalized = window.productModel.normalizeBarcode(scannedBarcode);
    const canonical = window.productModel.canonicalBarcode(normalized);
    const entry = readCache()[canonical];
    const cached = entry && Date.now() - Date.parse(entry.lastUpdated) < 86400000 ? entry : null;
    const product = cached || catalog.find((item) => window.productModel.canonicalBarcode(item.returnedBarcode) === canonical);
    if (!product) return { status: 'not-found', scannedBarcode: normalized };
    if (window.productModel.canonicalBarcode(product.returnedBarcode) !== canonical) return { status: 'identity-mismatch', scannedBarcode: normalized, product };
    return { status: 'verified', product };
  };
  const save = (product) => {
    const products = readCache();
    products[window.productModel.canonicalBarcode(product.returnedBarcode)] = product;
    const keys = Object.keys(products);
    for (const key of keys.slice(0, Math.max(0, keys.length - 100))) delete products[key];
    writeCache(products);
  };
  const reanalyze = (product) => {
    const refreshed = { ...product, lastUpdated: new Date().toISOString(), dataQuality: `${product.dataQuality}; reanalysed` };
    save(refreshed);
    return refreshed;
  };
  const validateReturnedProduct = (scannedBarcode, returnedProduct) => window.productModel.isValidBarcode(scannedBarcode) && returnedProduct && window.productModel.isValidBarcode(returnedProduct.returnedBarcode) && window.productModel.canonicalBarcode(scannedBarcode) === window.productModel.canonicalBarcode(returnedProduct.returnedBarcode) ? { status: 'verified', product: returnedProduct } : { status: 'identity-mismatch', scannedBarcode, returnedBarcode: returnedProduct?.returnedBarcode };
  const pending = new Map();
  const lookup = async (barcode, { fetcher = window.fetch.bind(window), timeoutMs = 6000 } = {}) => {
    const local = getByBarcode(barcode);
    if (local.status !== 'not-found') return local;
    if (pending.has(barcode)) return pending.get(barcode);
    const request = (async () => {
      for (let attempt = 0; attempt < 2; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const response = await fetcher(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}?fields=code,product_name,brands,ingredients_text,last_modified_t`, { signal: controller.signal, credentials: 'omit' });
          if (response.status === 404) return { status: 'not-found' };
          if (!response.ok) { if (response.status < 500) return { status: 'lookup-failed' }; throw new Error('Product service unavailable'); }
          const body = await response.json();
          if (body.status === 0) return { status: 'not-found' };
          const raw = body.product;
          if (!raw || typeof raw.code !== 'string' || (raw.ingredients_text !== undefined && typeof raw.ingredients_text !== 'string')) return { status: 'malformed-data' };
          const product = window.productModel.createProduct({ scannedBarcode: barcode, returnedBarcode: raw.code, productName: typeof raw.product_name === 'string' ? raw.product_name.slice(0, 200) : 'Unnamed product', brand: typeof raw.brands === 'string' ? raw.brands.slice(0, 200) : 'Unknown brand', ingredientsRaw: (raw.ingredients_text || '').slice(0, 10000), ingredientDataSource: 'Open Food Facts', dataQuality: raw.ingredients_text ? 'Community data; verify current packaging' : 'missing ingredients', lastUpdated: new Date().toISOString() });
          const verified = validateReturnedProduct(barcode, product);
          if (verified.status === 'verified') save(product);
          return verified;
        } catch { if (attempt === 1) return { status: 'lookup-failed' }; }
        finally { clearTimeout(timer); }
      }
    })();
    pending.set(barcode, request);
    try { return await request; } finally { pending.delete(barcode); }
  };
  return { getByBarcode, lookup, save, reanalyze, validateReturnedProduct };
})();
