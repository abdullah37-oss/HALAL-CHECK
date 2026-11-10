import type { IngredientRecord } from './ingredientDatabase';
export const universalHalalPolicy = (() => {
  const CLASSIFICATIONS = Object.freeze({
    CERTIFIED_HALAL: 'certified-halal',
    LIKELY_HALAL: 'likely-halal',
    NOT_HALAL: 'not-halal',
    NEEDS_CHECKING: 'needs-checking',
    NOT_ENOUGH_INFORMATION: 'not-enough-information'
  });
  const LANGUAGES = Object.freeze(['en', 'it', 'ar', 'ur', 'hi', 'bn', 'fr', 'de', 'es', 'tr', 'ms', 'id']);
  const labels: Record<string, Record<string, string>> = {
    en: { 'certified-halal': 'Certified halal', 'likely-halal': 'HALAL', 'not-halal': 'HARAM', 'needs-checking': 'NEEDS CHECKING', 'not-enough-information': 'NEEDS CHECKING' },
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
  const translations: Record<string, Record<string, string>> = {
    MILK: { en: 'Milk', it: 'Latte', ar: 'حليب', ur: 'دودھ', hi: 'दूध', bn: 'দুধ', fr: 'Lait', de: 'Milch', es: 'Leche', tr: 'Süt', ms: 'Susu', id: 'Susu' },
    PECTIN: { en: 'Pectin', it: 'Pectina', ar: 'البكتين', ur: 'پیکٹن', hi: 'पेक्टिन', bn: 'পেকটিন', fr: 'Pectine', de: 'Pektin', es: 'Pectina', tr: 'Pektin', ms: 'Pektin', id: 'Pektin' },
    PORK: { en: 'Pork', it: 'Maiale', ar: 'لحم الخنزير', ur: 'خنزیر', hi: 'सूअर का मांस', bn: 'শূকরের মাংস', fr: 'Porc', de: 'Schweinefleisch', es: 'Cerdo', tr: 'Domuz eti', ms: 'Daging babi', id: 'Daging babi' },
    GELATIN: { en: 'Gelatin', it: 'Gelatina alimentare', ar: 'جيلاتين', ur: 'جیلاٹن', hi: 'जिलेटिन', bn: 'জেলাটিন', fr: 'Gélatine', de: 'Gelatine', es: 'Gelatina', tr: 'Jelatin', ms: 'Gelatin', id: 'Gelatin' }
  };
  Object.assign(translations, {
  "MILK_CULTURES": {
    "en": "Milk cultures",
    "it": "Fermenti lattici",
    "ar": "مزارع الحليب",
    "ur": "دودھ کے کلچر",
    "hi": "दुग्ध कल्चर",
    "bn": "দুধের কালচার",
    "fr": "Ferments lactiques",
    "de": "Milchkulturen",
    "es": "Cultivos lácteos",
    "tr": "Süt kültürleri",
    "ms": "Kultur susu",
    "id": "Kultur susu"
  },
  "BUTTER": {
    "en": "Butter",
    "it": "Burro",
    "ar": "زبدة",
    "ur": "مکھن",
    "hi": "मक्खन",
    "bn": "মাখন",
    "fr": "Beurre",
    "de": "Butter",
    "es": "Mantequilla",
    "tr": "Tereyağı",
    "ms": "Mentega",
    "id": "Mentega"
  },
  "CREAM": {
    "en": "Cream",
    "it": "Panna",
    "ar": "قشدة",
    "ur": "ملائی",
    "hi": "मलाई",
    "bn": "ক্রিম",
    "fr": "Crème",
    "de": "Sahne",
    "es": "Nata",
    "tr": "Krema",
    "ms": "Krim",
    "id": "Krim"
  },
  "YOGURT": {
    "en": "Yogurt",
    "it": "Yogurt",
    "ar": "زبادي",
    "ur": "دہی",
    "hi": "दही",
    "bn": "দই",
    "fr": "Yaourt",
    "de": "Joghurt",
    "es": "Yogur",
    "tr": "Yoğurt",
    "ms": "Yogurt",
    "id": "Yoghurt"
  },
  "WHEY": {
    "en": "Whey",
    "it": "Siero di latte",
    "ar": "مصل اللبن",
    "ur": "دودھ کا چھیننا",
    "hi": "मट्ठा",
    "bn": "দুধের ছানা জল",
    "fr": "Lactosérum",
    "de": "Molke",
    "es": "Suero de leche",
    "tr": "Peynir altı suyu",
    "ms": "Whey",
    "id": "Whey"
  },
  "WHEAT_FLOUR": {
    "en": "Wheat flour",
    "it": "Farina di grano",
    "ar": "دقيق القمح",
    "ur": "گندم کا آٹا",
    "hi": "गेहूँ का आटा",
    "bn": "গমের আটা",
    "fr": "Farine de blé",
    "de": "Weizenmehl",
    "es": "Harina de trigo",
    "tr": "Buğday unu",
    "ms": "Tepung gandum",
    "id": "Tepung terigu"
  },
  "RICE": {
    "en": "Rice",
    "it": "Riso",
    "ar": "أرز",
    "ur": "چاول",
    "hi": "चावल",
    "bn": "চাল",
    "fr": "Riz",
    "de": "Reis",
    "es": "Arroz",
    "tr": "Pirinç",
    "ms": "Beras",
    "id": "Beras"
  },
  "CORNSTARCH": {
    "en": "Cornstarch",
    "it": "Amido di mais",
    "ar": "نشا الذرة",
    "ur": "مکئی کا نشاستہ",
    "hi": "मकई का स्टार्च",
    "bn": "ভুট্টার মাড়",
    "fr": "Amidon de maïs",
    "de": "Maisstärke",
    "es": "Almidón de maíz",
    "tr": "Mısır nişastası",
    "ms": "Kanji jagung",
    "id": "Pati jagung"
  },
  "OATS": {
    "en": "Oats",
    "it": "Avena",
    "ar": "شوفان",
    "ur": "جئی",
    "hi": "जई",
    "bn": "ওটস",
    "fr": "Avoine",
    "de": "Hafer",
    "es": "Avena",
    "tr": "Yulaf",
    "ms": "Oat",
    "id": "Oat"
  },
  "SUGAR": {
    "en": "Sugar",
    "it": "Zucchero",
    "ar": "سكر",
    "ur": "چینی",
    "hi": "चीनी",
    "bn": "চিনি",
    "fr": "Sucre",
    "de": "Zucker",
    "es": "Azúcar",
    "tr": "Şeker",
    "ms": "Gula",
    "id": "Gula"
  },
  "SALT": {
    "en": "Salt",
    "it": "Sale",
    "ar": "ملح",
    "ur": "نمک",
    "hi": "नमक",
    "bn": "লবণ",
    "fr": "Sel",
    "de": "Salz",
    "es": "Sal",
    "tr": "Tuz",
    "ms": "Garam",
    "id": "Garam"
  },
  "WATER": {
    "en": "Water",
    "it": "Acqua",
    "ar": "ماء",
    "ur": "پانی",
    "hi": "पानी",
    "bn": "পানি",
    "fr": "Eau",
    "de": "Wasser",
    "es": "Agua",
    "tr": "Su",
    "ms": "Air",
    "id": "Air"
  },
  "VEGETABLE_OIL": {
    "en": "Vegetable oil",
    "it": "Olio vegetale",
    "ar": "زيت نباتي",
    "ur": "نباتاتی تیل",
    "hi": "वनस्पति तेल",
    "bn": "উদ্ভিজ্জ তেল",
    "fr": "Huile végétale",
    "de": "Pflanzenöl",
    "es": "Aceite vegetal",
    "tr": "Bitkisel yağ",
    "ms": "Minyak sayuran",
    "id": "Minyak nabati"
  },
  "HONEY": {
    "en": "Honey",
    "it": "Miele",
    "ar": "عسل",
    "ur": "شہد",
    "hi": "शहद",
    "bn": "মধু",
    "fr": "Miel",
    "de": "Honig",
    "es": "Miel",
    "tr": "Bal",
    "ms": "Madu",
    "id": "Madu"
  },
  "YEAST": {
    "en": "Yeast",
    "it": "Lievito",
    "ar": "خميرة",
    "ur": "خمیر",
    "hi": "खमीर",
    "bn": "ইস্ট",
    "fr": "Levure",
    "de": "Hefe",
    "es": "Levadura",
    "tr": "Maya",
    "ms": "Yis",
    "id": "Ragi"
  },
  "VINEGAR": {
    "en": "Vinegar",
    "it": "Aceto",
    "ar": "خل",
    "ur": "سرکہ",
    "hi": "सिरका",
    "bn": "ভিনেগার",
    "fr": "Vinaigre",
    "de": "Essig",
    "es": "Vinagre",
    "tr": "Sirke",
    "ms": "Cuka",
    "id": "Cuka"
  },
  "CITRIC_ACID": {
    "en": "Citric acid",
    "it": "Acido citrico",
    "ar": "حمض الستريك",
    "ur": "سٹرک ایسڈ",
    "hi": "साइट्रिक अम्ल",
    "bn": "সাইট্রিক অ্যাসিড",
    "fr": "Acide citrique",
    "de": "Zitronensäure",
    "es": "Ácido cítrico",
    "tr": "Sitrik asit",
    "ms": "Asid sitrik",
    "id": "Asam sitrat"
  },
  "FLAVOURING": {
    "en": "Flavouring",
    "it": "Aroma",
    "ar": "منكهات",
    "ur": "ذائقہ دینے والے اجزاء",
    "hi": "स्वादकारी पदार्थ",
    "bn": "স্বাদবর্ধক",
    "fr": "Arôme",
    "de": "Aroma",
    "es": "Aromatizante",
    "tr": "Aroma verici",
    "ms": "Perisa",
    "id": "Perisa"
  },
  "FRUIT_AND_VEGETABLES": {
    "en": "Fruit and vegetables",
    "it": "Frutta e verdura",
    "ar": "فواكه وخضروات",
    "ur": "پھل اور سبزیاں",
    "hi": "फल और सब्जियाँ",
    "bn": "ফল ও সবজি",
    "fr": "Fruits et légumes",
    "de": "Obst und Gemüse",
    "es": "Frutas y verduras",
    "tr": "Meyve ve sebzeler",
    "ms": "Buah dan sayur",
    "id": "Buah dan sayur"
  },
  "BLOOD": {
    "en": "Blood",
    "it": "Sangue",
    "ar": "دم",
    "ur": "خون",
    "hi": "रक्त",
    "bn": "রক্ত",
    "fr": "Sang",
    "de": "Blut",
    "es": "Sangre",
    "tr": "Kan",
    "ms": "Darah",
    "id": "Darah"
  },
  "ALCOHOLIC_BEVERAGE": {
    "en": "Alcoholic beverage",
    "it": "Bevanda alcolica",
    "ar": "مشروب كحولي",
    "ur": "الکحل والا مشروب",
    "hi": "मादक पेय",
    "bn": "মদ্যপ পানীয়",
    "fr": "Boisson alcoolisée",
    "de": "Alkoholisches Getränk",
    "es": "Bebida alcohólica",
    "tr": "Alkollü içecek",
    "ms": "Minuman beralkohol",
    "id": "Minuman beralkohol"
  },
  "MONO_AND_DIGLYCERIDES": {
    "en": "Mono- and diglycerides",
    "it": "Mono e digliceridi",
    "ar": "أحاديات وثنائيات الغليسيريد",
    "ur": "مونو اور ڈائی گلیسرائیڈز",
    "hi": "मोनो और डाइग्लिसराइड",
    "bn": "মনো ও ডাইগ্লিসারাইড",
    "fr": "Mono et diglycérides",
    "de": "Mono- und Diglyceride",
    "es": "Mono y diglicéridos",
    "tr": "Mono ve digliseritler",
    "ms": "Mono dan digliserida",
    "id": "Mono dan digliserida"
  },
  "EMULSIFIER_E472": {
    "en": "Emulsifier E472",
    "it": "Emulsionante E472",
    "ar": "مستحلب E472",
    "ur": "ایملسیفائر E472",
    "hi": "इमल्सीफायर E472",
    "bn": "ইমালসিফায়ার E472",
    "fr": "Émulsifiant E472",
    "de": "Emulgator E472",
    "es": "Emulgente E472",
    "tr": "Emülgatör E472",
    "ms": "Pengemulsi E472",
    "id": "Pengemulsi E472"
  },
  "OTHER_SOURCE_DEPENDENT_ADDITIVE": {
    "en": "Other source-dependent additive",
    "it": "Altro additivo da verificare",
    "ar": "مضاف آخر يعتمد على المصدر",
    "ur": "دوسرا ماخذ پر منحصر اضافی جزو",
    "hi": "अन्य स्रोत-निर्भर योजक",
    "bn": "অন্যান্য উৎসনির্ভর সংযোজক",
    "fr": "Autre additif à source variable",
    "de": "Anderer herkunftsabhängiger Zusatz",
    "es": "Otro aditivo de origen variable",
    "tr": "Diğer kaynağa bağlı katkı",
    "ms": "Bahan tambahan bergantung sumber lain",
    "id": "Bahan tambahan bergantung sumber lain"
  },
  "SORBITOL": {
    "en": "Sorbitol",
    "it": "Sorbitolo",
    "ar": "سوربيتول",
    "ur": "سوربیٹول",
    "hi": "सोर्बिटोल",
    "bn": "সরবিটল",
    "fr": "Sorbitol",
    "de": "Sorbit",
    "es": "Sorbitol",
    "tr": "Sorbitol",
    "ms": "Sorbitol",
    "id": "Sorbitol"
  }
});
  const policy = {
    version: '2026.11.10',
    defaultLanguage: 'en',
    classifications: CLASSIFICATIONS,
    languages: LANGUAGES,
    labels,
    translations,
    countryAffectsAssessment: false,
    scholarlyDifferences: 'Source-dependent ingredients use NEEDS CHECKING. The policy records uncertainty rather than silently selecting a different scholarly standard.',
    evidence: 'Central ingredient policy: each assessment is based on ingredient evidence, source requirements and the recorded explanation. Certification is separate.'
  };
  const label = (classification: string, language = 'en') => (labels[language] || labels.en)[classification] || labels.en[classification];
  const translate = (record: IngredientRecord, language = 'en') => record.translations?.[language] || record.translations?.en || record.name;
  const permanentId = (record: IngredientRecord) => record.id || record.name.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  const classifyReference = (record: IngredientRecord) => record.assessment === 'prohibited' ? CLASSIFICATIONS.NOT_HALAL : record.assessment === 'source-dependent' ? CLASSIFICATIONS.NEEDS_CHECKING : CLASSIFICATIONS.LIKELY_HALAL;
  window.ingredientDatabase.forEach((record) => {
    record.id = permanentId(record);
    record.assessmentCode = classifyReference(record);
    const recordTranslations = translations[record.id] || record.translations || { en: record.name, it: record.italian || record.name };
    record.translations = recordTranslations;
    LANGUAGES.forEach((language) => { if (!recordTranslations[language]) recordTranslations[language] = recordTranslations.en; });
    record.policyVersion = policy.version;
    record.evidence = record.evidence || `${record.explanation} Source requirement: ${record.conditions || 'None specified'}`;
  });
  return { ...policy, label, translate, permanentId, classifyReference };
})();

window.universalHalalPolicy = universalHalalPolicy;
