import logoUrl from '../medias/logo.png?url';
export function installWelcomeLogo(root:HTMLElement):()=>void{
 let source:SVGSVGElement|HTMLImageElement|null=null,overlay:HTMLImageElement|null=null,resize:ResizeObserver|null=null,restore:(()=>void)|null=null;
 const cleanup=()=>{resize?.disconnect();resize=null;overlay?.remove();overlay=null;restore?.();restore=null;source=null;};
 const update=()=>{
  if(source?.isConnected&&overlay?.isConnected)return;
  cleanup();
  const excluded='header,nav,aside,[role="menu"],[role="dialog"]';
  const picker=Array.from(root.querySelectorAll('button')).find(b=>!b.closest(excluded)&&/(sélectionner|charger|ouvrir) (un )?fichier/i.test(b.textContent??''));
  if(!picker)return;
  for(let area=picker.parentElement;area&&area!==root;area=area.parentElement){
   if(!Array.from(area.querySelectorAll('button')).some(b=>/enregistrer/i.test(b.textContent??'')))continue;
   const candidates=Array.from(area.querySelectorAll<SVGSVGElement>('svg')).filter(svg=>!svg.closest(`button,${excluded}`));
   const svg=candidates.find(s=>s.classList.contains('zonyx-brand-logo')||s.querySelector('circle'))??candidates[0];
   const image=Array.from(area.querySelectorAll<HTMLImageElement>('img')).find(img=>!img.closest(`button,${excluded}`)&&/logo|icon/i.test(img.src));
   const node=svg??image,parent=node?.parentElement;if(!node||!parent)continue;
   source=node;const oldVisibility=node.style.visibility,oldPosition=parent.style.position;
   if(getComputedStyle(parent).position==='static')parent.style.position='relative';
   const img=document.createElement('img');overlay=img;img.src=logoUrl;img.alt='';img.setAttribute('aria-hidden','true');img.draggable=false;img.className='zonyx-welcome-vinyl zonyx-brand-logo';
   Object.assign(img.style,{position:'absolute',maxWidth:'none',objectFit:'contain'});
   const measure=()=>{const a=node.getBoundingClientRect(),b=parent.getBoundingClientRect();Object.assign(img.style,{left:`${a.left-b.left-parent.clientLeft+parent.scrollLeft}px`,top:`${a.top-b.top-parent.clientTop+parent.scrollTop}px`,width:`${a.width}px`,height:`${a.height}px`});};
   node.style.visibility='hidden';parent.appendChild(img);measure();resize=new ResizeObserver(measure);resize.observe(node);resize.observe(parent);
   restore=()=>{node.style.visibility=oldVisibility;parent.style.position=oldPosition;};break;
  }
 };
 const observer=new MutationObserver(records=>{if(records.some(r=>Array.from(r.addedNodes).concat(Array.from(r.removedNodes)).some(n=>n instanceof Element)))update();});
 observer.observe(root,{childList:true,subtree:true});update();return()=>{observer.disconnect();cleanup();};
}
