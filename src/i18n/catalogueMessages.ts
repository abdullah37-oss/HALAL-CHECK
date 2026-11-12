const languages = ['en','it','ar','ur','hi','bn','fr','de','es','tr','ms','id'];
const rows = [
 ['Ingredients await packaging verification.','Gli ingredienti attendono la verifica della confezione.','المكونات بانتظار التحقق من العبوة.','اجزاء کی پیکنگ سے تصدیق ہونا باقی ہے۔','सामग्री का पैकेट से सत्यापन बाकी है।','প্যাকেট থেকে উপাদান যাচাই বাকি আছে।','Les ingrédients doivent être vérifiés sur l’emballage.','Die Zutaten müssen anhand der Verpackung geprüft werden.','Los ingredientes están pendientes de verificación en el envase.','İçerikler ambalajdan doğrulanmayı bekliyor.','Ramuan menunggu pengesahan pada bungkusan.','Bahan menunggu verifikasi pada kemasan.'],
 ['Catalogue data','Dati del catalogo','بيانات الكتالوج','کیٹلاگ کا ڈیٹا','कैटलॉग डेटा','ক্যাটালগের তথ্য','Données du catalogue','Katalogdaten','Datos del catálogo','Katalog verileri','Data katalog','Data katalog']
];
export const catalogueMessages = Object.fromEntries(rows.map(row => [row[0], Object.fromEntries(languages.map((lang,index) => [lang,row[index]]))]));
