import hashlib,os
from pathlib import Path
if os.environ.get('GITHUB_REF')!='refs/heads/v1.6-dev':raise SystemExit('Restricted branch')
key=hashlib.sha256(Path(__file__).read_text(encoding='utf-8').encode()).hexdigest()
marker=Path('.github/last-ui.applied')
if marker.exists():
    if marker.read_text().strip()!=key:raise SystemExit('Different final UI patch already applied')
    raise SystemExit(0)
expected={'src/components/DetailedEffectGraph.tsx':'af0c5576184ade5fb18feb17b068c10c892cb841','src/components/WaveformView.tsx':'94630d5eaa60324b3ed1a36bf7a23033b09a0ee5','src-tauri/src/main.rs':'ae84066da37ee259d6eeb7f4c03307ab48617cd3'}
pending={}
for name,sha in expected.items():
    b=Path(name).read_bytes().replace(bytes([13,10]),bytes([10]))
    if hashlib.sha1(b'blob '+str(len(b)).encode()+bytes([0])+b).hexdigest()!=sha:raise SystemExit('Source changed: '+name)
    pending[name]=b.decode('utf-8')
def R(old,new):
    if pending[p].count(old)!=1:raise SystemExit('Ambiguous context: '+p+' '+old[:60])
    pending[p]=pending[p].replace(old,new,1)
def N(name,text):
    if Path(name).exists():raise SystemExit('New file exists: '+name)
    pending[name]=text
p='src/components/DetailedEffectGraph.tsx'
R("import {hasGain} from '../audio/effectsModel.mjs';","import {hasGain} from '../audio/effectsModel.mjs';\nimport {widthFromWheel,canDragBand} from './easterPolicy.mjs';")
R('  const selectedBand=useRef<number|null>(null);',
'''  const selectedBand=useRef<number|null>(null),dragging=useRef<{pointer:number;band:number}|null>(null);
  const endDrag=(e:React.PointerEvent<HTMLButtonElement>)=>{dragging.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);};
  useEffect(()=>{const end=()=>{dragging.current=null;};window.addEventListener('pointerup',end,true);window.addEventListener('pointercancel',end,true);window.addEventListener('blur',end);return()=>{window.removeEventListener('pointerup',end,true);window.removeEventListener('pointercancel',end,true);window.removeEventListener('blur',end);};},[]);''')
