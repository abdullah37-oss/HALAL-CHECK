window.halalI18n = (() => {
  const supported = ['en', 'it', 'ar', 'ur', 'hi', 'bn', 'fr', 'de', 'es', 'tr', 'ms', 'id'];
  const rtl = new Set(['ar', 'ur']);
  const en = {
    Language: 'Language', 'Dark mode': 'Dark mode', 'Install app': 'Install app', 'Know What You Eat.': 'Know What You Eat.',
    Overview: 'Overview', 'Scan history': 'Scan history', 'How it works': 'How it works', 'Ingredient guide': 'Ingredient guide',
    'YOUR FOOD COMPANION': 'YOUR FOOD COMPANION', 'Know what you eat.': 'Know what you eat.', 'Check ingredients and discover more about the products you bring home.': 'Check ingredients and discover more about the products you bring home.', 'Ready to scan': 'Ready to scan',
    'QUICK CHECK': 'QUICK CHECK', 'Scan a product': 'Scan a product', 'Use your camera to read a barcode, or enter it manually for a quick lookup.': 'Use your camera to read a barcode, or enter it manually for a quick lookup.', 'Scan barcode': 'Scan barcode', 'Enter barcode': 'Enter barcode',
    'AT A GLANCE': 'AT A GLANCE', 'Your scan overview': 'Your scan overview', 'View history': 'View history', 'Verified scans': 'Verified scans', 'Need review': 'Need review', 'Total scans': 'Total scans', 'YOUR ACTIVITY': 'YOUR ACTIVITY', 'Recent scans': 'Recent scans',
    'No scans yet. Start with a barcode above.': 'No scans yet. Start with a barcode above.',
    'PRODUCT SCANNER': 'PRODUCT SCANNER', 'Scan a barcode': 'Scan a barcode', 'Place the barcode inside the frame. Your camera stays on this device.': 'Place the barcode inside the frame. Your camera stays on this device.', 'Back to overview': 'Back to overview', 'Camera preview': 'Camera preview', 'Allow camera access to scan a product': 'Allow camera access to scan a product', 'Camera permission is needed to begin.': 'Camera permission is needed to begin.', 'Start camera': 'Start camera', 'Flashlight': 'Flashlight', 'Switch camera': 'Switch camera', 'or': 'or', 'Enter barcode manually': 'Enter barcode manually', 'Check': 'Check', 'Or paste ingredients for an assessment': 'Or paste ingredients for an assessment', 'Ingredient analysis is separate from certification verification.': 'Ingredient analysis is separate from certification verification.', 'Your camera feed is processed locally. We do not record or upload video.': 'Your camera feed is processed locally. We do not record or upload video.',
    'YOUR ACTIVITY': 'YOUR ACTIVITY', 'Scan history': 'Scan history', 'Products you have checked on this device.': 'Products you have checked on this device.', 'Clear history': 'Clear history',
    'TRANSPARENCY FIRST': 'TRANSPARENCY FIRST', 'How HalalCheck works': 'How HalalCheck works', 'Scan': 'Scan', 'Verify': 'Verify', 'Understand': 'Understand', 'Important': 'Important', 'HalalCheck is an information aid, not a religious authority. Always check the latest packaging and certification mark.': 'HalalCheck is an information aid, not a religious authority. Always check the latest packaging and certification mark.',
    'KNOW YOUR INGREDIENTS': 'KNOW YOUR INGREDIENTS', 'Halal Ingredient Guide': 'Halal Ingredient Guide', 'Search common English, Italian, Arabic and E-number references.': 'Search common English, Italian, Arabic and E-number references.', 'Search the ingredient database': 'Search the ingredient database', 'No ingredient matched your search.': 'No ingredient matched your search.',
    'No ingredient list was supplied, so a meaningful assessment cannot be made.': 'No ingredient list was supplied, so a meaningful assessment cannot be made.',
    'Certification not verified': 'Certification not verified', 'Certification is independent from ingredient assessment and is shown only when verified evidence exists.': 'Certification is independent from ingredient assessment and is shown only when verified evidence exists.',
    'Product identity could not be verified': 'Product identity could not be verified', 'No ingredients were used and no classification was produced.': 'No ingredients were used and no classification was produced.',
    'Product identity': 'Product identity', 'Scanned barcode:': 'Scanned barcode:', 'Returned barcode:': 'Returned barcode:', 'Identity verified · Data source:': 'Identity verified · Data source:', 'Ingredient assessment': 'Ingredient assessment', 'Certification status': 'Certification status', 'Actual ingredients used': 'Actual ingredients used', 'Data quality': 'Data quality', 'Why this result?': 'Why this result?', 'Source:': 'Source:', 'Product lookup': 'Product lookup', 'Ingredient assessment': 'Ingredient assessment', 'Manual ingredient assessment': 'Manual ingredient assessment', 'User supplied': 'User supplied', 'No trusted source returned': 'No trusted source returned', 'Insufficient information': 'Insufficient information'
  };
  const translations = {
    it: { Language: 'Lingua', 'Dark mode': 'Modalità scura', 'Install app': 'Installa app', Overview: 'Panoramica', 'Scan history': 'Cronologia scansioni', 'How it works': 'Come funziona', 'Ingredient guide': 'Guida agli ingredienti', 'Know what you eat.': 'Sappi cosa mangi.', 'Ready to scan': 'Pronto per la scansione', 'Scan a product': 'Scansiona un prodotto', 'Scan barcode': 'Scansiona codice a barre', 'Enter barcode': 'Inserisci codice a barre', 'Your scan overview': 'Riepilogo scansioni', 'Verified scans': 'Scansioni verificate', 'Need review': 'Da controllare', 'Total scans': 'Scansioni totali', 'Recent scans': 'Scansioni recenti', 'Halal Ingredient Guide': 'Guida agli ingredienti halal', 'Search the ingredient database': 'Cerca nel database degli ingredienti', 'Clear history': 'Cancella cronologia' },
    ar: { Language: 'اللغة', 'Dark mode': 'الوضع الداكن', 'Install app': 'تثبيت التطبيق', Overview: 'نظرة عامة', 'Scan history': 'سجل الفحص', 'How it works': 'كيف يعمل', 'Ingredient guide': 'دليل المكونات', 'Know what you eat.': 'اعرف ما تأكل.', 'Ready to scan': 'جاهز للفحص', 'Scan a product': 'افحص منتجاً', 'Scan barcode': 'فحص الباركود', 'Enter barcode': 'أدخل الباركود', 'Your scan overview': 'ملخص الفحوصات', 'Verified scans': 'الفحوصات الموثقة', 'Need review': 'تحتاج إلى مراجعة', 'Total scans': 'إجمالي الفحوصات', 'Recent scans': 'الفحوصات الأخيرة', 'Halal Ingredient Guide': 'دليل مكونات الحلال', 'Search the ingredient database': 'ابحث في قاعدة المكونات', 'Clear history': 'مسح السجل', 'Product identity': 'هوية المنتج', 'Ingredient assessment': 'تقييم المكونات', 'Certification status': 'حالة الشهادة', 'Actual ingredients used': 'المكونات المستخدمة فعلياً', 'Data quality': 'جودة البيانات', 'Why this result?': 'لماذا هذه النتيجة؟', 'Source:': 'المصدر:', 'Scan a barcode': 'فحص الباركود', 'Camera preview': 'معاينة الكاميرا', 'Allow camera access to scan a product': 'اسمح للكاميرا لفحص المنتج', 'Camera permission is needed to begin.': 'يلزم السماح بالكاميرا للبدء', 'Start camera': 'بدء الكاميرا', 'Flashlight': 'المصباح', 'Switch camera': 'تبديل الكاميرا', 'Enter barcode manually': 'أدخل الباركود يدوياً', 'Check': 'تحقق', 'Home': 'الرئيسية', 'History': 'السجل', 'Scan': 'فحص', 'About': 'حول' },
    ur: { Language: 'زبان', 'Dark mode': 'ڈارک موڈ', 'Install app': 'ایپ انسٹال کریں', Overview: 'جائزہ', 'Scan history': 'اسکین کی تاریخ', 'How it works': 'یہ کیسے کام کرتا ہے', 'Ingredient guide': 'اجزاء کی رہنما کتاب', 'Know what you eat.': 'جانیں کہ آپ کیا کھاتے ہیں۔', 'Ready to scan': 'اسکین کے لیے تیار', 'Scan a product': 'مصنوعات اسکین کریں', 'Scan barcode': 'بارکوڈ اسکین کریں', 'Enter barcode': 'بارکوڈ درج کریں', 'Your scan overview': 'اسکین کا خلاصہ', 'Verified scans': 'تصدیق شدہ اسکین', 'Need review': 'جائزہ درکار ہے', 'Total scans': 'کل اسکین', 'Recent scans': 'حالیہ اسکین', 'Halal Ingredient Guide': 'حلال اجزاء کی رہنما کتاب', 'Search the ingredient database': 'اجزاء کے ڈیٹا بیس میں تلاش کریں', 'Clear history': 'تاریخ صاف کریں', 'Product identity': 'مصنوعات کی شناخت', 'Ingredient assessment': 'اجزاء کا جائزہ', 'Certification status': 'سرٹیفیکیشن کی حیثیت', 'Actual ingredients used': 'استعمال شدہ اصل اجزاء', 'Data quality': 'ڈیٹا کا معیار', 'Why this result?': 'یہ نتیجہ کیوں؟', 'Source:': 'ماخذ:', 'Scan a barcode': 'بارکوڈ اسکین کریں', 'Camera preview': 'کیمرے کا پیش نظارہ', 'Allow camera access to scan a product': 'مصنوعات اسکین کرنے کے لیے کیمرے کی اجازت دیں', 'Camera permission is needed to begin.': 'شروع کرنے کے لیے کیمرے کی اجازت ضروری ہے', 'Start camera': 'کیمرہ شروع کریں', 'Flashlight': 'فلیش لائٹ', 'Switch camera': 'کیمرہ تبدیل کریں', 'Enter barcode manually': 'بارکوڈ دستی طور پر درج کریں', 'Check': 'جانچیں', 'Home': 'ہوم', 'History': 'تاریخ', 'Scan': 'اسکین', 'About': 'تعارف' },
    hi: { Language: 'भाषा', Overview: 'अवलोकन', 'Scan history': 'स्कैन इतिहास', 'Ingredient guide': 'सामग्री मार्गदर्शिका', 'Scan a product': 'उत्पाद स्कैन करें', 'Scan barcode': 'बारकोड स्कैन करें', 'Enter barcode': 'बारकोड दर्ज करें', 'Halal Ingredient Guide': 'हलाल सामग्री मार्गदर्शिका' },
    bn: { Language: 'ভাষা', Overview: 'ওভারভিউ', 'Scan history': 'স্ক্যান ইতিহাস', 'Ingredient guide': 'উপাদান নির্দেশিকা', 'Scan a product': 'পণ্য স্ক্যান করুন', 'Scan barcode': 'বারকোড স্ক্যান করুন', 'Halal Ingredient Guide': 'হালাল উপাদান নির্দেশিকা' },
    fr: { Language: 'Langue', Overview: 'Aperçu', 'Scan history': 'Historique des scans', 'Ingredient guide': 'Guide des ingrédients', 'Scan a product': 'Scanner un produit', 'Scan barcode': 'Scanner le code-barres', 'Halal Ingredient Guide': 'Guide des ingrédients halal' },
    de: { Language: 'Sprache', Overview: 'Übersicht', 'Scan history': 'Scanverlauf', 'Ingredient guide': 'Zutatenleitfaden', 'Scan a product': 'Produkt scannen', 'Scan barcode': 'Barcode scannen', 'Halal Ingredient Guide': 'Halaler Zutatenleitfaden' },
    es: { Language: 'Idioma', Overview: 'Resumen', 'Scan history': 'Historial de escaneos', 'Ingredient guide': 'Guía de ingredientes', 'Scan a product': 'Escanear producto', 'Scan barcode': 'Escanear código de barras', 'Halal Ingredient Guide': 'Guía de ingredientes halal' },
    tr: { Language: 'Dil', Overview: 'Genel bakış', 'Scan history': 'Tarama geçmişi', 'Ingredient guide': 'İçerik rehberi', 'Scan a product': 'Ürün tara', 'Scan barcode': 'Barkod tara', 'Halal Ingredient Guide': 'Helal içerik rehberi' },
    ms: { Language: 'Bahasa', Overview: 'Gambaran keseluruhan', 'Scan history': 'Sejarah imbasan', 'Ingredient guide': 'Panduan ramuan', 'Scan a product': 'Imbas produk', 'Scan barcode': 'Imbas kod bar', 'Halal Ingredient Guide': 'Panduan ramuan halal' },
    id: { Language: 'Bahasa', Overview: 'Ringkasan', 'Scan history': 'Riwayat pemindaian', 'Ingredient guide': 'Panduan bahan', 'Scan a product': 'Pindai produk', 'Scan barcode': 'Pindai kode batang', 'Halal Ingredient Guide': 'Panduan bahan halal' }
  };
  const dictionaries = Object.fromEntries(supported.map((language) => [language, { ...en, ...(translations[language] || {}) }]));
  const originalText = new WeakMap();
  function get(key, language = 'en') { return dictionaries[language]?.[key] || dictionaries.en[key] || key; }
  function apply(language = 'en') {
    const dictionary = dictionaries[language] || dictionaries.en;
    document.documentElement.dataset.language = language;
    document.documentElement.dir = 'ltr';
    document.documentElement.lang = language;
    document.querySelectorAll('[data-i18n]').forEach((element) => { element.textContent = get(element.dataset.i18n, language); });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => { element.placeholder = get(element.dataset.i18nPlaceholder, language); });
    document.querySelectorAll('[data-i18n-aria-label]').forEach((element) => { element.setAttribute('aria-label', get(element.dataset.i18nAriaLabel, language)); });
    const rtlText = rtl.has(language);
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    textNodes.forEach((node) => {
      if (node.parentElement.closest('script,style,[data-no-translate]')) return;
      if (!originalText.has(node)) originalText.set(node, node.nodeValue);
      const source = originalText.get(node).trim();
      if (!source) return;
      const key = Object.keys(dictionary).sort((a, b) => b.length - a.length).find((candidate) => {
        const index = source.indexOf(candidate);
        if (index < 0) return false;
        const before = source[index - 1] || '';
        const after = source[index + candidate.length] || '';
        return !(/[A-Za-z0-9]/.test(before) || /[A-Za-z0-9]/.test(after));
      });
      if (!key || !dictionary[key]) return;
      node.nodeValue = originalText.get(node).replace(key, dictionary[key]);
    });
    document.querySelectorAll('main h1, main h2, main h3, main p, main label, main button, main a, main small, main strong, main summary, .sidebar label, .sidebar button, .sidebar a, .sidebar small').forEach((element) => { element.dir = rtlText ? 'rtl' : 'auto'; });
    document.querySelectorAll('input, textarea').forEach((element) => { element.dir = 'ltr'; });
    document.querySelectorAll('select').forEach((element) => { element.dir = rtlText ? 'rtl' : 'ltr'; });
    return dictionary;
  }
  return { supported, rtl, dictionaries, get, apply };
})();
