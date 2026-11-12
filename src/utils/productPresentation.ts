import type { Product } from '../models/productModel';
import type { Analysis, Finding } from './halalAnalyzer';
import { sameBarcode } from '../lib/barcode';
import { safeProductImage } from '../services/openFoodFacts';

// Only already-identified products can supply artwork. The curated catalogue is
// a fallback for the same identity, never an image search or a guessed match.
export function productImages(product: Product | null, barcode: string, catalogue: readonly Product[]): string[] {
  if (!product || !sameBarcode(product.returnedBarcode, barcode) || !sameBarcode(product.scannedBarcode, barcode)) return [];
  const trusted = catalogue.find(item => sameBarcode(item.returnedBarcode, barcode) && sameBarcode(item.scannedBarcode, barcode));
  const matchingImage = (value: unknown): string | undefined => {
    const image = safeProductImage(value);
    const imageCode = image ? new URL(image).pathname.match(/^\/images\/products\/([\d/]+)\//)?.[1].replaceAll('/','') : '';
    return image && sameBarcode(imageCode, barcode) ? image : undefined;
  };
  return [...new Set([matchingImage(product.imageUrl), matchingImage(trusted?.imageUrl)].filter((url): url is string => !!url))];
}

export interface IngredientSummary { heading: string; findings: Array<{ingredient: string; reason: string}>; message: string; }
export function ingredientSummary(analysis: Analysis | null): IngredientSummary {
  if (!analysis?.findings.length) return {heading: 'Ingredient information', findings: [], message: 'Ingredients are unavailable.'};
  let findings: Finding[];
  if (analysis.classification === 'not-halal') findings = analysis.findings.filter(f => f.classification === 'not-halal');
  else if (analysis.classification === 'likely-halal') findings = analysis.findings;
  else findings = analysis.findings.filter(f => f.classification === 'needs-checking');
  const unique = findings.filter((f,index,all) => all.findIndex(other => other.ingredient.trim() === f.ingredient.trim()) === index).slice(0,3);
  return {
    heading: analysis.classification === 'not-halal' ? 'Contains' : analysis.classification === 'likely-halal' ? 'Assessed ingredients' : 'Needs verification',
    findings: unique.map(f => ({ingredient: f.ingredient.trim(), reason: analysis.classification === 'not-halal' ? 'Prohibited ingredient identified.' : analysis.classification === 'likely-halal' ? '' : f.record?.assessment === 'source-dependent' && !f.explanation ? 'Source needs verification.' : 'Ingredient needs review.'})),
    message: unique.some(f => f.record?.assessment === 'source-dependent') ? 'Ask the manufacturer to confirm the source.' : unique.length ? '' : 'More ingredient information is needed.'
  };
}
