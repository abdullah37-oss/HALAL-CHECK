window.productCatalog = [
  window.productModel.createProduct({
    scannedBarcode: '80771548',
    returnedBarcode: '80771548',
    productName: 'VitaWell Yogurt Magro ai Frutti di Bosco',
    brand: 'VitaWell',
    ingredientsRaw: 'Pasteurised skimmed milk, live lactic cultures, fruit preparation 14% (blueberries, blackberries, strawberries and raspberries), sugar, pectin, flavouring (aroma), citric acid',
    ingredientDataSource: 'product_database',
    dataQuality: 'physical-label-fixture',
    ingredients: [
      'Pasteurised skimmed milk',
      'Live lactic cultures',
      'Fruit preparation 14%: blueberries, blackberries, strawberries and raspberries',
      'Sugar',
      'Pectin',
      'Flavouring (aroma)',
      'Citric acid'
    ].map((text) => window.productModel.createIngredient(text, 'product_database')),
    lastUpdated: '2026-10-31'
  })
];
