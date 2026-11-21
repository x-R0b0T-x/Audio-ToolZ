import React,{useRef,useState} from 'react';
type Props={label:string;value:number;min:number;max:number;digits?:number;onCommit:(v:number)=>void};
export function NumericValue(p:Props){
 const [editing,setEditing]=useState(false),[draft,setDraft]=useState(''),done=useRef(false);
 const begin=()=>{done.current=false;setDraft(p.value.toFixed(p.digits??1));setEditing(true);};
 const finish=(cancel=false)=>{if(done.current)return;done.current=true;const text=draft.trim().replace(',','.'),v=Number(text);if(!cancel&&text&&Number.isFinite(v))p.onCommit(Math.max(p.min,Math.min(p.max,v)));setEditing(false);};
 return <span className="atz-value-entry" onDoubleClick={e=>{e.stopPropagation();if(!editing)begin();}}>{editing?<input type="text" inputMode="decimal" autoFocus aria-label={`${p.label} valeur`} value={draft} onFocus={e=>e.currentTarget.select()} onChange={e=>setDraft(e.target.value)} onBlur={()=>finish()} onKeyDown={e=>{e.stopPropagation();if(e.key==='Enter'){e.preventDefault();finish();}if(e.key==='Escape'){e.preventDefault();finish(true);}}}/>:<output tabIndex={0} aria-label={`${p.label} valeur`} title="Double-clic : saisir une valeur" onKeyDown={e=>{if(e.key==='Enter'||e.key==='F2'){e.preventDefault();e.stopPropagation();begin();}}}>{p.value.toFixed(p.digits??1)}</output>}</span>;
}
