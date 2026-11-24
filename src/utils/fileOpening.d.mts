export function getOpeningSnapshot():number;
export function subscribeFileOpening(listener:()=>void):()=>void;
export function withFileOpening<T>(work:()=>Promise<T>):Promise<T>;
