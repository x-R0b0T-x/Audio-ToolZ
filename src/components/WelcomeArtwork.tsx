import {useEffect,useLayoutEffect,useRef,useState,useSyncExternalStore} from 'react';
import waitImage from '../medias/wait.png?url';
import {FileOpeningMessage} from './FileOpeningOverlay';
import {subscribeFileOpening,getOpeningSnapshot,registerWelcomeArtwork} from '../utils/fileOpening.mjs';
import artwork from '../medias/mix.png?url';
type Bounds={x:number;y:number;width:number;height:number};
export function WelcomeArtwork(){
 const loading=useSyncExternalStore(subscribeFileOpening,getOpeningSnapshot,()=>0)>0;
 useLayoutEffect(registerWelcomeArtwork,[]);
 const source=loading?waitImage:artwork;
 return <div className="zonyx-welcome-presentation" aria-busy={loading}><ArtworkFrame key={source} source={source} description={loading?'ZØNYX patiente pendant le chargement':'ZØNYX vous souhaite la bienvenue'}/>{loading&&<FileOpeningMessage/>}</div>;
}
function ArtworkFrame({source,description}:{source:string;description:string}){
  const stage=useRef<HTMLDivElement>(null),image=useRef<HTMLImageElement>(null);
  const bounds=useRef<Bounds|null>(null),current=useRef({width:340,height:180,offset:0});
  const [layout,setLayout]=useState(current.current);
  const refresh=useRef<()=>void>(()=>{});
  useEffect(()=>{
    const node=stage.current;if(!node)return;
    let frame=0;
    const measure=()=>{
      frame=0;const img=image.current;if(!img||!img.naturalWidth)return;
      if(!bounds.current){
        const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
        const ctx=canvas.getContext('2d');if(!ctx)return;ctx.drawImage(img,0,0);
        const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
        let x0=canvas.width,y0=canvas.height,x1=-1,y1=-1;
        for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(data[(y*canvas.width+x)*4+3]>=12){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
        bounds.current=x1>=x0?{x:x0,y:y0,width:x1-x0+1,height:y1-y0+1}:{x:0,y:0,width:canvas.width,height:canvas.height};
      }
      let parent=node.parentElement,target:DOMRect|null=null;
      while(parent&&parent!==document.body){
        const buttons=Array.from(parent.querySelectorAll('button'));
        const first=buttons.find(button=>/sélectionner|charger|ouvrir/i.test(button.textContent||''));
        const last=buttons.find(button=>/enregistrer/i.test(button.textContent||''));
        if(first&&last){const a=first.getBoundingClientRect(),b=last.getBoundingClientRect();target=new DOMRect(a.left,a.top,b.right-a.left,Math.max(a.height,b.height));break;}
        parent=parent.parentElement;
      }
      const box=node.getBoundingClientRect(),crop=bounds.current;
      const width=target&&target.width>0?target.width:Math.min(420,window.innerWidth-48);
      const offset=target?target.left+target.width/2-(box.left+box.width/2-current.current.offset):0;
      const next={width,height:width*crop.height/crop.width,offset};
      if(Object.keys(next).some(key=>Math.abs(next[key as keyof typeof next]-current.current[key as keyof typeof next])>.25)){current.current=next;setLayout(next);}
    };
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(measure);};refresh.current=schedule;
    const observer=new ResizeObserver(schedule);
    let parent:HTMLElement|null=node;for(let i=0;parent&&i<4;i++,parent=parent.parentElement)observer.observe(parent);
    window.addEventListener('resize',schedule);schedule();
    return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('resize',schedule);refresh.current=()=>{};};
  },[]);
  const crop=bounds.current,scale=crop?layout.width/crop.width:1;
  return <div ref={stage} data-zonyx-fitted-welcome style={{position:'relative',flexShrink:0,width:layout.width,height:layout.height,overflow:'hidden',transform:`translateX(${layout.offset}px)`}}><img ref={image} src={source} alt={description} draggable={false} onLoad={()=>refresh.current()} style={crop?{position:'absolute',maxWidth:'none',width:(image.current?.naturalWidth||crop.width)*scale,left:-crop.x*scale,top:-crop.y*scale}:{width:'100%',height:'100%',objectFit:'contain'}}/></div>;
}
