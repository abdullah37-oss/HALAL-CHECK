import type { IngredientRecord } from '../data/ingredientDatabase';
import { splitIngredientLabel } from './ingredientParsing';
export interface IngredientEvidence { originalText: string; source?: string; confidence?: number; }
export interface AnalysisOptions { language?: string; certified?: boolean; ocrConfidence?: number; ocrConfirmed?: boolean; evidenceComplete?: boolean; country?: string; }
export interface Finding { ingredient: string; record?: IngredientRecord; ingredientId?: string; classification: string; source?: string; confidence?: number; explanation?: string; }
export interface Analysis { classification: string; label: string; findings: Finding[]; explanation: string; language: string; recognitionUncertain?: boolean; evidenceComplete?: boolean; certification: string; }
export const halalAnalyzer = (() => {
  const policy = window.universalHalalPolicy;
  const normalize = (value: unknown) => String(value || '').toLowerCase().normalize('NFKD')
    .replace(/[\u0300-\u036f\u064b-\u065f\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/[()[\],;:._،؛]/g, ' ')
    .replace(/\be[\s-]+(\d{3}[a-z]?)\b/g, 'e$1').replace(/\s+/g, ' ').trim();
  // Decimal commas and entity terminators are not ingredient separators. Keep
  // nested contents: discarding parentheses can hide gelatin or prohibited fat.
  const splitIngredients = splitIngredientLabel;
  const aliases = window.ingredientDatabase.flatMap(entry => [...entry.aliases, ...Object.values(entry.translations || {})]).map(normalize).sort((a, b) => b.length - a.length);
  const residual = (text: string) => {
    let remaining = ` ${text} `;
    for (const alias of aliases) remaining = remaining.split(` ${alias} `).join(' ');
    return remaining.replace(/\b(pasteurised|pasteurized|skimmed|live|lactic|preparation|whole|powder|and|with|of|organic|pastorizzato|pastorizzata|scremato|intero|vivi|biologico|biologica|correttore di acidita|correttori di acidita|addensante|addensanti|emulsionante|emulsionanti|stabilizzante|stabilizzanti|antiossidante|antiossidanti|agente lievitante|agenti lievitanti)\b/g, '').replace(/[\d%.\s-]/g, '');
  };
  const unknownRemainder = (text: string): string => {
    let remaining = ` ${text} `;
    const aliases = window.ingredientDatabase.flatMap(entry => [...entry.aliases, ...Object.values(entry.translations || {})]).map(normalize).sort((a, b) => b.length - a.length);
    for (const alias of aliases) remaining = remaining.split(` ${alias} `).join(' ');
    return remaining.replace(/\b(pasteurised|pasteurized|skimmed|live|lactic|preparation|whole|powder|and|with|of|organic|plant-derived|vegetable-derived|microbial-derived|synthetic|halal slaughtered)\b/g, '').replace(/[\d%\s-]/g, '');
  };
  const indexedRules = window.ingredientDatabase.map(record => ({record, aliases: [...new Set([...record.aliases, ...Object.values(record.translations || {})].map(normalize))]}));
  const findRecord = (value: unknown) => {
    const text = normalize(value);
    const padded = ` ${text} `;
    const spans = indexedRules.flatMap(({record, aliases}) => aliases.flatMap(alias => {
      const found: Array<{record: IngredientRecord; start: number; end: number}> = [];
      let at = padded.indexOf(` ${alias} `);
      while (at >= 0) { found.push({record, start: at, end: at + alias.length}); at = padded.indexOf(` ${alias} `, at + 1); }
      return found;
    }));
    // "wine vinegar" is a distinct ingredient from wine. Shield only the
    // contained word, never a separate occurrence elsewhere in the compound.
    const matches = spans.filter(span => !spans.some(other => other.start <= span.start && other.end >= span.end && other.end - other.start > span.end - span.start)).map(span => span.record);
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
        const remaining = residual(sourceText);
        if (remaining) classification = policy.classifications.NEEDS_CHECKING;
      }
      return record ? { ingredient, record, ingredientId: record.id, classification, source: typeof item === 'string' ? 'user_corrected' : item.source, confidence: typeof item === 'string' ? 0.8 : item.confidence } : { ingredient, classification: policy.classifications.NEEDS_CHECKING, source: typeof item === 'string' ? 'user_corrected' : item.source, confidence: typeof item === 'string' ? 0.8 : item.confidence, explanation: 'This ingredient is not in the central knowledge base and needs review.' };
    });
    const prohibited = findings.some((finding) => finding.classification === policy.classifications.NOT_HALAL);
    const uncertain = findings.some((finding) => finding.classification === policy.classifications.NEEDS_CHECKING);
    const uncertainRecognition = options.ocrConfirmed === false || (typeof options.ocrConfidence === 'number' && options.ocrConfidence < 0.75)
      || values.some((item) => typeof item === 'object' && item.source === 'ocr' && (!Number.isFinite(item.confidence) || typeof item.confidence !== 'number' || item.confidence < 0.75));
    const joined = values.map(item => typeof item === 'string' ? item : item.originalText).join(',');
    const stack: string[] = [];
    let broken = false;
    for (const char of joined) {
      if (char === '(' || char === '[') stack.push(char);
      else if (char === ')' || char === ']') { if (stack.pop() !== (char === ')' ? '(' : '[')) broken = true; }
    }
    const incomplete = options.evidenceComplete === false || broken || stack.length > 0 || /\.{3}|…/.test(joined);
    const classification = uncertainRecognition ? policy.classifications.NEEDS_CHECKING : prohibited ? policy.classifications.NOT_HALAL : uncertain || incomplete ? policy.classifications.NEEDS_CHECKING : policy.classifications.LIKELY_HALAL;
    const explanation = uncertainRecognition ? 'Image recognition is uncertain. Confirm or correct the complete ingredient list before relying on this assessment.' : prohibited ? 'A clearly prohibited ingredient was identified in the product evidence.' : incomplete ? 'The ingredient list is incomplete. A complete readable label is required.' : uncertain ? 'One or more ingredients require source or composition verification.' : 'All identified ingredients are generally permissible under the documented default ingredient policy.';
    return { classification, label: policy.label(classification, language), findings, explanation, language, recognitionUncertain: uncertainRecognition, evidenceComplete: !incomplete, certification: options.certified ? policy.classifications.CERTIFIED_HALAL : 'not-verified' };
  }
  return { analyze, findRecord, normalize, splitIngredients };
})();

window.halalAnalyzer = halalAnalyzer;
