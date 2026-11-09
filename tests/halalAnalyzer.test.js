// Browser-run test cases for the deterministic analyzer.
// Load ingredientDatabase.js and halalAnalyzer.js before executing this file.
const halalAnalyzerTestCases = [
  [['milk'], 'likely-halal'],
  [['milk', 'bacterial cultures'], 'likely-halal'],
  [['milk', 'strawberries', 'sugar', 'cultures'], 'likely-halal'],
  [['milk', 'sugar', 'pork gelatin'], 'not-halal'],
  [['milk', 'sugar', 'gelatin'], 'needs-checking'],
  [['wheat flour', 'water', 'yeast', 'salt'], 'likely-halal'],
  [['flour', 'water', 'lard'], 'not-halal'],
  [[], 'not-enough-information'],
  [['flour', 'water', 'salt', 'E471'], 'needs-checking'],
  [['flour', 'water', 'salt', 'E471 (plant-derived)'], 'likely-halal'],
  [['flour', 'water', 'sorbitol'], 'likely-halal']
];

function runHalalAnalyzerTests(analyzer = window.halalAnalyzer) {
  halalAnalyzerTestCases.forEach(([ingredients, expected]) => {
    const actual = analyzer.analyze(ingredients).classification;
    if (actual !== expected) throw new Error(`${ingredients.join(', ')} expected ${expected}, received ${actual}`);
  });
  return `${halalAnalyzerTestCases.length} halal analyzer tests passed`;
}

function runProductIntegrityTests() {
  const yogurt = window.productRepository.getByBarcode('80771548').product;
  const yogurtResult = window.halalAnalyzer.analyze(yogurt.ingredients);
  if (yogurtResult.classification !== 'needs-checking') throw new Error('Yogurt flavouring must require source verification');
  if (yogurt.ingredients.some((item) => /pork|gelatin|lard/i.test(item.originalText))) throw new Error('Fixture contains an invented prohibited ingredient');
  if (window.halalAnalyzer.analyze(['milk', 'pork gelatin']).classification !== 'not-halal') throw new Error('Pork gelatin evidence was not detected');
  if (window.halalAnalyzer.analyze(['milk', 'gelatin']).classification !== 'needs-checking') throw new Error('Unknown gelatin source was not doubtful');
  if (window.halalAnalyzer.analyze([]).classification !== 'not-enough-information') throw new Error('Missing ingredients were not insufficient');
  if (window.halalAnalyzer.analyze(['milk', 'sugar', 'fruit', 'flavouring']).classification === 'not-halal') throw new Error('Unspecified flavouring caused a false haram');
  const productA = window.halalAnalyzer.analyze(['milk', 'pork gelatin']);
  const productB = window.halalAnalyzer.analyze(['milk', 'sugar', 'pectin']);
  if (productA.classification !== 'not-halal' || productB.classification !== 'likely-halal') throw new Error('Product analyses are not isolated');
  if (window.productRepository.validateReturnedProduct('A123', window.productModel.createProduct({ scannedBarcode: 'A123', returnedBarcode: 'B456', productName: 'Wrong', brand: 'Wrong', ingredientsRaw: 'lard', ingredientDataSource: 'product_database', dataQuality: 'api' })).status !== 'identity-mismatch') throw new Error('Barcode mismatch was accepted');
  if (!window.productModel.compareSources(['milk'], ['milk', 'gelatin']).conflict) throw new Error('API/OCR conflict was merged');
  ['strutto', 'grasso suino', 'gelatina suina'].forEach((item) => { if (window.halalAnalyzer.analyze([item]).classification !== 'not-halal') throw new Error(`Italian prohibited ingredient failed: ${item}`); });
  if (window.halalAnalyzer.analyze(['sorbitol', 'xylitol', 'mannitol', 'cetyl alcohol']).classification !== 'likely-halal') throw new Error('Alcohol false positive');
  return 'Product integrity tests passed';
}

function runUniversalPolicyTests() {
  const policy = window.universalHalalPolicy;
  const cases = [['PORK', 'not-halal'], ['PECTIN', 'likely-halal'], ['GELATIN', 'needs-checking']];
  cases.forEach(([id, expected]) => {
    const record = window.ingredientDatabase.find((item) => item.id === id);
    if (!record || record.assessmentCode !== expected) throw new Error(`${id} has inconsistent central assessment`);
    policy.languages.forEach((language) => {
      if (window.halalAnalyzer.analyze([record.translations[language]], { language }).classification !== expected) throw new Error(`${id} changed in ${language}`);
    });
  });
  const product = window.productRepository.getByBarcode('80771548').product;
  const baseline = window.halalAnalyzer.analyze(product.ingredients, { language: 'en' }).classification;
  policy.languages.forEach((language) => { if (window.halalAnalyzer.analyze(product.ingredients, { language }).classification !== baseline) throw new Error(`Language changed result: ${language}`); });
  if (window.halalAnalyzer.analyze(product.ingredients, { language: 'ar', country: 'IT' }).classification !== baseline) throw new Error('Country changed result');
  if (window.halalAnalyzer.analyze(product.ingredients, { certified: false }).certification !== 'not-verified') throw new Error('Certification was not kept separate');
  if (new Set(window.ingredientDatabase.map((record) => record.id)).size !== window.ingredientDatabase.length) throw new Error('Duplicate ingredient IDs');
  if (product.ingredients.some((item) => item.originalText === 'Pork')) throw new Error('Reference ingredient leaked into product');
  return 'Universal policy tests passed';
}
