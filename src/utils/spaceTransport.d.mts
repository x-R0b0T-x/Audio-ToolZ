type Names=Array<string|null|undefined>;
export function normalizeLabel(value:unknown):string;
export function findTransportControl<T extends {names:Names;disabled:boolean}>(controls:readonly T[],action:'play'|'loop'|'stop'):T|null;
export function createSpaceTransport<T extends {names:Names;disabled:boolean}>(env:{effectOpen:()=>boolean;recording:()=>boolean;playing:()=>boolean;controls:()=>readonly T[];activate:(control:T)=>void}):{keydown:(event:any)=>boolean;keyup:(event:any)=>boolean;reset:()=>void};
export function installSpaceTransport(deps:{isPlaying:()=>boolean;isRecording:()=>boolean},target?:Window):()=>void;
