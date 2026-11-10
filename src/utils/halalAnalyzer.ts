import type { IngredientRecord } from '../data/ingredientDatabase';
export interface IngredientEvidence { originalText: string; source?: string; confidence?: number; }
export interface AnalysisOptions { language?: string; certified?: boolean; ocrConfidence?: number; ocrConfirmed?: boolean; evidenceComplete?: boolean; country?: string; }
export interface Finding { ingredient: string; record?: IngredientRecord; ingredientId?: string; classification: string; source?: string; confidence?: number; explanation?: string; }
export interface Analysis { classification: string; label: string; findings: Finding[]; explanation: string; language: string; recognitionUncertain?: boolean; evidenceComplete?: boolean; certification: string; }
export const halalAnalyzer = (() => {
  const policy = window.universalHalalPolicy;
  const normalize = (value: unknown) => String(value || '').toLowerCase().normalize('NFKD')
    .replace(/[\u0300-\u036f\u064b-\u065f\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/[()[\],;:.،؛]/g, ' ')
    .replace(/\be[\s-]+(\d{3}[a-z]?)\b/g, 'e$1').replace(/\s+/g, ' ').trim();
  const splitIngredients = (text: unknown) => String(text || '').split(/[,;\n،؛]+/);
  const unknownRemainder = (text: string): string => {
    let remaining = ` ${text} `;
    const aliases = window.ingredientDatabase.flatMap(entry => [...entry.aliases, ...Object.values(entry.translations || {})]).map(normalize).sort((a, b) => b.length - a.length);
    for (const alias of aliases) remaining = remaining.split(` ${alias} `).join(' ');
    return remaining.replace(/\b(pasteurised|pasteurized|skimmed|live|lactic|preparation|whole|powder|and|with|of|organic|plant-derived|vegetable-derived|microbial-derived|synthetic|halal slaughtered)\b/g, '').replace(/[\d%\s-]/g, '');
  };
  const findRecord = (value: unknown) => {
    const text = normalize(value);
    const matches = window.ingredientDatabase.filter((record) => [...record.aliases, ...Object.values(record.translations || {})].some((alias) => {
      const normalizedAlias = normalize(alias);
      return text === normalizedAlias || text.includes(` ${normalizedAlias} `) || text.startsWith(`${normalizedAlias} `) || text.endsWith(` ${normalizedAlias}`);
    }));
    // A broad benign match (e.g. milk) must never mask pork or gelatin.
    const priority = { prohibited: 3, 'source-dependent': 2, permissible: 1 };
    return matches.sort((a, b) => priority[b.assessment] - priority[a.assessment])[0];
  };
  function analyze(input: unknown, options: AnalysisOptions = {}): Analysis {
    const language = typeof options.language === 'string' && policy.languages.includes(options.language) ? options.language : policy.defaultLanguage;
    const values = (Array.isArray(input) ? input : splitIngredients(input)).filter((item: unknown): item is string | IngredientEvidence => typeof item === 'string' ? Boolean(item.trim()) : typeof item === 'object' && item !== null && 'originalText' in item && typeof item.originalText === 'string' && Boolean(item.originalText.trim()));
    if (!values.length) return { classification: policy.classifications.NOT_ENOUGH_INFORMATION, label: policy.label(policy.classifications.NOT_ENOUGH_INFORMATION, language), findings: [], explanation: 'No ingredient list was supplied, so a meaningful assessment cannot be made.', language, certification: options.certified ? policy.classifications.CERTIFIED_HALAL : 'not-verified' };
    const findings: Finding[] = values.map((item): Finding => {
      const ingredient = typeof item === 'string' ? item : item.originalText;
      const record = findRecord(ingredient);
      const sourceText = normalize(ingredient);
      // Marketing/negative statements are not an ingredient list. Do not turn
      // "pork free" into prohibited evidence, or infer a complete halal product.
      if (/\b(no|without|free from|free of|does not contain)\b|\bfree$/.test(sourceText) && record?.assessment === 'prohibited') {
        return { ingredient, record, ingredientId: record.id, classification: policy.classifications.NEEDS_CHECKING, explanation: 'A negative or marketing statement is not positive ingredient evidence.', source: typeof item === 'string' ? 'user_corrected' : item.source };
      }
      if (record?.assessment === 'source-dependent' && record.id !== 'GELATIN' && /\b(plant-derived|vegetable-derived|microbial-derived|synthetic|halal slaughtered)\b/.test(sourceText) && !/\b(not|unknown|unconfirmed|possibly|may|or)\b/.test(sourceText) && !unknownRemainder(sourceText)) {
        return { ingredient, record, ingredientId: record.id, classification: policy.classifications.LIKELY_HALAL, source: typeof item === 'string' ? 'user_corrected' : item.source, confidence: typeof item === 'string' ? 0.8 : item.confidence };
      }
      let classification = record?.assessmentCode || policy.classifications.NEEDS_CHECKING;
      if (record?.assessment === 'permissible') {
        // Do not treat a whole compound as known merely because it contains milk.
        let remaining = ` ${sourceText} `;
        const aliases = window.ingredientDatabase.flatMap((entry) => [...entry.aliases, ...Object.values(entry.translations || {})]).map(normalize).sort((a, b) => b.length - a.length);
        for (const alias of aliases) remaining = remaining.split(` ${alias} `).join(' ');
        remaining = remaining.replace(/\b(pasteurised|pasteurized|skimmed|live|lactic|preparation|whole|powder|and|with|of|organic)\b/g, '').replace(/[\d%\s-]/g, '');
        if (remaining) classification = policy.classifications.NEEDS_CHECKING;
      }
      return record ? { ingredient, record, ingredientId: record.id, classification, source: typeof item === 'string' ? 'user_corrected' : item.source, confidence: typeof item === 'string' ? 0.8 : item.confidence } : { ingredient, classification: policy.classifications.NEEDS_CHECKING, source: typeof item === 'string' ? 'user_corrected' : item.source, confidence: typeof item === 'string' ? 0.8 : item.confidence, explanation: 'This ingredient is not in the central knowledge base and needs review.' };
    });
    const prohibited = findings.some((finding) => finding.classification === policy.classifications.NOT_HALAL);
    const uncertain = findings.some((finding) => finding.classification === policy.classifications.NEEDS_CHECKING);
    const uncertainRecognition = options.ocrConfirmed === false || (typeof options.ocrConfidence === 'number' && options.ocrConfidence < 0.75)
      || values.some((item) => typeof item === 'object' && item.source === 'ocr' && (!Number.isFinite(item.confidence) || typeof item.confidence !== 'number' || item.confidence < 0.75));
    const incomplete = options.evidenceComplete === false;
    const classification = uncertainRecognition ? policy.classifications.NEEDS_CHECKING : prohibited ? policy.classifications.NOT_HALAL : uncertain || incomplete ? policy.classifications.NEEDS_CHECKING : policy.classifications.LIKELY_HALAL;
    const explanation = uncertainRecognition ? 'Image recognition is uncertain. Confirm or correct the complete ingredient list before relying on this assessment.' : prohibited ? 'A clearly prohibited ingredient was identified in the product evidence.' : incomplete ? 'The ingredient list is incomplete. A complete readable label is required.' : uncertain ? 'One or more ingredients require source or composition verification.' : 'All identified ingredients are generally permissible under the documented default ingredient policy.';
    return { classification, label: policy.label(classification, language), findings, explanation, language, recognitionUncertain: uncertainRecognition, evidenceComplete: !incomplete, certification: options.certified ? policy.classifications.CERTIFIED_HALAL : 'not-verified' };
  }
  return { analyze, findRecord, normalize, splitIngredients };
})();

window.halalAnalyzer = halalAnalyzer;
