// Evidence-oriented ingredient records. Source-dependent ingredients are never
// promoted to halal or haram without a confirmed origin.
export interface IngredientRecord { name: string; aliases: string[]; italian: string; arabic?: string; category: string; assessment: 'permissible' | 'prohibited' | 'source-dependent'; explanation: string; source: string; conditions: string; id?: string; assessmentCode?: string; translations?: Record<string, string>; policyVersion?: string; evidence?: string; }
export const ingredientDatabase: IngredientRecord[] = [
  { name: 'Milk', aliases: ['milk', 'latte', 'latte intero', 'latte scremato', 'whole milk', 'skimmed milk', 'uht milk', 'pasteurised milk', 'حليب'], italian: 'Latte', arabic: 'حليب', category: 'Dairy', assessment: 'permissible', explanation: 'Ordinary milk is generally permissible.', source: 'Dairy', conditions: 'Assess added flavours and processing separately.' },
  { name: 'Milk cultures', aliases: ['milk cultures', 'bacterial cultures', 'cultures', 'fermenti lattici', 'starter culture'], italian: 'Fermenti lattici', category: 'Dairy', assessment: 'permissible', explanation: 'Ordinary microbial cultures used in dairy are generally permissible.', source: 'Microbial', conditions: 'Confirm the culture medium where relevant.' },
  { name: 'Butter', aliases: ['butter', 'burro'], italian: 'Burro', category: 'Dairy', assessment: 'permissible', explanation: 'Butter is generally permissible.', source: 'Dairy', conditions: 'Check added flavourings.' },
  { name: 'Cream', aliases: ['cream', 'panna'], italian: 'Panna', category: 'Dairy', assessment: 'permissible', explanation: 'Plain cream is generally permissible.', source: 'Dairy', conditions: 'Check added ingredients.' },
  { name: 'Yogurt', aliases: ['yogurt', 'plain yogurt', 'natural yogurt', 'yoghurt'], italian: 'Yogurt', category: 'Dairy', assessment: 'permissible', explanation: 'Plain yogurt ingredients are generally permissible.', source: 'Dairy', conditions: 'Gelatin and flavourings require separate assessment.' },
  { name: 'Whey', aliases: ['whey', 'milk powder', 'lactose', 'milk proteins', 'casein', 'caseinates'], italian: 'Siero di latte', category: 'Dairy', assessment: 'permissible', explanation: 'Milk-derived ingredients are generally permissible.', source: 'Dairy', conditions: 'Processing aids may need verification.' },
  { name: 'Wheat flour', aliases: ['wheat', 'wheat flour', 'flour', 'wholemeal flour', 'farina', 'farina di grano', 'farina integrale'], italian: 'Farina di grano', category: 'Grains', assessment: 'permissible', explanation: 'Wheat and flour are generally permissible.', source: 'Plant', conditions: 'Check added fats and processing aids.' },
  { name: 'Rice', aliases: ['rice', 'riso'], italian: 'Riso', category: 'Grains', assessment: 'permissible', explanation: 'Rice is generally permissible.', source: 'Plant', conditions: '' },
  { name: 'Cornstarch', aliases: ['corn', 'maize', 'cornstarch', 'starch', 'amido di mais', 'amido'], italian: 'Amido di mais', category: 'Grains', assessment: 'permissible', explanation: 'Plant starches are generally permissible.', source: 'Plant', conditions: '' },
  { name: 'Oats', aliases: ['oats', 'avena'], italian: 'Avena', category: 'Grains', assessment: 'permissible', explanation: 'Oats are generally permissible.', source: 'Plant', conditions: '' },
  { name: 'Sugar', aliases: ['sugar', 'zucchero', 'سكر'], italian: 'Zucchero', arabic: 'سكر', category: 'Other', assessment: 'permissible', explanation: 'Sugar is generally permissible; processing can vary.', source: 'Plant', conditions: 'Check processing if a strict standard requires it.' },
  { name: 'Salt', aliases: ['salt', 'sale'], italian: 'Sale', category: 'Other', assessment: 'permissible', explanation: 'Salt is generally permissible.', source: 'Mineral', conditions: '' },
  { name: 'Water', aliases: ['water', 'acqua'], italian: 'Acqua', category: 'Other', assessment: 'permissible', explanation: 'Water is generally permissible.', source: 'Mineral', conditions: '' },
  { name: 'Vegetable oil', aliases: ['olive oil', 'sunflower oil', 'rapeseed oil', 'vegetable oils', 'olio di oliva', 'olio di girasole', 'olio vegetale'], italian: 'Olio vegetale', category: 'Other', assessment: 'permissible', explanation: 'Plant oils are generally permissible.', source: 'Plant', conditions: 'Check blends and added processing aids.' },
  { name: 'Honey', aliases: ['honey', 'miele'], italian: 'Miele', category: 'Other', assessment: 'permissible', explanation: 'Honey is generally permissible.', source: 'Natural', conditions: '' },
  { name: 'Yeast', aliases: ['yeast', 'lievito'], italian: 'Lievito', category: 'Other', assessment: 'permissible', explanation: 'Ordinary baker’s yeast is generally permissible.', source: 'Microbial', conditions: 'Check added carriers.' },
  { name: 'Vinegar', aliases: ['vinegar', 'aceto'], italian: 'Aceto', category: 'Other', assessment: 'permissible', explanation: 'Vinegar is not treated as an alcoholic beverage.', source: 'Fermented food', conditions: 'Assess the stated product, not the word alcohol alone.' },
  { name: 'Pectin', aliases: ['pectin', 'pectina'], italian: 'Pectina', category: 'Other', assessment: 'permissible', explanation: 'Pectin is a plant-based thickener.', source: 'Plant', conditions: '' },
  { name: 'Citric acid', aliases: ['citric acid', 'acido citrico', 'e330'], italian: 'Acido citrico', category: 'Other', assessment: 'permissible', explanation: 'Citric acid is generally permissible.', source: 'Plant or synthetic', conditions: '' },
  { name: 'Flavouring', aliases: ['flavouring', 'flavourings', 'aroma', 'aromi'], italian: 'Aroma', category: 'Source-dependent', assessment: 'source-dependent', explanation: 'Unspecified flavouring is not automatically prohibited, but its composition and carriers need verification.', source: 'Unspecified', conditions: 'Transparency note: verify the flavouring source if a stricter assessment is required.' },
  { name: 'Fruit and vegetables', aliases: ['fruit', 'fruits', 'vegetables', 'strawberries', 'strawberries and raspberries', 'blueberries', 'blackberries', 'raspberries', 'fragole', 'mirtilli', 'more', 'lamponi', 'dates', 'dried fruits', 'nuts', 'seeds', 'frutta', 'verdure'], italian: 'Frutta e verdura', category: 'Fruit & vegetables', assessment: 'permissible', explanation: 'Ordinary fruits, vegetables, nuts and seeds are generally permissible.', source: 'Plant', conditions: 'Assess coatings and flavourings separately.' },
  { name: 'Pork', aliases: ['pork', 'pork meat', 'maiale', 'carne di maiale', 'bacon', 'pancetta', 'ham', 'prosciutto', 'lard', 'lardo', 'lard fat', 'pork fat', 'grasso suino', 'strutto', 'pork gelatin', 'gelatina suina', 'لحم الخنزير'], italian: 'Maiale / Strutto', arabic: 'لحم الخنزير', category: 'Prohibited', assessment: 'prohibited', explanation: 'Clearly pork-derived ingredients are prohibited under this screening assessment.', source: 'Pork', conditions: '' },
  { name: 'Blood', aliases: ['blood', 'blood plasma', 'sangue', 'plasma sanguigno'], italian: 'Sangue', category: 'Prohibited', assessment: 'prohibited', explanation: 'Blood ingredients are flagged as prohibited under this screening assessment.', source: 'Animal', conditions: '' },
  { name: 'Alcoholic beverage', aliases: ['alcoholic beverage', 'wine', 'vino', 'beer', 'birra', 'spirits', 'liquor', 'superalcolici', 'ethanol', 'etanolo'], italian: 'Bevanda alcolica', category: 'Prohibited', assessment: 'prohibited', explanation: 'Clearly identified alcoholic beverages and ethanol are flagged; chemical “-ol” ingredients are not matched by this rule.', source: 'Fermentation', conditions: 'Do not confuse sugar alcohols or fatty alcohols with beverages.' },
  { name: 'Gelatin', aliases: ['gelatin', 'gelatine', 'gelatina', 'gelatina alimentare', 'e441'], italian: 'Gelatina alimentare', category: 'Source-dependent', assessment: 'source-dependent', explanation: 'Gelatin is animal-derived; fish or other animal source and processing must be verified. Plant gelling agents such as pectin are separate ingredients. The source must be established.', source: 'Unknown until verified', conditions: 'Confirmed permissible source may be assessed as permissible; prohibited source is haram.' },
  { name: 'Mono- and diglycerides', aliases: ['e471', 'mono and diglycerides', 'mono- and diglycerides', 'mono e digliceridi'], italian: 'Mono e digliceridi degli acidi grassi', category: 'Source-dependent', assessment: 'source-dependent', explanation: 'E471 can have plant or animal origins. Verify the source.', source: 'Plant or animal', conditions: 'Plant-derived source is permissible for this screening.' },
  { name: 'Emulsifier E472', aliases: ['e472a', 'e472b', 'e472c', 'e472e', 'e472f'], italian: 'E472', category: 'Source-dependent', assessment: 'source-dependent', explanation: 'E472 additives may use different fatty-acid sources. Verify the source.', source: 'Plant or animal', conditions: 'Source evidence is required.' },
  { name: 'Other source-dependent additive', aliases: ['e470a', 'e470b', 'e470i', 'e470ii', 'e422', 'e631', 'e627', 'e904', 'e920', 'animal rennet', 'caglio animale', 'enzymes', 'enzimi', 'animal fat', 'grasso animale', 'glycerol', 'glicerolo'], italian: 'Additivo da verificare', category: 'Source-dependent', assessment: 'source-dependent', explanation: 'This ingredient can have more than one origin or composition. Verify the source.', source: 'Unknown until verified', conditions: 'Do not infer an animal or pork source from an ambiguous name.' },
  { name: 'Sorbitol', aliases: ['sorbitol', 'sorbitolo', 'xylitol', 'mannitol', 'cetyl alcohol'], italian: 'Sorbitolo', category: 'Other', assessment: 'permissible', explanation: 'Sugar alcohols and fatty alcohols are not alcoholic beverages by name alone.', source: 'Chemical or plant', conditions: 'Assess the stated ingredient and product use.' }
];

