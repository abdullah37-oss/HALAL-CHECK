import {isRetailBarcode} from '../../lib/barcode';
export type AssistantMode = 'ask' | 'name' | 'barcode' | 'ingredients';
export type Intent = {kind:'barcode';barcode:string}|{kind:'name';query:string}|{kind:'ingredients';text:string}|{kind:'why'|'source'|'missing'|'help'}|{kind:'ingredient';text:string};
const normalize=(value:string)=>value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').trim();
const cues={
 why:['why','explain result','perche','pourquoi','warum','por que','neden','kenapa','mengapa','لماذا','کیوں','क्यों','কেন'],
 source:['source','fonte','origine','quelle','fuente','kaynak','sumber','مصدر','ماخذ','स्रोत','উৎস'],
 missing:['missing','manca','manque','fehlt','falta','eksik','kurang','مفقود','نامعلوم','अधूर','অনুপস্থিত'],
 explain:['explain','what is','what does','spiega','cosa','che cos','explique','qu est','was ist','erklare','que es','acikla','nedir','jelaskan','apa itu','اشرح','ما هو','وضاحت','کیا ہے','समझ','क्या है','ব্যাখ্যা','কি'],
 product:['this product','this yogurt','questo','ce produit','dieses','este producto','bu urun','produk ini','هذا','یہ','इस','এই'],
};
export function resolveIntent(input:string,mode:AssistantMode='ask',hasContext=false):Intent{
 const text=input.trim().slice(0,4000),n=normalize(text);
 if(!text)return{kind:'help'};
 if(mode==='ingredients')return{kind:'ingredients',text};
 if(mode==='name')return{kind:'name',query:text};
 if(mode==='barcode')return{kind:'barcode',barcode:text};
 const digits=text.match(/(?<!\d)\d{8,14}(?!\d)/g)||[];
 if(digits.length===1&&isRetailBarcode(digits[0]))return{kind:'barcode',barcode:digits[0]};
 if(/^\d+$/.test(text))return{kind:'barcode',barcode:text};
 for(const kind of ['why','source','missing'] as const)if(cues[kind].some(cue=>n.includes(normalize(cue))))return{kind:hasContext?kind:'help'};
 if(hasContext&&cues.product.some(cue=>n.includes(normalize(cue))))return{kind:'why'};
 if(cues.explain.some(cue=>n.includes(normalize(cue)))||/\bhalal\b|\bharam\b|حلال|حرام|हलाल|हराम|হালাল|হারাম/.test(n)||/^e[\s-]?\d{3}[a-z]?$/i.test(text))return{kind:'ingredient',text};
 if(/[,;\n\u060c\u061b]/.test(text))return{kind:'ingredients',text};
 return{kind:'name',query:text};
}
export function safeSourceUrl(value:unknown):string|null{
 try{const u=new URL(String(value));return u.protocol==='https:'&&u.hostname==='world.openfoodfacts.org'&&/^\/product\/\d{8,14}(?:\/[^?]*)?$/.test(u.pathname)&&!u.username&&!u.password&&!u.search&&!u.hash?u.href:null;}catch{return null;}
}
export const referenceSources=Object.freeze([
 {title:'HalalCheck ingredient policy',url:'/docs/HALAL_ANALYSIS_POLICY.md'},
 {title:'EU additive specifications',url:'https://eur-lex.europa.eu/eli/reg/2012/231/oj'},
]);
