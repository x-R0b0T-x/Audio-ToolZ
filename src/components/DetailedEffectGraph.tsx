import {signedDb} from '../utils/presentationFormat';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { audioEngine } from '../audio/engine';
import { bandsDefault, colors, clamp, response, CEILING_RANGE, type Band, type Dynamics, type Trace } from '../audio/advancedDsp';
import { SourceSpectrum } from './effectUiMath';
import { EffectParameter } from './EffectParameter';
import { EffectWaveHistory } from './effectWaveHistory';
import {hasGain} from '../audio/effectsModel.mjs';
import {widthFromWheel,canDragBand} from '../utils/eqGestures.mjs';
type Props = { eq: boolean; bands: Band[]; source: Float32Array[]; output: Float32Array[] | null; rate: number; params: Dynamics; trace: Trace | null; onBandChange: (i: number, patch: Partial<Band>) => void };
/* Le graphique de l'égaliseur est dessiné en pixels réels (aucune déformation) :
   les points restent ronds et les textes gardent leurs proportions à toute taille de fenêtre. */
const MARGIN = { l: 50, r: 20, t: 16, b: 34 };
type Size = { w: number; h: number };
const geometry = (s: Size, max: number) => {
  const w = Math.max(1, s.w - MARGIN.l - MARGIN.r), h = Math.max(1, s.h - MARGIN.t - MARGIN.b), span = Math.log(max / 20);
  return {
    w, h, l: MARGIN.l, t: MARGIN.t,
    fx: (f: number) => MARGIN.l + w * Math.log(f / 20) / span,
    gy: (db: number) => MARGIN.t + h * (18 - db) / 36,
    freqAt: (x: number) => 20 * Math.exp(span * (x - MARGIN.l) / w),
    dbAt: (y: number) => 18 - 36 * (y - MARGIN.t) / h,
  };
};
const GRID_FREQUENCIES = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
/* Spectre : plus une fréquence est forte, plus le violet est clair et lumineux ; plus elle est faible, plus il est sombre. */
const spectrumShade = (level: number) => `hsl(278 98% ${(8 + 86 * Math.pow(clamp(level,0,1),1.6)).toFixed(1)}%)`;
export function DetailedEffectGraph(props: Props) {
  const host = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null), latest = useRef(props); latest.current = props;
  const selectedBand=useRef<number|null>(null),dragging=useRef<{pointer:number;band:number}|null>(null);
  const endDrag=(e:React.PointerEvent<HTMLButtonElement>)=>{dragging.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);};
  useEffect(()=>{const end=()=>{dragging.current=null;};window.addEventListener('pointerup',end,true);window.addEventListener('pointercancel',end,true);window.addEventListener('blur',end);return()=>{window.removeEventListener('pointerup',end,true);window.removeEventListener('pointercancel',end,true);window.removeEventListener('blur',end);};},[]);
  const [scroll, setScroll] = useState(0), speed = useRef(0); speed.current = scroll;
  const [size, setSize] = useState<Size>({ w: 780, h: 270 }), sizeRef = useRef(size); sizeRef.current = size;
  const max = Math.min(20000, props.rate * .45), geo = geometry(size, max);
  const curve = useMemo(() => {
    const g = geometry(size, max), n = Math.max(120, Math.round(g.w / 2));
    return Array.from({ length: n + 1 }, (_, i) => `${i ? 'L' : 'M'}${(g.l + g.w * i / n).toFixed(1)},${clamp(g.gy(response(props.bands, props.rate, 20 * (max / 20) ** (i / n))), g.t, g.t + g.h).toFixed(1)}`).join(' ');
  }, [props.bands, props.rate, max, size]);
  useEffect(() => {
    const node = host.current; if (!node) return;
    const read = () => { const w = Math.max(1, Math.round(node.clientWidth)), h = Math.max(1, Math.round(node.clientHeight)); setSize(old => old.w === w && old.h === h ? old : { w, h }); };
    read(); const observer = new ResizeObserver(read); observer.observe(node); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const wheel = (e: WheelEvent) => {
      const point = e.target instanceof Element ? e.target.closest('[data-eq-band]') : null;
      if(!latest.current.eq||!host.current||e.ctrlKey||e.metaKey||e.altKey||host.current.closest('fieldset:disabled,[inert]'))return;
      if(point&&!host.current.contains(point))return;
      const p=latest.current,i=point?Number(point.getAttribute('data-eq-band')):selectedBand.current;if(i===null||!e.deltaY||!p.bands[i])return;
      e.preventDefault();e.stopPropagation(); p.onBandChange(i, { q: widthFromWheel(p.bands[i].q,e.deltaY,e.shiftKey) });
    };
    const node = host.current; node?.addEventListener('wheel', wheel, { passive: false, capture: true }); return () => node?.removeEventListener('wheel', wheel, true);
  }, []);
  useEffect(() => {
    let frame = 0, last = 0, previous: number | null = null, history: EffectWaveHistory | null = null, lastKey = '', smooth = new Float32Array(0);
    const fft = new SourceSpectrum();
    const draw = (now: number) => {
      if (now - last >= 30) {
        const dt = last ? (now - last) / 1000 : 0; last = now;
        const node = canvas.current, ctx = node?.getContext('2d'), p = latest.current;
        if (node && ctx) {
          const r = node.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
          const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
          if (node.width !== w || node.height !== h) { node.width = w; node.height = h; }
          const playing = audioEngine.isPlaying, pos = Math.floor(audioEngine.getCurrentSample());
          if (p.eq) {
            const top = Math.min(20000, p.rate * .45), g = geometry(sizeRef.current, top), key = `${pos}|${w}|${h}|${g.w}|${g.h}`;
            if (playing || key !== lastKey) {
              lastKey = key;
              ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, r.width, r.height);
              const bins = fft.read((audioEngine as typeof audioEngine & {effectPreviewSession?:{originalChannels:Float32Array[]}}).effectPreviewSession?.originalChannels??p.source, pos), columns = Math.max(1, Math.floor(g.w * dpr)), colWidth = g.w / columns, base = g.t + g.h;
              if (smooth.length !== columns) smooth = new Float32Array(columns);
              const level = new Float32Array(columns);
              for (let x = 0; x < columns; x++) {
                const f = 20 * (top / 20) ** ((x + .5) / columns), bin = clamp(f * fft.size / p.rate, 0, bins.length - 2), k = Math.floor(bin), fraction = bin - k;
                const amplitude = bins[k] * (1 - fraction) + bins[k + 1] * fraction;
                const v = clamp((20 * Math.log10(Math.max(1e-6, amplitude)) + 84) / 84, 0, 1);
                smooth[x] = v >= smooth[x] ? v : smooth[x] * .8 + v * .2; level[x] = smooth[x];
                ctx.fillStyle = spectrumShade(level[x]); ctx.fillRect(g.l + x * colWidth, base - level[x] * g.h, colWidth + .35, level[x] * g.h);
              }
              ctx.beginPath(); ctx.strokeStyle = 'hsl(272 100% 90% / .9)'; ctx.lineWidth = 1.2; ctx.lineJoin = 'round';
              for (let x = 0; x < columns; x++) { const px = g.l + (x + .5) * colWidth, py = base - level[x] * g.h; if (x) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
              ctx.stroke();
            }
          } else {
            const session=(audioEngine as typeof audioEngine & {effectPreviewSession?:{start:number;segmentLength:number;originalLoop:boolean;previewChannels:Float32Array[]}}).effectPreviewSession;
            const output=session?.previewChannels??p.output,length=output?.[0]?.length??0;
            if(output&&length){const channels=Math.min(2,output.length);
              if(!history||history.rate!==p.rate||history.channels!==channels){history=new EffectWaveHistory(p.rate,channels);previous=null;}
              const append=(start:number,count:number)=>{const take=Math.min(Math.max(0,count),history!.capacity,dt>.5?Math.round(p.rate*.25):history!.capacity);history!.append(output,start+count-take,take,p.trace?.reduction,p.trace?.hop??256,session?.start??0);};
              if(playing){if(previous===null){const n=Math.min(pos,Math.round(p.rate/30));append(pos-n,n);}else if(pos>=previous)append(previous,pos-previous);else if(session?.originalLoop&&dt<.5){append(previous,session.start+session.segmentLength-previous);append(session.start,pos-session.start);}else history=new EffectWaveHistory(p.rate,channels);previous=pos;}else{if(previous!==null&&pos>previous)append(previous,pos-previous);previous=null;}
            }
            ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,r.width,r.height);
            const l=48,t=40,pw=Math.max(1,r.width-l-12),ph=Math.max(1,r.height-t-68),y=(db:number)=>t+clamp((CEILING_RANGE.max-db)/(CEILING_RANGE.max-CEILING_RANGE.min),0,1)*ph,span=6/2**speed.current;
            ctx.font='12px system-ui';ctx.fillStyle='#fff';
            [12,9,6,3,0,-3,-6,-9,-12,-15,-18].forEach(db=>{const py=y(db);ctx.fillStyle='#fff';ctx.fillText(signedDb(db,0),5,py+4);ctx.fillStyle='#ffffff18';ctx.fillRect(l,py,pw,1);});
            if(history&&history.total){const buckets=Math.max(1,Math.floor(pw*dpr)),data=history.read(span,buckets),width=pw*Math.min(1,data.count/(span*p.rate)),x0=l+pw-width,points:Array<[number,number]>=[];
              ctx.save();ctx.beginPath();ctx.rect(l,t,pw,ph);ctx.clip();
              for(let i=0;i<buckets;i++){let amplitude=0;for(let c=0;c<history.channels;c++){const v=data.peaks[c][i];amplitude=Math.max(amplitude,Math.abs(v.min),Math.abs(v.max));}const a=Math.floor(i*data.count/buckets),b=Math.min(data.count,Math.max(a+1,Math.floor((i+1)*data.count/buckets)));let tone=0,n=0,reduction=0;for(let s=a;s<b;s++){tone+=data.tones[s];n++;reduction=Math.max(reduction,data.reductions[s]);}
                const py=y(20*Math.log10(Math.max(1e-6,amplitude))),x=x0+i/buckets*width;ctx.fillStyle=`hsl(273 80% ${Math.max(24,tone/Math.max(1,n))}%)`;ctx.fillRect(x,py,Math.max(1/dpr,width/buckets),Math.max(0,y(-60)-py));points.push([x,y(-reduction)]);
              }
              if(points.length){ctx.beginPath();ctx.moveTo(points[0][0],y(0));points.forEach(([x,py])=>ctx.lineTo(x,py));ctx.lineTo(points[points.length-1][0],y(0));ctx.closePath();ctx.fillStyle='#8ceeff28';ctx.fill();ctx.beginPath();points.forEach(([x,py],i)=>i?ctx.lineTo(x,py):ctx.moveTo(x,py));ctx.strokeStyle='#b9f7ff';ctx.lineWidth=1.7;ctx.stroke();}ctx.restore();
            }
            const line=(db:number,color:string)=>{ctx.fillStyle=color;ctx.fillRect(l,y(db),pw,1.5);};line(p.params.input,'#ffb45e');line(clamp(p.params.ceiling,CEILING_RANGE.min,CEILING_RANGE.max),'#39ff14');
            ctx.fillStyle='#ffb45e';ctx.fillText(`Gain ${signedDb(p.params.input,1)} dB`,l+3,15);ctx.fillStyle='#39ff14';ctx.textAlign='right';ctx.fillText(`Plafond ${signedDb(p.params.ceiling,1)} dB`,l+pw,15);ctx.textAlign='left';ctx.fillStyle='#b9f7ff';ctx.fillText('Réduction de gain',l+3,31);ctx.fillStyle='#fff';ctx.fillText(`−${span.toFixed(2)} s`,l,r.height-48);ctx.fillText('0 s',l+pw-20,r.height-48);
          }
        }
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw); return () => cancelAnimationFrame(frame);
  }, []);
  return <div className="atz-graph-block"><div ref={host} className="atz-graph detailed"><canvas ref={canvas} aria-hidden="true"/>
    {props.eq ? <svg width={size.w} height={size.h} viewBox={`0 0 ${size.w} ${size.h}`} aria-label="Spectre et réponse de l’égaliseur">{[-18,-12,-6,0,6,12,18].map(db => <g key={db}><line x1={geo.l} x2={geo.l+geo.w} y1={geo.gy(db)} y2={geo.gy(db)} stroke={db===0?'#ffffff40':'#ffffff22'}/><text x={geo.l-9} y={geo.gy(db)+4.5} textAnchor="end">{signedDb(db,0)}</text></g>)}{GRID_FREQUENCIES.filter(f=>f<=max).map(f=><g key={f}><line x1={geo.fx(f)} x2={geo.fx(f)} y1={geo.t} y2={geo.t+geo.h} stroke="#ffffff15"/><text x={geo.fx(f)} y={geo.t+geo.h+21} textAnchor="middle">{f>=1000?`${f/1000}k`:f}</text></g>)}<path d={curve} fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round"/></svg> : <span className="atz-graph-caption">{props.params.mode === 'limiter' ? 'Plafond' : 'Seuil'} {signedDb(props.params.mode === 'limiter' ? props.params.ceiling : props.params.threshold,1)} dBFS</span>}
    {props.eq && props.bands.map((b,i)=><button type="button" key={i} data-eq-band={i} onFocus={()=>{selectedBand.current=i;}} className="atz-eq-point" style={{left:geo.fx(b.frequency),top:geo.gy(hasGain(b)?b.gainDb:0),borderColor:colors[i]}} aria-label={`Bande ${i+1}, ${Math.round(b.frequency)} Hz, ${signedDb(b.gainDb,1)} dB, largeur Q ${b.q}`}
      onPointerDown={e=>{if(e.button===0){e.preventDefault();selectedBand.current=i;dragging.current={pointer:e.pointerId,band:i};e.currentTarget.focus();e.currentTarget.setPointerCapture(e.pointerId);}}}
      onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={endDrag}
      onPointerMove={e=>{if(dragging.current?.band!==i||!canDragBand(e.pointerId,dragging.current?.pointer??null,e.buttons,e.currentTarget.hasPointerCapture(e.pointerId)))return;const node=host.current!,r=node.getBoundingClientRect(),g=geometry(sizeRef.current,max);props.onBandChange(i,{frequency:Math.round(clamp(g.freqAt(e.clientX-r.left-node.clientLeft),20,max)),gainDb:hasGain(b)?Number(clamp(g.dbAt(e.clientY-r.top-node.clientTop),-18,18).toFixed(1)):b.gainDb});}}
      onKeyDown={e=>{if(!e.isTrusted){e.preventDefault();e.stopPropagation();return;}if(e.key==='Home'){e.preventDefault();props.onBandChange(i,bandsDefault(props.rate)[i]);}else if(['ArrowUp','ArrowDown'].includes(e.key)&&hasGain(b)){e.preventDefault();props.onBandChange(i,{gainDb:Number(clamp(b.gainDb+(e.key==='ArrowUp'?1:-1)*(e.shiftKey ? .1 : .5),-18,18).toFixed(1))});}else if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();props.onBandChange(i,{frequency:Math.round(clamp(b.frequency*(e.key==='ArrowRight'?1.02:1/1.02),20,max))});}}}>{i+1}</button>)}
    </div>{!props.eq&&<div className="atz-scroll-toolbar"><EffectParameter label="Défilement" value={scroll} initial={0} spec={{min:-3,max:3,step:.25,fine:.05,digits:2}} onChange={setScroll}/><p>Graves : violet sombre · Médiums : violet · Aigus : lilas clair<br/>Sortie : vue unique · Orange : gain relatif (dB) · Vert : plafond (dBFS) · Cyan : réduction<br/>0 : défilement de référence · Molette · Double-clic : remise à zéro</p></div>}</div>;
}
