// Storage may be denied by browser settings. Keep the application usable with
// ephemeral state; never infer analytics consent from a storage failure.
function safeStorage(kind:'localStorage'|'sessionStorage'){
 const memory=new Map<string,string>();
 return{
  getItem(key:string):string|null{try{return window[kind].getItem(key);}catch{return memory.get(key)??null;}},
  setItem(key:string,value:string):void{memory.set(key,String(value));try{window[kind].setItem(key,String(value));}catch{/* Ephemeral state only. */}},
  removeItem(key:string):void{memory.delete(key);try{window[kind].removeItem(key);}catch{/* Storage denied. */}},
 };
}
export const safeLocalStorage=safeStorage('localStorage');
export const safeSessionStorage=safeStorage('sessionStorage');
