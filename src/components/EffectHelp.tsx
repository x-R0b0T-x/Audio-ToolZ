import React,{useEffect,useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import helpImage from '../medias/help.png?url';
import proImage from '../medias/pro.png?url';
import {getEffectHelp} from './effectHelpContent.mjs';
import './effectHelp.css';
export function EffectHelp({panelRef}:{panelRef:React.RefObject<HTMLElement|null>}){
 const [open,setOpen]=useState(false),[selected,setSelected]=useState<number|null>(null),[content,setContent]=useState(()=>getEffectHelp(''));
 const trigger=useRef<HTMLButtonElement>(null),heading=useRef<HTMLHeadingElement>(null),scroll=useRef<HTMLDivElement>(null),id=useId();
 const close=()=>{setOpen(false);trigger.current?.focus();};
 useEffect(()=>{if(open){heading.current?.focus();if(scroll.current)scroll.current.scrollTop=0;}},[open,selected]);
 const show=()=>{setContent(getEffectHelp(panelRef.current?.querySelector('h2')?.textContent??'Effet'));setSelected(null);setOpen(true);};
 return <><span className="atz-effect-help"><button ref={trigger} className="atz-help-trigger" type="button" title="Aide" aria-label="Aide de cet effet avec ATZ" aria-haspopup="dialog" aria-expanded={open} aria-controls={open?id:undefined} onClick={()=>open?close():show()}>?</button>
 {!open&&<span className="atz-help-preview" aria-hidden="true"><img src={helpImage} alt=""/><span>Besoin d’aide ?</span></span>}</span>
 {open&&createPortal(<aside id={id} className="atz-help-dialog" role="dialog" aria-modal="false" aria-labelledby={`${id}-title`} onKeyDown={e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();close();}}}>
 <div className="atz-help-bar"><h2 id={`${id}-title`}>L’aide d’ATZ · {content.title}</h2><button type="button" aria-label="Fermer uniquement l’aide" onClick={close}>×</button></div>
 <div className="atz-help-layout"><img className="atz-help-professor" src={proImage} alt="ATZ vous explique les commandes"/>
 <div ref={scroll} className="atz-help-bubble" tabIndex={0} role="region" aria-label="Explications défilantes d’ATZ">
 <h3 ref={heading} tabIndex={-1}>{selected===null?'Besoin d’un coup de main ?':content.topics[selected][0]}</h3>
 {selected===null?<><p>Cliquez sur une commande pour que je vous explique à quoi elle sert et comment vous en servir.</p><nav aria-label="Commandes de l’effet">{content.topics.map(([label],index)=><button className="atz-help-link" type="button" key={label} onClick={()=>setSelected(index)}>{label}</button>)}</nav></>:<><p>{content.topics[selected][1]}</p><button type="button" className="atz-help-link" onClick={()=>setSelected(null)}>Retour aux commandes</button></>}
 </div></div></aside>,document.body)}</>;
}
