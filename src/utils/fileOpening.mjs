let count=0;const listeners=new Set();
export const getOpeningSnapshot=()=>count;
export function subscribeFileOpening(listener){listeners.add(listener);return()=>listeners.delete(listener);}
const notify=()=>{for(const listener of [...listeners])listener();};
const paint=()=>new Promise(resolve=>typeof requestAnimationFrame==='function'?requestAnimationFrame(()=>setTimeout(resolve,0)):setTimeout(resolve,0));
export async function withFileOpening(work){count++;try{notify();await paint();return await work();}finally{count--;notify();}}

let welcomeCount=0;
export const getWelcomeSnapshot=()=>welcomeCount>0;
export function registerWelcomeArtwork(){welcomeCount++;notify();let active=true;return()=>{if(!active)return;active=false;welcomeCount--;notify();};}
