// Windows Playwright WebKit lacks canvas.captureStream/MediaStream. Simulate
// media transport only; the WASM decoder still receives actual barcode pixels.
exports.installCanvasStreamFallback=()=>{
 if(typeof HTMLCanvasElement.prototype.captureStream==='function')return;
 HTMLCanvasElement.prototype.captureStream=function(){const track={stop(){},addEventListener(){},getCapabilities(){return {}}};return{canvas:this,getTracks:()=>[track],getVideoTracks:()=>[track]};};
 Object.defineProperty(HTMLMediaElement.prototype,'srcObject',{configurable:true,get(){return this._qaStream||null;},set(v){this._qaStream=v;}});
 Object.defineProperty(HTMLMediaElement.prototype,'readyState',{configurable:true,get:()=>4});
 Object.defineProperty(HTMLVideoElement.prototype,'videoWidth',{configurable:true,get(){return this._qaStream?.canvas?.width||640;}});
 Object.defineProperty(HTMLVideoElement.prototype,'videoHeight',{configurable:true,get(){return this._qaStream?.canvas?.height||480;}});
 HTMLMediaElement.prototype.play=async function(){};
 const draw=CanvasRenderingContext2D.prototype.drawImage;
 CanvasRenderingContext2D.prototype.drawImage=function(image,...args){return draw.call(this,image instanceof HTMLVideoElement?image._qaStream.canvas:image,...args);};
};

