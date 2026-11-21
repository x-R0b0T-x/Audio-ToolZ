import React from 'react';
import type {Band} from '../audio/advancedDsp';
const shapes=[['off','Désactivé','M8 6L56 26M8 26L56 6'],['peaking','Cloche','M2 26H15C24 26 24 5 32 5S40 26 49 26H62'],['lowshelf','Plateau grave','M2 6H20C32 6 29 26 43 26H62'],['highshelf','Plateau aigu','M2 26H20C32 26 29 6 43 6H62'],['highpass','Coupe-bas','M2 28C18 28 18 6 33 6H62'],['lowpass','Coupe-haut','M2 6H31C46 6 46 28 62 28'],['bandpass','Passe-bande','M2 28C20 28 20 6 32 6S44 28 62 28'],['notch','Notch','M2 6H15C25 6 24 28 32 28S39 6 49 6H62']] as const;
export function FilterShape(p:{value:NonNullable<Band['type']>;index:number;onChange:(v:NonNullable<Band['type']>)=>void}){
 const current=shapes.find(s=>s[0]===p.value)??shapes[1];
 const icon=(d:string)=><svg viewBox="0 0 64 32" aria-hidden="true"><path d={d} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>;
 return <details className="atz-filter-shape"><summary aria-label={`Bande ${p.index+1} : ${current[1]}`} title={current[1]}>{icon(current[2])}</summary><div className="atz-shape-options" role="group" aria-label="Forme du filtre">{shapes.map(([value,label,d])=><button type="button" key={value} aria-label={label} title={label} aria-pressed={p.value===value} onClick={e=>{p.onChange(value);e.currentTarget.closest('details')?.removeAttribute('open');}}>{icon(d)}</button>)}</div></details>;
}
