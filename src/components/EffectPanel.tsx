import React,{useContext,useEffect,useLayoutEffect,useRef,useState} from 'react';
import {constrainPanel,type PanelBox} from './effectUiMath';
import {EffectHelp} from './EffectHelp';
import {EffectStatus} from './EffectStatus';
import {EffectActiveContext} from './effectActive';
import {colorEffectText} from './EffectName';
import './effectPanel.css';
import './effectToggle.css';
type Props=React.ComponentPropsWithoutRef<'section'>&{minWidth?:number;minHeight?:number};
export function EffectPanel({children,minWidth=520,minHeight=320,style,...props}:Props){
 const legacy=props.className?.includes('zonyx-legacy'),mw=Math.max(minWidth,legacy?520:900),mh=Math.max(minHeight,legacy?320:480);
 const ref=useRef<HTMLElement>(null),drag=useRef<{mode:'move'|'resize';x:number;y:number;box:PanelBox}|null>(null),[box,setBox]=useState<PanelBox|null>(null),[resizing,setResizing]=useState(false),[floor,setFloor]=useState<{w:number;h:number}|null>(null);
 const active=useContext(EffectActiveContext),activeRef=useRef(active);activeRef.current=active;
 useLayoutEffect(()=>{const r=ref.current?.getBoundingClientRect();if(r&&r.width>0&&r.height>0)setFloor({w:Math.ceil(r.width),h:Math.ceil(r.height)});},[]);
 useEffect(()=>{
  const node=ref.current;if(!node)return;
  const wake=(e:Event)=>{
   const state=activeRef.current;if(!state||state.active)return;
   const t=e.target;if(!(t instanceof Element)||!t.closest('main')||t.closest('footer,header'))return;
   if(e instanceof PointerEvent&&e.button!==0)return;
   if(e instanceof KeyboardEvent&&!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End','PageUp','PageDown'].includes(e.key))return;
   if(!t.closest('input,select,[role="slider"],[data-eq-band],button[aria-pressed],.zonyx-gain,.zonyx-knob,.zonyx-parameter'))return;
   state.setActive(true);
  };
  const names=['pointerdown','wheel','keydown','input'];
  for(const name of names)node.addEventListener(name,wake,true);
  return()=>{for(const name of names)node.removeEventListener(name,wake,true);};
 },[]);
 const fw=Math.max(mw,floor?.w??0),fh=Math.max(mh,floor?.h??0);
 const fit=(b:PanelBox)=>constrainPanel(b,innerWidth,innerHeight,fw,fh);
 const measure=():PanelBox=>{const r=ref.current!.getBoundingClientRect();return {left:r.left,top:r.top,width:r.width,height:r.height};};
 useEffect(()=>{const resize=()=>setBox(b=>b?constrainPanel(b,innerWidth,innerHeight,fw,fh):null);window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize);},[fw,fh]);
 const begin=(e:React.PointerEvent<HTMLElement>,mode:'move'|'resize')=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();e.currentTarget.setPointerCapture(e.pointerId);const b=fit(measure());setResizing(mode==='resize');drag.current={mode,x:e.clientX,y:e.clientY,box:b};setBox(b);};
 const end=()=>{drag.current=null;setResizing(false);};
 const toggle=active?<button type="button" className={`zonyx-effect-toggle${active.active?' is-on':''}`} aria-pressed={active.active} aria-label={active.active?'Effet actif':'Effet inactif'} title={active.active?'Effet actif : cliquez pour écouter le son sans l’effet':'Effet inactif : cliquez pour réactiver l’effet'} onClick={()=>active.setActive(!active.active)}/>:null;
 const content=React.Children.map(children,c=>{
  if(!React.isValidElement<{children?:React.ReactNode}>(c))return c;
  if(c.type==='footer')return React.cloneElement(c,{},<EffectStatus panelRef={ref}/>,c.props.children,toggle);
  if(c.type!=='header')return c;
  return React.cloneElement(c,{},React.Children.map(c.props.children,p=>React.isValidElement<{'aria-label'?:string}>(p)&&p.type==='button'&&p.props['aria-label']?.startsWith('Fermer')?<span className="zonyx-effect-header-actions"><EffectHelp panelRef={ref}/>{p}</span>:colorEffectText(p)));
 });
 return <section {...props} className={`${props.className??''}${active&&!active.active?' zonyx-bypassed':''}`} ref={ref} style={{...style,minWidth:`min(${fw}px, calc(100vw - 32px))`,minHeight:`min(${fh}px, calc(100vh - 32px))`,...(box?{position:'fixed',...box,maxWidth:'none',maxHeight:'none'}:{})}} onPointerDown={e=>{const t=e.target as Element;if(t.closest('header')?.parentElement===ref.current&&!t.closest('button,input,select,textarea,a,[role="slider"]'))begin(e,'move');}} onPointerMove={e=>{const d=drag.current;if(d)setBox(fit(d.mode==='move'?{...d.box,left:d.box.left+e.clientX-d.x,top:d.box.top+e.clientY-d.y}:{...d.box,width:d.box.width+e.clientX-d.x,height:d.box.height+e.clientY-d.y}));}} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}>{content}<button type="button" className={`zonyx-resize-grip${resizing?' is-resizing':''}`} aria-label="Redimensionner la fenêtre d’effet" title="Glisser pour redimensionner · Flèches : ajuster" onDoubleClick={()=>{end();setBox(null);}} onPointerDown={e=>begin(e,'resize')} onKeyDown={e=>{if(e.key==='Home'){e.preventDefault();setBox(null);return;}if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const b=box??measure(),s=e.shiftKey?2:12;setBox(fit({...b,width:b.width+(e.key==='ArrowRight'?s:e.key==='ArrowLeft'?-s:0),height:b.height+(e.key==='ArrowDown'?s:e.key==='ArrowUp'?-s:0)}));}}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M18 2V18H2Z" fill="currentColor"/></svg></button></section>;
}
