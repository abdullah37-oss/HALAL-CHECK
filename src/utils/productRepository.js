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
  const writeCache = (products) => localStorage.setItem(cacheKey, JSON.stringify({ version: window.productModel.CACHE_VERSION, products }));
  const getByBarcode = (scannedBarcode) => {
    const normalized = window.productModel.normalizeBarcode(scannedBarcode);
    const canonical = window.productModel.canonicalBarcode(normalized);
    const cached = readCache()[canonical];
    const product = cached || catalog.find((item) => window.productModel.canonicalBarcode(item.returnedBarcode) === canonical);
    if (!product) return { status: 'not-found', scannedBarcode: normalized };
    if (window.productModel.canonicalBarcode(product.returnedBarcode) !== canonical) return { status: 'identity-mismatch', scannedBarcode: normalized, product };
    return { status: 'verified', product };
  };
  const save = (product) => {
    const products = readCache();
    products[window.productModel.canonicalBarcode(product.returnedBarcode)] = product;
    writeCache(products);
  };
  const reanalyze = (product) => {
    const refreshed = { ...product, lastUpdated: new Date().toISOString(), dataQuality: `${product.dataQuality}; reanalysed` };
    save(refreshed);
    return refreshed;
  };
  const validateReturnedProduct = (scannedBarcode, returnedProduct) => window.productModel.canonicalBarcode(scannedBarcode) === window.productModel.canonicalBarcode(returnedProduct.returnedBarcode) ? { status: 'verified', product: returnedProduct } : { status: 'identity-mismatch', scannedBarcode, returnedBarcode: returnedProduct.returnedBarcode };
  return { getByBarcode, save, reanalyze, validateReturnedProduct };
})();
