const fs = require('node:fs');
const vm = require('node:vm');
function load() {
 const values = new Map();
 const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key,value) => values.set(key,String(value)), removeItem: (key) => values.delete(key) };
 const context=vm.createContext({window:{}, localStorage:storage,sessionStorage:storage, console, AbortController, setTimeout, clearTimeout});
 for (const file of ['src/data/ingredientDatabase.js','src/data/universalHalalPolicy.js','src/utils/halalAnalyzer.js','src/models/productModel.js','src/data/productCatalog.js','src/utils/productRepository.js','src/i18n/index.js']) vm.runInContext(fs.readFileSync('dist/'+file,'utf8'),context,{filename:file});
 return context;
}
module.exports={load};
