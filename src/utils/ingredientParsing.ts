// Shared by manual input, OCR and server-side OFF mapping. Preserve every
// ingredient, including nested contents; decimal commas are not separators.
export function splitIngredientLabel(text: unknown): string[] {
  return String(text || '')
    .replace(/&quot;|&#34;/gi, ' ').replace(/&amp;/gi, ' and ').replace(/&nbsp;/gi, ' ')
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/\b(?:ingredienti|ingredients)\s*:/gi, '')
    .split(/[,;\n\u060c\u061b]+/).filter(part => part.trim());
}
