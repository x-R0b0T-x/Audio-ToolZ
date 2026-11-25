export function installTextExceptions(root:HTMLElement):()=>void{
 const marked=new Set<HTMLElement>();
 const update=(element:Element)=>{
  if(!(element instanceof HTMLElement)||element.closest('svg,script,style'))return;
  const keep=element.childElementCount===0&&/^(?:Stéréo|Durée)\s*:?$/u.test(element.textContent?.trim()??'');
  if(keep){element.setAttribute('data-zonyx-green-label','');marked.add(element);}
  else if(marked.delete(element))element.removeAttribute('data-zonyx-green-label');
 };
 const scan=(element:Element)=>{update(element);for(const child of element.querySelectorAll('span,label,small,p,strong,b,div,dt'))update(child);};
 scan(root);
 const observer=new MutationObserver(records=>{
  for(const record of records){
   if(record.target instanceof Element)update(record.target);
   else if(record.target.parentElement)update(record.target.parentElement);
   for(const node of record.addedNodes)if(node instanceof Element)scan(node);
  }
  for(const element of marked)if(!root.contains(element)){marked.delete(element);element.removeAttribute('data-zonyx-green-label');}
 });
 observer.observe(root,{subtree:true,childList:true,characterData:true});
 return()=>{observer.disconnect();for(const element of marked)element.removeAttribute('data-zonyx-green-label');marked.clear();};
}
