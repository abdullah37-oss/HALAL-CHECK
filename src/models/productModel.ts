export interface Ingredient {
  id: string;
  originalText: string;
  normalizedName: string;
  source: string;
  confidence: number;
  matchedIngredientId: string | null;
  assessment: string | null;
}
export interface Product {
  scannedBarcode: string;
  returnedBarcode: string;
  productName: string;
  brand: string;
  ingredientsRaw: string;
  ingredients: Ingredient[];
  ingredientDataSource: string;
  dataQuality: string;
  lastUpdated: string;
  certification: string;
}
export interface ProductInput {
  scannedBarcode?: string;
  returnedBarcode?: string;
  productName?: string;
  brand?: string;
  ingredientsRaw?: string;
  ingredientDataSource?: string;
  dataQuality?: string;
  lastUpdated?: string;
  ingredients?: Ingredient[];
  certification?: string;
}
export const productModel = (() => {
  const CACHE_VERSION = 2;
  const normalizeBarcode = (value: unknown): string => /^\d+$/.test(String(value || '').trim()) ? String(value).trim() : '';
  const isValidBarcode = (value: unknown): boolean => /^(?:\d{8}|\d{12,14})$/.test(normalizeBarcode(value));
  const canonicalBarcode = (value: unknown): string => normalizeBarcode(value).replace(/^0+(?=\d)/, '');
  const createIngredient = (originalText: string, source: string, confidence = 1): Ingredient => ({
    id: `${source}:${originalText.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-')}`,
    originalText,
    normalizedName: originalText.toLowerCase().trim(),
    source,
    confidence: Math.max(0, Math.min(1, Number.isFinite(confidence) ? confidence : 0)),
    matchedIngredientId: null,
    assessment: null
  });
  const createProduct = ({ scannedBarcode = '', returnedBarcode = '', productName = 'Unnamed product', brand = 'Unknown brand', ingredientsRaw = '', ingredientDataSource = 'unknown', dataQuality = 'missing', lastUpdated = '', ingredients, certification = 'not-verified' }: ProductInput): Product => ({
    scannedBarcode: normalizeBarcode(scannedBarcode),
    returnedBarcode: normalizeBarcode(returnedBarcode),
    productName,
    brand,
    ingredientsRaw,
    ingredients: ingredients || String(ingredientsRaw || '').split(/[,;\n،؛]+/).map((text) => text.trim()).filter(Boolean).map((text) => createIngredient(text, ingredientDataSource)),
    ingredientDataSource,
    dataQuality,
    lastUpdated,
    certification
  });
  const compareSources = (apiIngredients: Array<string | Ingredient>, ocrIngredients: Array<string | Ingredient>) => {
    const text = (item: string | Ingredient) => typeof item === 'string' ? item : item.originalText;
    const api = apiIngredients.map(text).join('|');
    const ocr = ocrIngredients.map(text).join('|');
    return { conflict: api !== ocr, apiIngredients, ocrIngredients, mergedIngredients: null };
  };
  return { CACHE_VERSION, normalizeBarcode, isValidBarcode, canonicalBarcode, createIngredient, createProduct, compareSources };
})();
window.productModel = productModel;
