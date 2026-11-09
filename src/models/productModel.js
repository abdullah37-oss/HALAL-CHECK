window.productModel = (() => {
  const CACHE_VERSION = 2;
  const normalizeBarcode = (value) => /^\d+$/.test(String(value || '').trim()) ? String(value).trim() : '';
  const isValidBarcode = (value) => /^(?:\d{8}|\d{12,14})$/.test(normalizeBarcode(value));
  const canonicalBarcode = (value) => normalizeBarcode(value).replace(/^0+(?=\d)/, '');
  const createIngredient = (originalText, source, confidence = 1) => ({
    id: `${source}:${originalText.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    originalText,
    normalizedName: originalText.toLowerCase().trim(),
    source,
    confidence,
    matchedIngredientId: null,
    assessment: null
  });
  const createProduct = ({ scannedBarcode, returnedBarcode, productName, brand, ingredientsRaw, ingredientDataSource, dataQuality, lastUpdated, ingredients, certification = 'not-verified' }) => ({
    scannedBarcode: normalizeBarcode(scannedBarcode),
    returnedBarcode: normalizeBarcode(returnedBarcode),
    productName,
    brand,
    ingredientsRaw,
    ingredients: ingredients || String(ingredientsRaw || '').split(/[,;\n]+/).map((text) => text.trim()).filter(Boolean).map((text) => createIngredient(text, ingredientDataSource)),
    ingredientDataSource,
    dataQuality,
    lastUpdated,
    certification
  });
  const compareSources = (apiIngredients, ocrIngredients) => {
    const api = apiIngredients.map((item) => item.originalText || item).join('|');
    const ocr = ocrIngredients.map((item) => item.originalText || item).join('|');
    return { conflict: api !== ocr, apiIngredients, ocrIngredients, mergedIngredients: null };
  };
  return { CACHE_VERSION, normalizeBarcode, isValidBarcode, canonicalBarcode, createIngredient, createProduct, compareSources };
})();
