window.halalAnalyzer = (() => {
  const policy = window.universalHalalPolicy;
  const normalize = (value) => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[()[\],;:.]/g, ' ').replace(/\s+/g, ' ').trim();
  const findRecord = (value) => {
    const text = normalize(value);
    const matches = window.ingredientDatabase.filter((record) => [...record.aliases, ...Object.values(record.translations || {})].some((alias) => {
      const normalizedAlias = normalize(alias);
      return text === normalizedAlias || text.includes(` ${normalizedAlias} `) || text.startsWith(`${normalizedAlias} `) || text.endsWith(` ${normalizedAlias}`);
    }));
    // A broad benign match (e.g. milk) must never mask pork or gelatin.
    const priority = { prohibited: 3, 'source-dependent': 2, permissible: 1 };
    return matches.sort((a, b) => priority[b.assessment] - priority[a.assessment])[0];
  };
  function analyze(input, options = {}) {
    const language = policy.languages.includes(options.language) ? options.language : policy.defaultLanguage;
    const values = (Array.isArray(input) ? input : String(input || '').split(/[,;\n]+/)).filter((item) => typeof item === 'string' ? item.trim() : item && typeof item.originalText === 'string' && item.originalText.trim());
    if (!values.length) return { classification: policy.classifications.NOT_ENOUGH_INFORMATION, label: policy.label(policy.classifications.NOT_ENOUGH_INFORMATION, language), findings: [], explanation: 'No ingredient list was supplied, so a meaningful assessment cannot be made.', language, certification: options.certified ? policy.classifications.CERTIFIED_HALAL : 'not-verified' };
    const findings = values.map((item) => {
      const ingredient = typeof item === 'string' ? item : item.originalText;
      const record = findRecord(ingredient);
      const sourceText = normalize(ingredient);
      if (record?.assessment === 'source-dependent' && record.id !== 'GELATIN' && /\b(plant-derived|vegetable-derived|microbial-derived|synthetic|halal slaughtered)\b/.test(sourceText) && !/\b(not|unknown|unconfirmed|possibly|may|or)\b/.test(sourceText)) {
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
    const classification = prohibited ? policy.classifications.NOT_HALAL : uncertain ? policy.classifications.NEEDS_CHECKING : policy.classifications.LIKELY_HALAL;
    return { classification, label: policy.label(classification, language), findings, explanation: prohibited ? 'A clearly prohibited ingredient was identified in the product evidence.' : uncertain ? 'One or more ingredients require source or composition verification.' : 'All identified ingredients are generally permissible under the universal ingredient policy.', language, certification: options.certified ? policy.classifications.CERTIFIED_HALAL : 'not-verified' };
  }
  return { analyze, findRecord, normalize };
})();