// Chemical identities: Commission Regulation (EU) 231/2012 specifications.
// These are ingredient-screening judgments, not EU halal certification.
// Separate source-dependent additives above retain their source requirements.
const additional: Array<[string, string[], string]> = [
  ['Dextrose', ['dextrose', 'destrosio', 'glucose', 'glucosio', 'glucose syrup', 'sciroppo di glucosio'], 'Plant starch sugar'],
  ['Cocoa', ['cocoa', 'cacao', 'cocoa butter', 'burro di cacao', 'cocoa powder', 'cacao in polvere'], 'Cocoa plant'],
  ['Soy', ['soy', 'soya', 'soia', 'soybeans', 'sojabohnen'], 'Plant'],
  ['Guar gum', ['guar gum', 'gomma di guar', 'e412'], 'Guar seed polysaccharide'],
  ['Cellulose', ['cellulose', 'cellulosa', 'methylcellulose', 'metilcellulosa', 'e460', 'e461'], 'Cellulose; assess added carriers separately'],
  ['Sodium carbonates', ['sodium bicarbonate', 'bicarbonato di sodio', 'carbonati di sodio', 'e500', 'e500i', 'e500ii'], 'Inorganic carbonate'],
  ['Potassium sorbate', ['potassium sorbate', 'sorbato di potassio', 'e202'], 'Sorbic acid salt'],
  ['Ascorbic acid', ['ascorbic acid', 'acido ascorbico', 'e300'], 'Ascorbic acid'],
  ['Tomato', ['tomato', 'tomatoes', 'pomodoro', 'pomodori', 'concentrato di pomodoro'], 'Plant'],
  ['Potato', ['potato', 'potatoes', 'patata', 'patate'], 'Plant'],
  ['Hazelnut', ['hazelnut', 'hazelnuts', 'nocciola', 'nocciole'], 'Plant'],
  ['Walnut', ['walnut', 'walnuts', 'noce', 'noci'], 'Plant'],
  ['Almond', ['almond', 'almonds', 'mandorla', 'mandorle'], 'Plant']
  ,['Carbon dioxide', ['carbon dioxide', 'anidride carbonica', 'e290'], 'Inorganic gas']
  ,['Phosphoric acid', ['phosphoric acid', 'acido fosforico', 'e338'], 'Inorganic acid']
  ,['Spices', ['spices', 'spezie'], 'Ordinary plant spices; mixtures and carriers assessed separately']
  ,['Modified starch', ['modified starch', 'amido modificato'], 'Plant starch; not a rule for unspecified emulsifiers']
  ,['Yeast extract', ['yeast extract', 'estratto di lievito'], 'Yeast; no inference about unspecified carriers']
  ,['Microbial rennet', ['microbial rennet', 'caglio microbico', 'caglio di origine microbica'], 'Explicit microbial origin; no animal slaughter inference']
  ,['Sesame', ['sesame seeds', 'semi di sesamo', 'semi di sesamo integrali'], 'Plant seed']
  ,['Spelt', ['spelt', 'farro', 'grano farro precotto'], 'Plant grain']
];
for (const [name, aliases, source] of additional) ingredientDatabase.push({ name, aliases, italian: aliases[1], category: 'Other', assessment: 'permissible', source, conditions: 'Assess all other ingredients and carriers separately.', explanation: 'The identified ordinary plant or chemically specified ingredient is permissible under the documented screening policy. This does not establish product certification.', evidence: 'Identity reference: https://eur-lex.europa.eu/eli/reg/2012/231/oj ; plant foods: documented default policy. No inference about unidentified mixtures.' });
const extraAliases: Record<string, string[]> = {
  'Milk': ['latte pastorizzato', 'latte parzialmente scremato', 'latte scremato pastorizzato', 'latte parzialmente scremato uht'],
  'Cream': ['panna uht'],
  'Rice': ['riso medio nero integrale parboiled'],
  'Milk cultures': ['fermenti lattici vivi'],
  'Wheat flour': ['farina di frumento', 'farina di grano tenero', 'farina di grano tenero tipo 0', 'farina di grano tenero tipo 00', 'semola di grano duro'],
  'Whey': ['lattosio', 'latte in polvere', 'proteine del latte'],
  'Vegetable oil': ['olio di semi di girasole', 'olio di colza', 'olio di palma', 'palmfett', 'colza', 'olio extravergine di oliva', 'olio extravergine di oliva dop'],
  'Salt': ['sale da cucina', 'iodized salt', 'sale iodato'],
  'Pectin': ['e440', 'e440i', 'pectine'],
  'Cornstarch': ['farina di mais'],
  'Yeast': ['lievito di birra', "brewer's yeast", 'brewers yeast'],
  'Vinegar': ["aceto d'alcol", 'aceto di vino', 'wine vinegar', 'red wine vinegar', 'white wine vinegar'],
  'Other source-dependent additive': ['caglio', 'rennet'],
};
for (const record of ingredientDatabase) record.aliases.push(...(extraAliases[record.name] || []));
window.ingredientDatabase = ingredientDatabase;
