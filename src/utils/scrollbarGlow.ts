const ATTR='data-zonyx-scroll';
/* Marque l'element qui defile ou dont la barre est saisie : le CSS allume alors le halo vert de la barre. */
export function installScrollbarGlow():()=>void{
 const timers=new Map<Element,number>(),held=new Set<Element>();
 const clearLater=(el:Element)=>{
  const old=timers.get(el);if(old)window.clearTimeout(old);
  timers.set(el,window.setTimeout(()=>{timers.delete(el);if(!held.has(el))el.removeAttribute(ATTR);},650));
 };
 const glow=(el:Element)=>{el.setAttribute(ATTR,'');clearLater(el);};
 const owner=(target:EventTarget|null):Element|null=>target===document||target===document.body?document.documentElement:target instanceof Element?target:null;
 const onScroll=(event:Event)=>{const el=owner(event.target);if(el)glow(el);};
 const onDown=(event:MouseEvent)=>{
  const el=owner(event.target);if(!el)return;
  const r=el.getBoundingClientRect(),vertical=el.scrollHeight>el.clientHeight&&event.clientX>=r.left+el.clientLeft+el.clientWidth,horizontal=el.scrollWidth>el.clientWidth&&event.clientY>=r.top+el.clientTop+el.clientHeight;
  if(vertical||horizontal){held.add(el);glow(el);}
 };
 const release=()=>{for(const el of held){held.delete(el);clearLater(el);}};
 document.addEventListener('scroll',onScroll,true);
 window.addEventListener('mousedown',onDown,true);
 window.addEventListener('mouseup',release,true);
 window.addEventListener('blur',release);
 return()=>{
  document.removeEventListener('scroll',onScroll,true);window.removeEventListener('mousedown',onDown,true);window.removeEventListener('mouseup',release,true);window.removeEventListener('blur',release);
  for(const [el,timer] of timers){window.clearTimeout(timer);el.removeAttribute(ATTR);}timers.clear();held.clear();
 };
}
