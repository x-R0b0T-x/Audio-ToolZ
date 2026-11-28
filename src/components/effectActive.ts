import {createContext} from 'react';
export interface EffectActive{active:boolean;setActive:(value:boolean)=>void}
export const EffectActiveContext=createContext<EffectActive|null>(null);
