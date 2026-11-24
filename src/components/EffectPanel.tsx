import React,{useEffect,useRef,useState} from 'react';
import {constrainPanel,type PanelBox} from './effectUiMath';
import {EffectHelp} from './EffectHelp';
import {colorEffectText} from './EffectName';
import './effectPanel.css';
type Props=React.ComponentPropsWithoutRef<'section'>&{minWidth?:number;minHeight?:number};
export function EffectPanel({children,minWidth=520,minHeight=320,style,...props}:Props){
 const legacy=props.className?.includes('atz-legacy'),mw=Math.max(minWidth,legacy?520:900),mh=Math.max(minHeight,legacy?320:480);
 const ref=useRef<HTMLElement>(null),drag=useRef<{mode:'move'|'resize';x:number;y:number;box:PanelBox}|null>(null),[box,setBox]=useState<PanelBox|null>(null);
 const fit=(b:PanelBox)=>constrainPanel(b,innerWidth,innerHeight,mw,mh);
 const measure=():PanelBox=>{const r=ref.current!.getBoundingClientRect();return {left:r.left,top:r.top,width:r.width,height:r.height};};
 useEffect(()=>{const resize=()=>setBox(b=>b?constrainPanel(b,innerWidth,innerHeight,mw,mh):null);window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize);},[mw,mh]);
 const begin=(e:React.PointerEvent<HTMLElement>,mode:'move'|'resize')=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();e.currentTarget.setPointerCapture(e.pointerId);const b=fit(measure());drag.current={mode,x:e.clientX,y:e.clientY,box:b};setBox(b);};
 const end=()=>{drag.current=null;};
 const content=React.Children.map(children,c=>!React.isValidElement<{children?:React.ReactNode}>(c)||c.type!=='header'?c:React.cloneElement(c,{},React.Children.map(c.props.children,p=>React.isValidElement<{'aria-label'?:string}>(p)&&p.type==='button'&&p.props['aria-label']?.startsWith('Fermer')?<span className="atz-effect-header-actions"><EffectHelp panelRef={ref}/>{p}</span>:colorEffectText(p))));
 return <section {...props} ref={ref} style={{...style,minWidth:`min(${mw}px, calc(100vw - 32px))`,minHeight:`min(${mh}px, calc(100vh - 32px))`,...(box?{position:'fixed',...box,maxWidth:'none',maxHeight:'none'}:{})}} onPointerDown={e=>{const t=e.target as Element;if(t.closest('header')?.parentElement===ref.current&&!t.closest('button,input,select,textarea,a,[role="slider"]'))begin(e,'move');}} onPointerMove={e=>{const d=drag.current;if(d)setBox(fit(d.mode==='move'?{...d.box,left:d.box.left+e.clientX-d.x,top:d.box.top+e.clientY-d.y}:{...d.box,width:d.box.width+e.clientX-d.x,height:d.box.height+e.clientY-d.y}));}} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}>{content}<button type="button" className="atz-resize-grip" aria-label="Redimensionner la fenêtre d’effet" title="Glisser · Double-clic : taille initiale · Flèches : ajuster" onDoubleClick={()=>{end();setBox(null);}} onPointerDown={e=>begin(e,'resize')} onKeyDown={e=>{if(e.key==='Home'){e.preventDefault();setBox(null);return;}if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const b=box??measure(),s=e.shiftKey?2:12;setBox(fit({...b,width:b.width+(e.key==='ArrowRight'?s:e.key==='ArrowLeft'?-s:0),height:b.height+(e.key==='ArrowDown'?s:e.key==='ArrowUp'?-s:0)}));}}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M18 2V18H2Z" fill="currentColor"/></svg></button></section>;
}
