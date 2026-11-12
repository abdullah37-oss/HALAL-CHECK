import {resolveIntent,safeSourceUrl,type AssistantMode} from './conversation';
import {assistantMessages} from './messages';
import {safeLocalStorage} from '../../lib/storage';
import {isRetailBarcode,sameBarcode} from '../../lib/barcode';
import {validateImageFile} from '../image-recognition/image';
import type {Product} from '../../models/productModel';
import type {Analysis} from '../../utils/halalAnalyzer';
import type {IngredientRecord} from '../../data/ingredientDatabase';
import type {SearchCandidate} from '../../types/search';
type Context={kind:'product'|'label';product:Product;analysis:Analysis}|{kind:'ingredient';record:IngredientRecord};
type Message={role:'user';text:string}|{role:'assistant';key?:string;context?:Context;candidates?:SearchCandidate[];sourceOnly?:boolean};
const required=<T extends HTMLElement>(id:string)=>{const node=document.getElementById(id);if(!node)throw Error('Missing assistant control');return node as T;};
const chat=required<HTMLDivElement>('assistant-chat'),input=required<HTMLTextAreaElement>('assistant-input'),mode=required<HTMLSelectElement>('assistant-mode'),form=required<HTMLFormElement>('assistant-form'),send=required<HTMLButtonElement>('assistant-send'),online=required<HTMLInputElement>('assistant-online'),status=required<HTMLDivElement>('assistant-status'),cancel=required<HTMLButtonElement>('assistant-cancel');
const languageSelect=required<HTMLSelectElement>('assistant-language'),photo=required<HTMLInputElement>('assistant-photo'),photoKind=required<HTMLSelectElement>('assistant-photo-kind'),ocrLanguage=required<HTMLSelectElement>('assistant-ocr-language'),review=required<HTMLDivElement>('assistant-review'),reviewText=required<HTMLTextAreaElement>('assistant-review-text'),complete=required<HTMLInputElement>('assistant-complete'),confirm=required<HTMLButtonElement>('assistant-confirm');
let language=safeLocalStorage.getItem('halalcheck-language')||'en';if(!window.halalI18n.supported.includes(language))language='en';
window.halalI18n.register(assistantMessages);
const t=(key:string)=>window.halalI18n.get(key,language);
let messages:Message[]=[],context:Context|null=null,sequence=0,controller:AbortController|null=null,retryAt=0;
let recognized:{confidence:number;kind:string}|null=null;
const node=<K extends keyof HTMLElementTagNameMap>(tag:K,text='',className=''):HTMLElementTagNameMap[K]=>{const result=document.createElement(tag);result.textContent=text;if(className)result.className=className;return result;};
function add(message:Message){messages.push(message);messages=messages.slice(-40);render();}
function link(parent:HTMLElement,title:string,url:string){const a=node('a',title);a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.referrerPolicy='no-referrer';parent.append(a);}
function renderContext(parent:HTMLElement,value:Context,sourceOnly=false){
 if(value.kind==='ingredient'){
  parent.append(node('p',t('Ingredient reference, not a product decision.')),node('h2',window.universalHalalPolicy.translate(value.record,language)),node('p',window.universalHalalPolicy.label(value.record.assessmentCode||'needs-checking',language)));
  if(value.record.assessment==='source-dependent')parent.append(node('p',t('Source needs verification.')),node('p',t('Ask the manufacturer to confirm the source.')));
  // This is a named policy reference, never a fabricated product citation.
  link(parent,t('Ingredient guide'),'/#guide');return;
 }
 const {product,analysis}=value,classification=analysis.classification;
 const title=classification==='likely-halal'?'HALAL':classification==='not-halal'?'HARAM':'NEEDS CHECKING';
 if(!sourceOnly){
  parent.dataset.result=title==='HALAL'?'halal':title==='HARAM'?'haram':'uncertain';
  const heading=node('h2',t(title));heading.dataset.assistantResult=title;parent.append(heading);
  if(value.kind==='product'){const name=node('strong',product.productName||t('Product information'));name.dir='auto';parent.append(name);if(product.brand)parent.append(node('p',product.brand));parent.append(node('small',product.returnedBarcode));}
  const reason=analysis.recognitionUncertain?'Reading confidence is low. Correct the text or enter ingredients manually.':analysis.evidenceComplete===false?'The ingredient list may be incomplete.':title==='HALAL'?'Ingredients support a Halal assessment.':title==='HARAM'?'A prohibited ingredient was identified.':!analysis.findings.length?'Ingredients are unavailable.':'Cannot confirm the ingredient source.';
  parent.append(node('p',t(reason)));
  const findings=analysis.findings.filter(f=>title==='HARAM'?f.classification==='not-halal':title==='HALAL'?true:f.classification==='needs-checking').filter((f,i,all)=>all.findIndex(v=>v.ingredient===f.ingredient)===i).slice(0,8);
  const list=node('ul');for(const f of findings){const item=node('li'),ingredient=node('strong',f.ingredient);ingredient.dir='auto';item.append(ingredient);if(f.classification==='needs-checking')item.append(node('span',' — '+t(f.record?.assessment==='source-dependent'?'Source needs verification.':'Ingredient needs review.')));list.append(item);}if(findings.length)parent.append(list);
  if(title==='NEEDS CHECKING')parent.append(node('p',t('Ask the manufacturer to confirm the source.')));
  parent.append(node('p',t('Halal certification: Not verified'),'assistant-note'));
 }
 const candidateSource=safeSourceUrl(product.sourceUrl);
 const source=candidateSource&&sameBarcode(new URL(candidateSource).pathname.split('/')[2],product.returnedBarcode)?candidateSource:null;
 if(source)link(parent,'Open Food Facts · '+t('Show source'),source);else parent.append(node('p',t('Review recognized text')+' · '+t('Ingredient assessment is not certification. Check current packaging.'),'assistant-note'));
 if(source)parent.append(node('small',new Date(product.lastUpdated).toLocaleDateString(language)));
}
function render(){
 chat.replaceChildren();
 for(const message of messages){
  const bubble=node('article','','assistant-message');bubble.dataset.role=message.role;bubble.dataset.noTranslate='';
  if(message.role==='user'){bubble.textContent=message.text;bubble.dir='auto';}
  else{
   if(message.key)bubble.append(node('p',t(message.key)));
   if(message.context)renderContext(bubble,message.context,message.sourceOnly);
   if(message.candidates){bubble.append(node('p',t('Confirm brand, flavour and size before choosing.')));for(const p of message.candidates){const row=node('div','','assistant-candidate'),name=node('strong',p.name);name.dir='auto';row.append(name,node('small',[p.brand,p.quantity,p.barcode].filter(Boolean).join(' · ')));const choose=node('button',t('Check this barcode'),'button button-secondary');choose.type='button';choose.addEventListener('click',()=>void lookup(p.barcode));row.append(choose);const source=safeSourceUrl(p.sourceUrl);if(source)link(row,p.source,source);bubble.append(row);}}
  }chat.append(bubble);
 }
 chat.scrollTop=chat.scrollHeight;
}
function busy(key:string){send.disabled=!!key;cancel.hidden=!key;photo.disabled=!!key;status.textContent=key?t(key):'';}
function stop(){sequence++;controller?.abort();controller=null;recognized=null;review.hidden=true;reviewText.value='';complete.checked=false;confirm.disabled=true;busy('');}
function begin(key:string){stop();controller=new AbortController();busy(key);return{token:sequence,signal:controller.signal};}
function canLookup(){if(!online.checked){add({role:'assistant',key:'Allow free online product lookups'});online.focus();return false;}if(Date.now()<retryAt){add({role:'assistant',key:'Too many requests. Please wait before trying again.'});return false;}return true;}
async function lookup(barcode:string){
 if(!isRetailBarcode(barcode)){add({role:'assistant',key:'Enter a barcode or ingredient list'});return;}
 if(!canLookup())return;
 const {token,signal}=begin('Looking up product…');context=null;
 try{
  const result=await window.productRepository.lookup(barcode,{language,fetcher:async(url,init)=>{
   const combined=new AbortController(),abort=()=>combined.abort();signal.addEventListener('abort',abort,{once:true});init?.signal?.addEventListener('abort',abort,{once:true});if(signal.aborted||init?.signal?.aborted)combined.abort();
   try{return await fetch(url,{...init,signal:combined.signal});}finally{signal.removeEventListener('abort',abort);init?.signal?.removeEventListener('abort',abort);}
  }});
  if(token!==sequence)return;
  if(result.status!=='verified'||!sameBarcode(barcode,result.product.returnedBarcode)){if('retryAt'in result)retryAt=result.retryAt||0;add({role:'assistant',key:result.status==='rate-limited'?'Too many requests. Please wait before trying again.':'No matching products found. Scan the ingredient label.'});return;}
  const product={...result.product,certification:'not-verified'},analysis=window.halalAnalyzer.analyze(product.ingredients,{language,evidenceComplete:product.ingredientEvidence?.state==='complete'&&!result.stale});
  context={kind:'product',product,analysis};add({role:'assistant',context});
 }catch{if(token===sequence)add({role:'assistant',key:'Local help works offline. Online product data may be unavailable.'});}
 finally{if(token===sequence)busy('');}
}
function candidatesFrom(value:unknown):SearchCandidate[]{
 if(typeof value!=='object'||value===null||!('products'in value)||!Array.isArray(value.products))throw Error('Invalid search');
 return value.products.slice(0,12).filter((p):p is SearchCandidate=>typeof p==='object'&&p!==null&&isRetailBarcode(p.barcode)&&typeof p.name==='string'&&p.name.length<=200&&typeof p.brand==='string'&&p.brand.length<=200&&typeof p.quantity==='string'&&p.quantity.length<=80&&['catalogue','Open Food Facts'].includes(p.source)&&!!safeSourceUrl(p.sourceUrl)&&new URL(p.sourceUrl).pathname.split('/')[2]===p.barcode);
}
async function search(query:string){
 if(query.trim().length<3||query.length>100){add({role:'assistant',key:'Select a product or confirm its full ingredient label first.'});return;}
 if(online.checked&&Date.now()<retryAt){add({role:'assistant',key:'Too many requests. Please wait before trying again.'});return;}
 const {token,signal}=begin('Searching free product data…');context=null;
 const requestController=controller,timer=setTimeout(()=>requestController?.abort(),8000);
 try{
  const response=await fetch('/api/product-search?'+new URLSearchParams({q:query.trim(),lang:language,online:online.checked?'1':'0'}),{signal,credentials:'same-origin'});
  if(token!==sequence)return;
  if(response.status===429){retryAt=Date.now()+Math.min(3600,Number(response.headers.get('retry-after'))||60)*1000;add({role:'assistant',key:'Too many requests. Please wait before trying again.'});return;}
  if(!response.ok)throw Error('Unavailable');const body:unknown=await response.json();if(token!==sequence)return;
  const products=candidatesFrom(body);add({role:'assistant',key:products.length?'Choose a product variant':'No matching products found. Scan the ingredient label.',candidates:products.length?products:undefined});
  if(typeof body==='object'&&body!==null&&'remoteStatus'in body&&['unavailable','rate-limited'].includes(String(body.remoteStatus)))add({role:'assistant',key:'Local help works offline. Online product data may be unavailable.'});
 }catch{if(token===sequence)add({role:'assistant',key:'Local help works offline. Online product data may be unavailable.'});}
 finally{clearTimeout(timer);if(token===sequence)busy('');}
}
function assess(text:string,ocrConfidence?:number){
 context=null;
 const product=window.productModel.createProduct({productName:'',brand:'',ingredientsRaw:text,ingredientDataSource:ocrConfidence===undefined?'user_corrected':'user_confirmed_ocr',certification:'not-verified'});
 const analysis=window.halalAnalyzer.analyze(product.ingredients,{language,evidenceComplete:true,ocrConfirmed:true,...(ocrConfidence===undefined?{}:{ocrConfidence:ocrConfidence/100})});
 context={kind:'label',product,analysis};add({role:'assistant',context});
}
async function submit(text:string,selectedMode=mode.value as AssistantMode){
 if(!text.trim()||text.length>4000)return;add({role:'user',text});let intent=resolveIntent(text,selectedMode,!!context);
 if(selectedMode==='ask'&&intent.kind==='name'){
  const exact=window.halalAnalyzer.findRecord(text),normalized=window.halalAnalyzer.normalize(text);
  if(exact&&[...exact.aliases,...Object.values(exact.translations||{})].some(alias=>window.halalAnalyzer.normalize(alias)===normalized))intent={kind:'ingredient',text};
 }
 switch(intent.kind){
  case'barcode':await lookup(intent.barcode);break;
  case'name':await search(intent.query);break;
  case'ingredients':stop();assess(intent.text);break;
  case'ingredient':{const record=window.halalAnalyzer.findRecord(intent.text);if(record){context={kind:'ingredient',record};add({role:'assistant',context});}else add({role:'assistant',key:'No matching ingredient rule. Try its exact name or E-number.'});break;}
  case'why':case'missing':case'source':if(context)add({role:'assistant',context,sourceOnly:intent.kind==='source'});else add({role:'assistant',key:'Select a product or confirm its full ingredient label first.'});break;
  default:add({role:'assistant',key:'Select a product or confirm its full ingredient label first.'});
 }
}
form.addEventListener('submit',event=>{event.preventDefault();const text=input.value;input.value='';void submit(text);});
cancel.addEventListener('click',()=>{stop();status.textContent=t('Enter the ingredient text manually.');});
required('assistant-clear').addEventListener('click',()=>{stop();context=null;messages=[];input.value='';photo.value='';add({role:'assistant',key:'Your food questions, clearly answered.'});});
function suggestions(){const holder=required('assistant-suggestions');holder.replaceChildren();for(const key of ['Why this result?','What is missing?','Show source','Read ingredient photo']){const button=node('button',t(key));button.type='button';button.addEventListener('click',()=>{if(key==='Read ingredient photo'){const details=document.querySelector<HTMLDetailsElement>('.assistant-photo-tools');if(details)details.open=true;photo.click();}else if(context)add({role:'assistant',context,sourceOnly:key==='Show source'});else add({role:'assistant',key:'Select a product or confirm its full ingredient label first.'});});holder.append(button);}}
languageSelect.value=language;languageSelect.addEventListener('change',()=>{language=languageSelect.value;safeLocalStorage.setItem('halalcheck-language',language);window.halalI18n.apply(language);render();suggestions();});
required('assistant-theme').addEventListener('click',()=>{document.documentElement.dataset.theme=document.documentElement.dataset.theme==='dark'?'light':'dark';safeLocalStorage.setItem('halalcheck-theme',document.documentElement.dataset.theme);});
photo.addEventListener('change',()=>void(async()=>{
 const file=photo.files?.[0];if(!file)return;const kind=photoKind.value,{token,signal}=begin('Reading on your device…');context=null;
 try{
  validateImageFile(file);
  if(kind==='barcode'){const decoder=await import('/assets/barcode-decoder.js');if(token!==sequence)return;const code=await decoder.decodeImage(file);if(token!==sequence)return;busy('');if(code)await lookup(code);else add({role:'assistant',key:'Enter a barcode or ingredient list'});return;}
  const ocr=await import('/assets/ingredient-ocr.js');if(token!==sequence)return;
  const result=await ocr.recognizeLabel(file,ocrLanguage.value,progress=>{if(token===sequence)status.textContent=t('Reading on your device…')+' '+progress+'%';},signal);
  if(token!==sequence)return;if(typeof result.text!=='string')throw Error('Invalid recognized text');
  const confidence=typeof result.confidence==='number'&&Number.isFinite(result.confidence)&&result.confidence>=0&&result.confidence<=100?result.confidence:0;
  recognized={confidence,kind};reviewText.value=kind==='front'?result.text.replace(/\s+/g,' ').trim().slice(0,100):result.text;complete.checked=false;confirm.disabled=true;confirm.textContent=t(kind==='front'?'Search this name':'Confirm label');review.hidden=false;reviewText.focus();
  if(kind==='front'){confirm.disabled=!reviewText.value.trim();complete.closest('label')!.hidden=true;}else complete.closest('label')!.hidden=false;
 }catch{if(token===sequence)add({role:'assistant',key:'Enter the ingredient text manually.'});}
 finally{photo.value='';if(token===sequence)busy('');}
})());
function reviewReady(){confirm.disabled=!recognized||!reviewText.value.trim()||(recognized.kind!=='front'&&!complete.checked);}
complete.addEventListener('change',reviewReady);reviewText.addEventListener('input',reviewReady);
confirm.addEventListener('click',()=>{if(confirm.disabled||!recognized)return;const text=reviewText.value.trim(),previous=recognized;recognized=null;review.hidden=true;add({role:'user',text});if(previous.kind==='front')void search(text);else assess(text,previous.confidence);});
document.documentElement.dataset.theme=safeLocalStorage.getItem('halalcheck-theme')||'light';window.halalI18n.apply(language);suggestions();add({role:'assistant',key:'Your food questions, clearly answered.'});
const initialBarcode=new URLSearchParams(location.hash.slice(1)).get('barcode');
if(initialBarcode&&isRetailBarcode(initialBarcode)){mode.value='barcode';input.value=initialBarcode;}
window.addEventListener('pagehide',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
if('serviceWorker'in navigator)void navigator.serviceWorker.register('/sw.js').catch(()=>undefined);
