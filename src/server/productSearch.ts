import {DatabaseSync} from 'node:sqlite';
import {resolve} from 'node:path';
import {isRetailBarcode,barcodeIdentity} from '../lib/barcode';
import {boundedJson,record,OFF_USER_AGENT,SUPPORTED_LANGUAGES,retryTime} from '../services/openFoodFacts';
import type {SearchCandidate} from '../types/search';
const clean=(v:unknown,max=200)=>typeof v==='string'?v.trim().slice(0,max):'';
export function searchCatalogue(query:string):SearchCandidate[]{
 let db:DatabaseSync|undefined;
 try{
  db=new DatabaseSync(resolve('data/italy/catalogue.sqlite'),{readOnly:true});
  const terms=query.toLowerCase().split(/\s+/).filter(Boolean).slice(0,8);
  const where=terms.map(()=>"lower(product_name||' '||brand) LIKE ? ESCAPE '\\'").join(' AND ');
  return db.prepare('SELECT barcode,product_name,brand,quantity FROM products WHERE '+where+' ORDER BY product_name LIMIT 12').all(...terms.map(t=>'%'+t.replace(/[\\%_]/g,'\\$&')+'%')).flatMap(row=>isRetailBarcode(row.barcode)?[{barcode:String(row.barcode),name:clean(row.product_name),brand:clean(row.brand),quantity:clean(row.quantity,80),source:'catalogue' as const,sourceUrl:'https://world.openfoodfacts.org/product/'+row.barcode}]:[]);
 }catch{return [];}finally{db?.close();}
}
export function createProductSearch({fetcher=fetch,now=Date.now,localSearch=searchCatalogue}:{fetcher?:typeof fetch;now?:()=>number;localSearch?:(query:string)=>SearchCandidate[]}={}){
 const cache=new Map<string,{until:number;products:SearchCandidate[]}>(),pending=new Map<string,Promise<SearchCandidate[]>>();
 let calls:number[]=[],ingress:number[]=[],blockedUntil=0,blockedReason='rate-limited';
 const send=(status:number,body:unknown,headers:Record<string,string>={})=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
 return async(request:Request):Promise<Response>=>{
  const u=new URL(request.url),q=(u.searchParams.get('q')||'').trim(),lang=u.searchParams.get('lang')||'en',online=u.searchParams.get('online')==='1';
  const words=q.normalize('NFKC').replace(/[^\p{L}\p{N}\p{M}\s]/gu,' ').replace(/\s+/g,' ').trim().slice(0,100);
  if(request.method!=='GET')return send(405,{error:'method-not-allowed'},{Allow:'GET'});
  if(request.headers.get('sec-fetch-site')==='cross-site'||request.headers.get('origin')&&request.headers.get('origin')!==u.origin)return send(403,{error:'cross-origin-request-denied'});
  if([...u.searchParams.keys()].some(k=>!['q','lang','online'].includes(k))||['q','lang','online'].some(k=>u.searchParams.getAll(k).length>1)||q.length<3||q.length>100||!words||/[\u0000-\u001f]/.test(q)||!SUPPORTED_LANGUAGES.includes(lang)||u.searchParams.has('online')&&!['0','1'].includes(u.searchParams.get('online')||''))return send(400,{error:'invalid-request'});
  ingress=ingress.filter(t=>now()-t<60000);if(ingress.length>=30)return send(429,{error:'rate-limited'},{'Retry-After':'60'});ingress.push(now());
  const local=localSearch(q),key=q.toLowerCase()+':'+lang;
  const merged=(remote:SearchCandidate[])=>[...local,...remote].filter((p,i,all)=>all.findIndex(v=>barcodeIdentity(v.barcode)===barcodeIdentity(p.barcode))===i).slice(0,12);
  if(!online)return send(200,{products:local,remoteStatus:'not-requested',classification:null});
  for(const[k,v]of cache)if(v.until<=now())cache.delete(k);
  const hit=cache.get(key);if(hit)return send(200,{products:merged(hit.products),remoteStatus:'cached',classification:null});
  if(blockedUntil>now())return send(local.length?200:blockedReason==='rate-limited'?429:503,{products:local,remoteStatus:blockedReason,classification:null},{'Retry-After':String(Math.max(1,Math.ceil((blockedUntil-now())/1000)))});
  let work=pending.get(key);
  if(!work){
   calls=calls.filter(t=>now()-t<60000);if(calls.length>=6||pending.size>=3)return send(local.length?200:429,{products:local,remoteStatus:'rate-limited',classification:null},{'Retry-After':'60'});
   calls.push(now());
   work=(async()=>{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);
    try{
     // Official Search-a-licious API, plain product words only. Advanced Lucene
     // operators/filters are not part of the product-name interface.
     const url=new URL('https://search.openfoodfacts.org/search');
     for(const[k,v]of Object.entries({q:words,page_size:'12',page:'1',fields:'code,product_name,brands,quantity',langs:[...new Set([lang,'en'])].join(',')}))url.searchParams.set(k,v);
     const response=await fetcher(url,{signal:controller.signal,redirect:'error',credentials:'omit',headers:{Accept:'application/json','User-Agent':OFF_USER_AGENT}});
     if(response.status===429||response.status===503||response.headers.has('retry-after')){blockedReason=response.status===429?'rate-limited':'unavailable';blockedUntil=retryTime(response.headers.get('retry-after'),now());throw Error(blockedReason);}
     if(!response.ok||Number(response.headers.get('content-length')||0)>1024*1024)throw Error('search-unavailable');
     const body:unknown=await boundedJson(response);if(!record(body)||!Array.isArray(body.hits)||body.hits.length>100||body.timed_out===true)throw Error('invalid-response');
     const results=body.hits.slice(0,12).flatMap(p=>record(p)&&isRetailBarcode(p.code)&&clean(p.product_name)?[{barcode:String(p.code),name:clean(p.product_name),brand:clean(Array.isArray(p.brands)?p.brands.filter(v=>typeof v==='string').slice(0,3).join(', '):p.brands),quantity:clean(p.quantity,80),source:'Open Food Facts' as const,sourceUrl:'https://world.openfoodfacts.org/product/'+p.code}]:[]);
     cache.set(key,{until:now()+600000,products:results});while(cache.size>64)cache.delete(cache.keys().next().value!);return results;
    }finally{clearTimeout(timer);}
   })();pending.set(key,work);
  }
  try{return send(200,{products:merged(await work),remoteStatus:'available',retrievedAt:new Date(now()).toISOString(),classification:null});}
  catch{return send(local.length?200:blockedUntil>now()&&blockedReason==='rate-limited'?429:503,{products:local,remoteStatus:blockedUntil>now()?blockedReason:'unavailable',classification:null},{'Retry-After':String(Math.max(1,Math.ceil((Math.max(blockedUntil,now()+60000)-now())/1000)))});}
  finally{pending.delete(key);}
 };
}
