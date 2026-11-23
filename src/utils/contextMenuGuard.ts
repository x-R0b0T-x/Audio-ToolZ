const EDITABLE='input:not([type="range"]):not([type="checkbox"]):not([type="radio"]):not([type="button"]),textarea,[contenteditable="true"]';
export function installContextMenuGuard():()=>void{
 const block=(event:MouseEvent)=>{
  if(event.target instanceof Element&&event.target.closest(EDITABLE))return;
  event.preventDefault();
 };
 window.addEventListener('contextmenu',block,true);
 return()=>window.removeEventListener('contextmenu',block,true);
}
