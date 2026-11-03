window.universalHalalPolicy = (() => {
  const CLASSIFICATIONS = Object.freeze({
    CERTIFIED_HALAL: 'certified-halal',
    LIKELY_HALAL: 'likely-halal',
    NOT_HALAL: 'not-halal',
    NEEDS_CHECKING: 'needs-checking',
    NOT_ENOUGH_INFORMATION: 'not-enough-information'
  });
  const LANGUAGES = Object.freeze(['en', 'it', 'ar', 'ur', 'hi', 'bn', 'fr', 'de', 'es', 'tr', 'ms', 'id']);
  const labels = {
    en: { 'certified-halal': 'Certified halal', 'likely-halal': 'Likely halal', 'not-halal': 'Not halal', 'needs-checking': 'Needs checking', 'not-enough-information': 'Not enough information' },
    it: { 'certified-halal': 'Halal certificato', 'likely-halal': 'Probabilmente halal', 'not-halal': 'Non halal', 'needs-checking': 'Da verificare', 'not-enough-information': 'Informazioni insufficienti' },
    ar: { 'certified-halal': 'حلال معتمد', 'likely-halal': 'مرجح أنه حلال', 'not-halal': 'غير حلال', 'needs-checking': 'يحتاج إلى تحقق', 'not-enough-information': 'معلومات غير كافية' },
    ur: { 'certified-halal': 'مصدقہ حلال', 'likely-halal': 'غالباً حلال', 'not-halal': 'حلال نہیں', 'needs-checking': 'مزید جانچ ضروری', 'not-enough-information': 'ناکافی معلومات' },
    hi: { 'certified-halal': 'प्रमाणित हलाल', 'likely-halal': 'संभावित हलाल', 'not-halal': 'हलाल नहीं', 'needs-checking': 'जाँच आवश्यक', 'not-enough-information': 'पर्याप्त जानकारी नहीं' },
    bn: { 'certified-halal': 'প্রত্যয়িত হালাল', 'likely-halal': 'সম্ভবত হালাল', 'not-halal': 'হালাল নয়', 'needs-checking': 'যাচাই প্রয়োজন', 'not-enough-information': 'পর্যাপ্ত তথ্য নেই' },
    fr: { 'certified-halal': 'Halal certifié', 'likely-halal': 'Probablement halal', 'not-halal': 'Non halal', 'needs-checking': 'À vérifier', 'not-enough-information': 'Informations insuffisantes' },
    de: { 'certified-halal': 'Halal zertifiziert', 'likely-halal': 'Wahrscheinlich halal', 'not-halal': 'Nicht halal', 'needs-checking': 'Zu prüfen', 'not-enough-information': 'Nicht genügend Informationen' },
    es: { 'certified-halal': 'Halal certificado', 'likely-halal': 'Probablemente halal', 'not-halal': 'No halal', 'needs-checking': 'Requiere comprobación', 'not-enough-information': 'Información insuficiente' },
    tr: { 'certified-halal': 'Sertifikalı helal', 'likely-halal': 'Muhtemelen helal', 'not-halal': 'Helal değil', 'needs-checking': 'Kontrol edilmeli', 'not-enough-information': 'Yeterli bilgi yok' },
    ms: { 'certified-halal': 'Halal disahkan', 'likely-halal': 'Kemungkinan halal', 'not-halal': 'Bukan halal', 'needs-checking': 'Perlu disemak', 'not-enough-information': 'Maklumat tidak mencukupi' },
    id: { 'certified-halal': 'Halal tersertifikasi', 'likely-halal': 'Kemungkinan halal', 'not-halal': 'Tidak halal', 'needs-checking': 'Perlu diperiksa', 'not-enough-information': 'Informasi tidak cukup' }
  };
  const translations = {
    MILK: { en: 'Milk', it: 'Latte', ar: 'حليب', ur: 'دودھ', hi: 'दूध', bn: 'দুধ', fr: 'Lait', de: 'Milch', es: 'Leche', tr: 'Süt', ms: 'Susu', id: 'Susu' },
    PECTIN: { en: 'Pectin', it: 'Pectina', ar: 'البكتين', ur: 'پیکٹن', hi: 'पेक्टिन', bn: 'পেকটিন', fr: 'Pectine', de: 'Pektin', es: 'Pectina', tr: 'Pektin', ms: 'Pektin', id: 'Pektin' },
    PORK: { en: 'Pork', it: 'Maiale', ar: 'لحم الخنزير', ur: 'خنزیر', hi: 'सूअर का मांस', bn: 'শূকরের মাংস', fr: 'Porc', de: 'Schweinefleisch', es: 'Cerdo', tr: 'Domuz eti', ms: 'Daging babi', id: 'Daging babi' },
    GELATIN: { en: 'Gelatin', it: 'Gelatina alimentare', ar: 'جيلاتين', ur: 'جیلاٹن', hi: 'जिलेटिन', bn: 'জেলাটিন', fr: 'Gélatine', de: 'Gelatine', es: 'Gelatina', tr: 'Jelatin', ms: 'Gelatin', id: 'Gelatin' }
  };
  const policy = {
    version: '2026.10.31',
    defaultLanguage: 'en',
    classifications: CLASSIFICATIONS,
    languages: LANGUAGES,
    labels,
    translations,
    countryAffectsAssessment: false,
    scholarlyDifferences: 'Source-dependent ingredients use NEEDS CHECKING. The policy records uncertainty rather than silently selecting a different scholarly standard.',
    evidence: 'Central ingredient policy: each assessment is based on ingredient evidence, source requirements and the recorded explanation. Certification is separate.'
  };
  const label = (classification, language = 'en') => (labels[language] || labels.en)[classification] || labels.en[classification];
  const translate = (record, language = 'en') => record.translations?.[language] || record.translations?.en || record.name;
  const permanentId = (record) => record.id || record.name.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  const classifyReference = (record) => record.assessment === 'prohibited' ? CLASSIFICATIONS.NOT_HALAL : record.assessment === 'source-dependent' ? CLASSIFICATIONS.NEEDS_CHECKING : CLASSIFICATIONS.LIKELY_HALAL;
  window.ingredientDatabase.forEach((record) => {
    record.id = permanentId(record);
    record.assessmentCode = classifyReference(record);
    record.translations = translations[record.id] || record.translations || { en: record.name, it: record.italian || record.name };
    LANGUAGES.forEach((language) => { if (!record.translations[language]) record.translations[language] = record.translations.en; });
    record.policyVersion = policy.version;
    record.evidence = record.evidence || `${record.explanation} Source requirement: ${record.conditions || 'None specified'}`;
  });
  return { ...policy, label, translate, permanentId, classifyReference };
})();
