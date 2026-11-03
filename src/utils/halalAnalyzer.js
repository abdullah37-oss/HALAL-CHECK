window.halalAnalyzer = (() => {
  const policy = window.universalHalalPolicy;
  const normalize = (value) => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[()[\],;:.]/g, ' ').replace(/\s+/g, ' ').trim();
  const findRecord = (value) => {
    const text = normalize(value);
    return window.ingredientDatabase.find((record) => record.aliases.some((alias) => {
      const normalizedAlias = normalize(alias);
      return text === normalizedAlias || text.includes(` ${normalizedAlias} `) || text.startsWith(`${normalizedAlias} `) || text.endsWith(` ${normalizedAlias}`);
    }));
  };
  function analyze(input, options = {}) {
    const language = policy.languages.includes(options.language) ? options.language : policy.defaultLanguage;
    const values = Array.isArray(input) ? input : String(input || '').split(/[,;\n]+/).map((part) => part.trim()).filter(Boolean);
    if (!values.length) return { classification: policy.classifications.NOT_ENOUGH_INFORMATION, label: policy.label(policy.classifications.NOT_ENOUGH_INFORMATION, language), findings: [], explanation: 'No ingredient list was supplied, so a meaningful assessment cannot be made.', language, certification: options.certified ? policy.classifications.CERTIFIED_HALAL : 'not-verified' };
    const findings = values.map((item) => {
      const ingredient = typeof item === 'string' ? item : item.originalText;
      const record = findRecord(ingredient);
      const sourceText = normalize(ingredient);
      if (record?.assessment === 'source-dependent' && /(plant|vegetable|microbial|synthetic|halal slaughtered)/.test(sourceText)) {
        return { ingredient, record, ingredientId: record.id, classification: policy.classifications.LIKELY_HALAL, source: typeof item === 'string' ? 'user_corrected' : item.source, confidence: typeof item === 'string' ? 0.8 : item.confidence };
      }
      return record ? { ingredient, record, ingredientId: record.id, classification: record.assessmentCode, source: typeof item === 'string' ? 'user_corrected' : item.source, confidence: typeof item === 'string' ? 0.8 : item.confidence } : { ingredient, classification: policy.classifications.NEEDS_CHECKING, source: typeof item === 'string' ? 'user_corrected' : item.source, confidence: typeof item === 'string' ? 0.8 : item.confidence, explanation: 'This ingredient is not in the central knowledge base and needs review.' };
    });
    const prohibited = findings.some((finding) => finding.classification === policy.classifications.NOT_HALAL);
    const uncertain = findings.some((finding) => finding.classification === policy.classifications.NEEDS_CHECKING);
    const classification = prohibited ? policy.classifications.NOT_HALAL : uncertain ? policy.classifications.NEEDS_CHECKING : policy.classifications.LIKELY_HALAL;
    return { classification, label: policy.label(classification, language), findings, explanation: prohibited ? 'A clearly prohibited ingredient was identified in the product evidence.' : uncertain ? 'One or more ingredients require source or composition verification.' : 'All identified ingredients are generally permissible under the universal ingredient policy.', language, certification: options.certified ? policy.classifications.CERTIFIED_HALAL : 'not-verified' };
  }
  return { analyze, findRecord, normalize };
})();