R('q: Number(clamp(p.bands[i].q * (e.shiftKey ? 1.025 : 1.15) ** (e.deltaY < 0 ? -1 : 1), .1, 24).toFixed(3))','q: widthFromWheel(p.bands[i].q,e.deltaY,e.shiftKey)')
R('role="slider" aria-label={`Bande ${i+1}, gain`} aria-valuemin={-18} aria-valuemax={18} aria-valuenow={b.gainDb}', 'aria-label={`Bande ${i+1}, ${Math.round(b.frequency)} Hz, ${b.gainDb.toFixed(1)} dB, largeur Q ${b.q}`}')
R('onPointerDown={e=>{if(e.button===0){e.preventDefault();e.currentTarget.focus();e.currentTarget.setPointerCapture(e.pointerId);}}}', 'onPointerDown={e=>{if(e.button===0){e.preventDefault();selectedBand.current=i;dragging.current={pointer:e.pointerId,band:i};e.currentTarget.focus();e.currentTarget.setPointerCapture(e.pointerId);}}}')
R('      onPointerMove={e=>','      onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={endDrag}\n      onPointerMove={e=>')
R('if(e.buttons!==1||!e.currentTarget.hasPointerCapture(e.pointerId))return;', 'if(dragging.current?.band!==i||!canDragBand(e.pointerId,dragging.current?.pointer??null,e.buttons,e.currentTarget.hasPointerCapture(e.pointerId)))return;')
R("onKeyDown={e=>{if(e.key==='Home')", "onKeyDown={e=>{if(!e.isTrusted){e.preventDefault();e.stopPropagation();return;}if(e.key==='Home')")
p='src/components/WaveformView.tsx'
R("import { BrandLogo } from './BrandLogo';","import { BrandLogo } from './BrandLogo';\nimport {SecretHost} from './SecretParty';")
R('export const WaveformView: React.FC<WaveformViewProps> = ({','const WaveformContent: React.FC<WaveformViewProps> = ({')
R("const textMuted = readCssVar('--text-muted', '#7f87a6');","const textMuted = '#ffffff';")
R("ctx.fillStyle = 'rgba(248, 248, 242, 0.56)';","ctx.fillStyle = '#ffffff';")
R("ctx.fillStyle = '#f1fa8c';","ctx.fillStyle = '#ffffff';")
R('ctx.fillStyle = ch === 0 ? waveL : waveR;\n              ctx.fillText', "ctx.fillStyle = '#ffffff';\n              ctx.fillText")
pending[p]+='\nexport const WaveformView:React.FC<WaveformViewProps>=p=><SecretHost enabled={p.documents.length===0&&!p.isRecording}><WaveformContent {...p}/></SecretHost>;\n'
p='src-tauri/src/main.rs'
R('    if url != COMMUNITY_URL && url != format!("{COMMUNITY_URL}/") {','    let target = url.trim_end_matches(\'/\');\n    if target != COMMUNITY_URL && target != "https://www.youtube.com/@AldenMagiX" {')
R('.open_url(COMMUNITY_URL, None::<&str>)','.open_url(target, None::<&str>)')
N('src/components/SecretParty.tsx', r'''import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {desktop} from '../utils/desktop';
import {nextSecretClick} from './easterPolicy.mjs';
import './secretParty.css';
const CHANNEL='https://www.youtube.com/@AldenMagiX';
export function SecretHost(p:{enabled:boolean;children:React.ReactNode;audioUrl?:string}){
 const clicks=useRef(0),[open,setOpen]=useState(false);
 useEffect(()=>{if(!p.enabled){clicks.current=0;setOpen(false);}},[p.enabled]);
 return <div className="atz-grid-readable" onClickCapture={e=>{if(!p.enabled||open||e.button!==0||e.detail===0||!(e.target instanceof Element)||!e.target.closest('.atz-brand-logo'))return;clicks.current=nextSecretClick(clicks.current,true);if(clicks.current===30){clicks.current=0;setOpen(true);}}}>{p.children}{open&&p.enabled&&<SecretParty audioUrl={p.audioUrl} onClose={()=>{clicks.current=0;setOpen(false);}}/>}</div>;
}
function SecretParty(p:{onClose:()=>void;audioUrl?:string}){
 const canvas=useRef<HTMLCanvasElement>(null),close=useRef<HTMLButtonElement>(null),link=useRef<HTMLAnchorElement>(null),callback=useRef(p.onClose);callback.current=p.onClose;
 const [error,setError]=useState('');
 useEffect(()=>{
  const previous=document.activeElement,root=document.getElementById('root'),wasInert=root?.inert??false;
  if(root)root.inert=true;close.current?.focus();
  const key=(e:KeyboardEvent)=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();callback.current();}else if(e.key==='Tab'){e.preventDefault();(document.activeElement===close.current?link.current:close.current)?.focus();}};
  window.addEventListener('keydown',key,true);
  return()=>{window.removeEventListener('keydown',key,true);if(root)root.inert=wasInert;if(previous instanceof HTMLElement&&previous.isConnected)previous.focus();};
 },[]);
 useEffect(()=>{if(!p.audioUrl)return;const audio=new Audio(p.audioUrl);audio.loop=true;audio.volume=.4;void audio.play().catch(()=>console.warn('Easter egg: lecture OGG indisponible'));return()=>{audio.pause();audio.removeAttribute('src');audio.load();};},[p.audioUrl]);
 useEffect(()=>{
  const node=canvas.current,ctx=node?.getContext('2d');if(!node||!ctx)return;
  type Spark={x:number;y:number;vx:number;vy:number;life:number;total:number;color:string};
  const colors=['#b34dff','#ff50d8','#4dbeff','#39ff14'];let sparks:Spark[]=[],w=1,h=1,frame=0,last=0,burstAt=0;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const size=()=>{w=window.innerWidth;h=window.innerHeight;const d=Math.min(2,window.devicePixelRatio||1);node.width=Math.round(w*d);node.height=Math.round(h*d);ctx.setTransform(d,0,0,d,0,0);};
  const burst=(x:number,y:number)=>{for(let i=0;i<48;i++){const angle=Math.random()*Math.PI*2,speed=100+Math.random()*340,life=1.1+Math.random()*1.4;sparks.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-60,life,total:life,color:colors[i%4]});}if(sparks.length>384)sparks=sparks.slice(-384);};
  const paint=(now:number)=>{
   frame=requestAnimationFrame(paint);if(now-last<30)return;const dt=last?Math.min(.04,(now-last)/1000):.03;last=now;ctx.clearRect(0,0,w,h);ctx.globalCompositeOperation='lighter';
   if(now>=burstAt){burst(w*.5,h*.53);burst(Math.random()*w,Math.random()*h);burstAt=now+620;}
   sparks=sparks.filter(s=>s.life>0);
   for(const s of sparks){s.life-=dt;s.vy+=70*dt;s.x+=s.vx*dt;s.y+=s.vy*dt;ctx.globalAlpha=Math.max(0,s.life/s.total);ctx.strokeStyle=s.color;ctx.fillStyle=s.color;ctx.shadowColor=s.color;ctx.shadowBlur=12;ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(s.x-s.vx*.09,s.y-s.vy*.09);ctx.lineTo(s.x,s.y);ctx.stroke();ctx.beginPath();ctx.arc(s.x,s.y,2.4,0,Math.PI*2);ctx.fill();}
   ctx.globalAlpha=1;ctx.shadowBlur=0;
  };
  size();window.addEventListener('resize',size);
  if(reduced){ctx.fillStyle='#b34dff';for(let i=0;i<65;i++){ctx.beginPath();ctx.arc(Math.random()*w,Math.random()*h,2,0,Math.PI*2);ctx.fill();}}else frame=requestAnimationFrame(paint);
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('resize',size);sparks=[];};
 },[]);
 return createPortal(<div className="atz-party" role="dialog" aria-modal="true" aria-labelledby="atz-party-title">
  <canvas ref={canvas} aria-hidden="true"/>
  <svg className="atz-party-wave" viewBox="0 0 1200 240" preserveAspectRatio="none" aria-hidden="true"><path d="M0 120H90L110 105L125 140L140 65L160 190L180 80L200 155L220 110L250 120H390L420 80L440 165L460 30L485 220L510 65L535 160L560 110L590 120H760L790 80L810 170L830 40L850 195L875 70L900 155L930 120H1200"/></svg>
  <button ref={close} className="atz-party-close" type="button" aria-label="Fermer" onClick={()=>callback.current()}>×</button>
  <div className="atz-party-content"><h1 id="atz-party-title">Bravo !!!<br/><span>Tu as découvert un Easter egg !</span></h1>
   <svg className="atz-party-robot" viewBox="0 0 300 320" role="img" aria-label="Robot violet joyeux entouré de vert fluo">
    <defs><linearGradient id="party-metal" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#d58aff"/><stop offset=".45" stopColor="#8c32df"/><stop offset="1" stopColor="#37135e"/></linearGradient></defs>
    <g fill="url(#party-metal)" stroke="#39ff14" strokeWidth="3" strokeLinejoin="round">
     <path d="M102 226Q53 216 33 151L18 127Q12 111 22 109L40 129L38 99Q42 89 48 102L55 129L61 108Q69 99 73 112L67 149Q73 185 116 198Z"/>
     <path d="M198 226Q247 216 267 151L282 127Q288 111 278 109L260 129L262 99Q258 89 252 102L245 129L239 108Q231 99 227 112L233 149Q227 185 184 198Z"/>
     <rect x="91" y="199" width="118" height="85" rx="27"/><rect x="88" y="280" width="55" height="30" rx="13"/><rect x="157" y="280" width="55" height="30" rx="13"/>
     <path d="M150 81V44" strokeWidth="7"/><circle cx="150" cy="32" r="12" fill="#39ff14"/>
     <rect x="40" y="74" width="220" height="132" rx="43"/><rect x="59" y="92" width="182" height="95" rx="29" fill="#160c29" stroke="#ad67f5"/>
    </g>
    <g fill="none" stroke="#39ff14" strokeWidth="9" strokeLinecap="round"><path d="M82 133Q101 105 121 133M179 133Q199 105 218 133"/><path d="M111 153Q150 204 189 153" strokeWidth="6"/></g>
    <path d="M122 163Q150 184 178 163" fill="#fff"/><ellipse cx="81" cy="153" rx="10" ry="5" fill="#ff59d5"/><ellipse cx="219" cy="153" rx="10" ry="5" fill="#ff59d5"/>
    <rect x="112" y="219" width="76" height="41" rx="12" fill="#221035" stroke="#bd7dff" strokeWidth="2"/><path d="M123 241H134L141 227L151 252L161 235L168 241H179" fill="none" stroke="#39ff14" strokeWidth="4"/>
   </svg>
   <div className="atz-party-channel"><svg viewBox="0 0 90 40" aria-hidden="true"><defs><linearGradient id="party-arrow"><stop stopColor="#b34dff"/><stop offset="1" stopColor="#39ff14"/></linearGradient></defs><path d="M5 30Q35 0 75 20M62 7L78 20L62 32" fill="none" stroke="url(#party-arrow)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/></svg><a ref={link} href={CHANNEL} target="_blank" rel="noopener noreferrer" onClick={e=>{const api=desktop();if(api?.openExternalUrl){e.preventDefault();void api.openExternalUrl(CHANNEL).catch(()=>setError('Impossible d’ouvrir le navigateur.'));}}}>Alden MagiX</a></div>
   {error&&<p role="alert">{error}</p>}
  </div>
 </div>,document.body);
}
''')
N('src/components/secretParty.css', r'''.atz-grid-readable{display:contents;--text-muted:#fff;--text-secondary:#fff;--accent-secondary:#39ff14;color:#fff}
.atz-grid-readable :is(small,[class*="text-xs"],[class*="text-[10px]"],[class*="text-[11px]"]){color:#fff!important}
.atz-party{position:fixed;inset:0;z-index:10000;display:grid;place-items:center;overflow:auto;color:#fff;background:radial-gradient(ellipse at 50% 48%,#39ff1418,transparent 35%),radial-gradient(ellipse at 15% 25%,#a532ff55,transparent 52%),radial-gradient(ellipse at 90% 80%,#007fff44,transparent 45%),#080615dc;box-shadow:inset 0 0 40px #39ff1455;font-family:system-ui,sans-serif;isolation:isolate}
.atz-party::before{content:'';position:absolute;inset:0;z-index:-1;background-image:linear-gradient(#b34dff26 1px,transparent 1px),linear-gradient(90deg,#b34dff26 1px,transparent 1px);background-size:48px 48px;mask-image:radial-gradient(ellipse,#0009,transparent);pointer-events:none}
.atz-party>canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.atz-party-wave{position:absolute;left:0;top:25%;width:100%;height:50%;fill:none;stroke:#39ff14;stroke-width:2;opacity:.23;filter:drop-shadow(0 0 8px #39ff14);pointer-events:none}
.atz-party-content{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;min-height:100%;padding:28px 52px;text-align:center;pointer-events:none}
.atz-party h1{font-size:clamp(25px,4vw,52px);font-weight:800;line-height:1.12;margin:0;text-shadow:0 0 12px #39ff14aa,0 0 30px #ab3dff}
.atz-party h1 span{font-size:.65em}
.atz-party-robot{width:clamp(170px,27vw,310px);max-height:52vh;overflow:visible;filter:drop-shadow(0 0 8px #39ff14) drop-shadow(0 0 25px #39ff14aa);animation:atz-party-arrive .85s cubic-bezier(.2,.8,.2,1) both,atz-party-breathe 2.6s ease-in-out .85s infinite}
.atz-party-channel{display:flex;align-items:center;gap:10px;pointer-events:auto}
.atz-party-channel svg{width:80px;height:40px;overflow:visible;filter:drop-shadow(0 0 6px #39ff14);animation:atz-party-arrow 1.2s ease-in-out infinite}
.atz-party a{font-size:clamp(22px,3vw,34px);color:#39ff14!important;font-weight:750;text-decoration:underline;text-underline-offset:7px;text-shadow:0 0 12px #39ff14,0 0 25px #ab3dff}
.atz-party .atz-party-close{position:fixed;right:18px;top:12px;z-index:2;width:40px;height:40px;border:1px solid #39ff1480;border-radius:8px;background:#130b20;color:#39ff14;font-size:30px;line-height:1;cursor:pointer;box-shadow:0 0 12px #39ff1455}
.atz-party :is(button,a):focus-visible{outline:2px solid #39ff14;outline-offset:5px}
@keyframes atz-party-arrive{0%{transform:scale(.08);opacity:0}65%{transform:scale(1.15);opacity:1}82%{transform:scale(.96)}100%{transform:scale(1);opacity:1}}
@keyframes atz-party-breathe{0%,100%{transform:scale(1) translateY(0)}50%{transform:scale(1.035) translateY(-7px)}}
@keyframes atz-party-arrow{50%{transform:translateX(7px)}}
@media(prefers-reduced-motion:reduce){.atz-party *{animation:none!important}}
''')
N('src/components/easterPolicy.mjs', r'''export function widthFromWheel(q,delta,fine=false){if(!Number.isFinite(q)||q<=0)q=1;if(!Number.isFinite(delta)||delta===0)return q;return Number(Math.max(.1,Math.min(24,q*(fine?1.025:1.15)**(delta<0?-1:1))).toFixed(3));}
export function nextSecretClick(count,enabled){return enabled?Math.min(30,Math.max(0,count)+1):0;}
export function canDragBand(pointer,held,buttons,captured){return held!==null&&pointer===held&&buttons===1&&captured;}
''')
N('src/components/easterPolicy.d.mts', r'''export function widthFromWheel(q:number,delta:number,fine?:boolean):number;
export function nextSecretClick(count:number,enabled:boolean):number;
export function canDragBand(pointer:number,held:number|null,buttons:number,captured:boolean):boolean;
''')
N('src/components/easterPolicy.test.mjs', r'''import {test} from 'node:test';import assert from 'node:assert/strict';import {widthFromWheel,nextSecretClick,canDragBand} from './easterPolicy.mjs';
test('wheel changes width in the requested direction',()=>{assert.ok(widthFromWheel(1,-1)<1);assert.ok(widthFromWheel(1,1)>1);assert.ok(widthFromWheel(1,-1,true)>widthFromWheel(1,-1));});
test('width stays bounded',()=>{assert.equal(widthFromWheel(.1,-1),.1);assert.equal(widthFromWheel(24,1),24);assert.equal(widthFromWheel(1,0),1);});
test('thirtieth deliberate click only',()=>{let n=0;for(let i=0;i<29;i++){n=nextSecretClick(n,true);assert.ok(n<30);}assert.equal(nextSecretClick(n,true),30);assert.equal(nextSecretClick(n,false),0);});
test('released, cancelled or wrong pointer never drags',()=>{assert.equal(canDragBand(7,7,1,true),true);for(const args of [[7,7,0,true],[7,null,1,true],[8,7,1,true],[7,7,1,false]])assert.equal(canDragBand(...args),false);});
''')
for name,text in pending.items():
    with Path(name).open('w',encoding='utf-8',newline='\n') as f:f.write(text)
marker.write_text(key+'\n',encoding='utf-8')
print('Prepared EQ gestures, white grid text and animated secret; validate before committing')
