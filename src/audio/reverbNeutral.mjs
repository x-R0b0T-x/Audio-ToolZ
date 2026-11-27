import {DEFAULT_REVERB} from './reverb.mjs';
/* Etat neutre de Z-Reverbe : le son entendu a l'ouverture est identique a l'original. */
export const NEUTRAL_REVERB=Object.freeze({...DEFAULT_REVERB,direct:100,reflections:0,reverb:0});
