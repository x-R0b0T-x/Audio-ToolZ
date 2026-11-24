import React,{useEffect,useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import helpImage from '../medias/help.png?url';
import proImage from '../medias/pro.png?url';
import {getEffectHelp} from './effectHelpContent.mjs';
import {presentEffectHelp} from './effectHelpPresentation.mjs';
import {EffectName} from './EffectName';
import './effectHelp.css';
const helpFor=(title:string)=>presentEffectHelp(title,getEffectHelp(title).topics);
export function EffectHelp({panelRef}:{panelRef:React.RefObject<HTMLElement|null>}){
 const [open,setOpen]=useState(false),[expanded,setExpanded]=useState<Set<number>>(()=>new Set()),[content,setContent]=useState(()=>helpFor('')),[position,setPosition]=useState({left:8,top:8}),[offer,setOffer]=useState<{left:number;top:number}|null>(null);
 const trigger=useRef<HTMLButtonElement>(null),dialog=useRef<HTMLElement>(null),timer=useRef(0),drag=useRef<{dx:number;dy:number}|null>(null),id=useId();
 const size=()=>({w:Math.max(1,Math.min(680,innerWidth-16)),h:Math.max(1,Math.min(560,innerHeight-16))});
 const hideOffer=()=>{clearTimeout(timer.current);timer.current=window.setTimeout(()=>setOffer(null),180);};
 const showOffer=()=>{clearTimeout(timer.current);if(open)return;const r=panelRef.current?.getBoundingClientRect();if(!r)return;const width=270,height=110,left=r.right+width+12<=innerWidth?r.right+8:r.left-width-8>=8?r.left-width-8:Math.max(8,innerWidth-width-8);setOffer({left,top:Math.max(8,Math.min(innerHeight-height-8,r.top+4))});};
 const show=()=>{clearTimeout(timer.current);setOffer(null);setExpanded(new Set());setContent(helpFor(panelRef.current?.querySelector('h2')?.textContent??'Effet'));const {w,h}=size();setPosition({left:Math.max(8,(innerWidth-w)/2),top:Math.max(8,(innerHeight-h)/2)});setOpen(true);};
 const close=()=>{setOpen(false);trigger.current?.focus();};
 useEffect(()=>()=>clearTimeout(timer.current),[]);useEffect(()=>{if(open)dialog.current?.focus({preventScroll:true});},[open]);
 useEffect(()=>{const resize=()=>{const {w,h}=size();setPosition(p=>({left:Math.max(8,Math.min(innerWidth-w-8,p.left)),top:Math.max(8,Math.min(innerHeight-h-8,p.top))}));setOffer(null);};window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize);},[]);
 const {w,h}=size();
 return <><span className="atz-effect-help" onMouseEnter={showOffer} onMouseLeave={hideOffer}><button ref={trigger} type="button" className="atz-help-trigger" aria-label="Mes conseils pour cet effet" aria-haspopup="dialog" aria-expanded={open} onFocus={showOffer} onBlur={hideOffer} onClick={()=>open?close():show()}>?</button></span>
 {offer&&!open&&createPortal(<button type="button" className="atz-help-offer" style={offer} onMouseEnter={()=>clearTimeout(timer.current)} onMouseLeave={hideOffer} onFocus={()=>clearTimeout(timer.current)} onBlur={hideOffer} onClick={show}><img src={helpImage} alt="" draggable={false}/><span>Besoin d’aide ?</span></button>,document.body)}
 {open&&createPortal(<aside ref={dialog} tabIndex={-1} role="dialog" aria-modal="false" aria-labelledby={`${id}-title`} className="atz-help-dialog" style={{...position,width:w,height:h}} onKeyDown={e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();close();}}}><div className="atz-help-bar" onPointerDown={e=>{if(e.button!==0||(e.target as Element).closest('button'))return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);drag.current={dx:e.clientX-position.left,dy:e.clientY-position.top};}} onPointerMove={e=>{const d=drag.current;if(d)setPosition({left:Math.max(8,Math.min(innerWidth-w-8,e.clientX-d.dx)),top:Math.max(8,Math.min(innerHeight-h-8,e.clientY-d.dy))});}} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}} onLostPointerCapture={()=>{drag.current=null;}}><h2 id={`${id}-title`}><EffectName name={content.title}/></h2><button type="button" aria-label="Fermer l’aide" onClick={close}>×</button></div><div className="atz-help-layout"><img className="atz-help-professor" src={proImage} alt="Je vous accompagne dans les réglages" draggable={false}/><div className="atz-help-bubble" tabIndex={0} role="region" aria-label="Mes explications sur cet effet">{content.topics.map(([label,text],index)=><section className="atz-help-topic" key={label}><button type="button" className="atz-help-link" aria-expanded={expanded.has(index)} aria-controls={`${id}-${index}`} onClick={()=>setExpanded(old=>{const next=new Set(old);if(!next.delete(index))next.add(index);return next;})}>{label}</button><p id={`${id}-${index}`} hidden={!expanded.has(index)}>{text}</p></section>)}</div></div></aside>,document.body)}</>;
}
