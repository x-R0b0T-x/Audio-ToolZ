import {DynamicsPeakGraph} from './DynamicsPeakGraph';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { PreviewBand } from '../audio/engine';
import type { AudioDocument } from '../audio/types';
import {targetRange,hasGain} from '../audio/effectsModel.mjs';
import { bandsDefault, colors, dynamicsDefault, CEILING_RANGE, type Band, type Dynamics, type Trace } from '../audio/advancedDsp';
import { EffectPanel } from './EffectPanel';
import { EffectGain, EffectParameter } from './EffectParameter';
import { DetailedEffectGraph } from './DetailedEffectGraph';
import {FilterShape} from './FilterShape';
import './advancedEffects.css';
type Props = {
  document: AudioDocument; effect: 'eq' | 'filter' | 'compressor'; onClose: () => void;
  onStartPreview: (channels: Float32Array[], rate: number, gain?: number, bands?: PreviewBand[]) => void;
  onApply: (channels: Float32Array[], label: string) => void;
};
type RenderRequest = { id: number; kind: 'eq'; bands: Band[] } | { id: number; kind: 'dynamics'; params: Dynamics };
export function AdvancedEffects(props: Props) {
  const doc = props.document, eq = props.effect === 'eq';
  const range=useMemo(()=>{const r=targetRange(doc.selection,doc.channels[0]?.length??0);return {startSample:r.start,endSample:r.end};},[doc]);
  const source = useMemo(() => doc.channels.map(ch => ch.subarray(range.startSample, range.endSample)), [doc, range]);
  const [bands, setBands] = useState(() => bandsDefault(doc.sampleRate));
  const [params, setParams] = useState(() => dynamicsDefault(props.effect === 'compressor' ? 'compressor' : 'limiter'));
  const [scroll,setScroll]=useState(0);
  const [pending, setPending] = useState(true), [applying, setApplying] = useState(false), [error, setError] = useState('');
  const [output, setOutput] = useState<Float32Array[] | null>(null), [trace, setTrace] = useState<Trace | null>(null);
  const worker = useRef<Worker | null>(null), serial = useRef(0), busy = useRef(false), desired = useRef<RenderRequest | null>(null);
  const applyId = useRef(-1), rendered = useRef<{ id: number; channels: Float32Array[] } | null>(null);
  const callbacks = useRef(props); callbacks.current = props;
  const label = eq ? 'Égaliseur paramétrique 7 bandes' : params.mode === 'limiter' ? 'Limiteur' : 'Compresseur';
  const commit = useRef((channels: Float32Array[]) => {});
  commit.current = channels => callbacks.current.onApply(channels.map((segment, i) => {
    const full = new Float32Array(doc.channels[i]); full.set(segment, range.startSample); return full;
  }), label);
  const dispatch = (request: RenderRequest) => {
    desired.current = request;
    if (worker.current && !busy.current) { busy.current = true; worker.current.postMessage(request); }
  };
  useEffect(() => {
    if (!source[0]?.length) return;
    let w: Worker;
    try { w = new Worker(new URL('../audio/advanced.worker.ts', import.meta.url), { type: 'module' }); }
    catch (e) { setError(String(e)); return; }
    worker.current = w; busy.current = false; setOutput(null); setTrace(null);
    const copy = source.map(ch => new Float32Array(ch));
    w.postMessage({ kind: 'init', channels: copy, rate: doc.sampleRate }, copy.map(ch => ch.buffer));
    w.onerror = () => { busy.current = false; setError('Échec du traitement audio. Fermez puis rouvrez cet effet.'); setPending(false); setApplying(false); };
    w.onmessage = (e: MessageEvent<{ id: number; channels: Float32Array[]; trace: Trace | null; error?: string }>) => {
      busy.current = false; const result = e.data;
      if (result.id !== serial.current) { if (desired.current) { busy.current = true; w.postMessage(desired.current); } return; }
      if (result.error) { setError(result.error); setPending(false); setApplying(false); return; }
      rendered.current = { id: result.id, channels: result.channels };
      setOutput(result.channels); setTrace(result.trace); setPending(false); setError('');
      if (result.id === applyId.current) commit.current(result.channels);
      else callbacks.current.onStartPreview(result.channels, doc.sampleRate);
    };
    return () => { w.terminate(); worker.current = null; busy.current = false; rendered.current = null; };
  }, [source, doc.sampleRate]);
  useEffect(() => {
    if (!source[0]?.length) return;
    const id = ++serial.current; rendered.current = null; setPending(true);
    desired.current=eq?{kind:'eq',id,bands}:{kind:'dynamics',id,params};
    const timer = window.setTimeout(() => { if (desired.current) dispatch(desired.current); }, 75);
    return () => window.clearTimeout(timer);
  }, [eq, source, doc.sampleRate, bands, params]);
  const update = (i: number, patch: Partial<Band>) => setBands(old => old.map((b, j) => j === i ? { ...b, ...patch } : b));
  const apply = () => {
    if (pending || applying || !source[0]?.length) return;
    setApplying(true);
    if (rendered.current?.id === serial.current) { commit.current(rendered.current.channels); return; }
    const id = ++serial.current; applyId.current = id; dispatch({ kind: 'eq', id, bands });
  };
  const control = (key: keyof Omit<Dynamics, 'mode'>, caption: string, min: number, max: number, step: number, fine: number, digits: number, unit = '') =>
    <EffectParameter label={caption} value={params[key]} initial={dynamicsDefault(params.mode)[key]} spec={{ min, max, step, fine, digits }} unit={unit} onChange={value => setParams(old => ({ ...old, [key]: value }))}/>;
  const graph = eq ? <DetailedEffectGraph eq={eq} bands={bands} source={source} output={output} rate={doc.sampleRate} params={params} trace={trace} scroll={scroll} onBandChange={update}/> : <DynamicsPeakGraph original={doc.channels} output={output} offset={range.startSample} rate={doc.sampleRate} params={params} trace={trace} scroll={scroll}/>;
  return <div className="atz-advanced-backdrop"><EffectPanel className={`atz-advanced ${eq ? 'atz-equalizer' : 'atz-dynamics'}`} minWidth={eq ? 900 : 760} minHeight={eq ? 560 : 400} role="dialog" aria-modal="true" aria-labelledby="advanced-title">
    <header><div><h2 id="advanced-title">{eq ? label : 'Limiteur / Compresseur'}</h2></div><button type="button" aria-label="Fermer" onClick={props.onClose}>×</button></header>
    <main><fieldset className="atz-effect-body" disabled={applying} inert={applying}>
      {eq ? <><div className="atz-eq-layout">{graph}<div className="atz-eq-rack" role="group" aria-label="Sept bandes de l’égaliseur">
        {bands.map((b, i) => <div className="atz-band" key={i} style={{ color: colors[i], borderColor: colors[i] }} role="group" aria-label={`Bande de ${b.frequency} Hz`}>
          <strong>{Math.round(b.frequency)} Hz</strong>
          <div className="atz-filter-type">
            <FilterShape value={b.type??'peaking'} index={i} onChange={type=>update(i,{type})}/>
            <select aria-label={`Bande ${i+1} : pente`} disabled={!['highpass','lowpass','lowshelf','highshelf'].includes(b.type??'peaking')} value={b.order??2} onChange={e=>update(i,{order:Number(e.target.value) as Band['order']})}>{[1,2,4,6,8].map(n=><option key={n} value={n}>{n*6} dB/oct{n===1?' Gentle':n>=4?' Steep':''}</option>)}</select>
          </div>
          <EffectGain disabled={!hasGain(b)} label={`${b.frequency} Hz : gain`} value={b.gainDb} onChange={gainDb => update(i, { gainDb })}/>
        </div>)}
      </div></div><p className="atz-hint">Spectre d’entrée stéréo · Glisser un point : fréquence/gain · Molette sur un point : largeur Q · Maj : réglage fin</p></> : <>
        {graph}<div className="atz-dynamics-controls">
          <div className="atz-control-group atz-mode" role="group" aria-label="Mode" onDoubleClick={() => setParams(old => ({ ...old, mode: props.effect === 'compressor' ? 'compressor' : 'limiter' }))}><span>MODE</span>{(['limiter', 'compressor'] as const).map(mode => <button type="button" key={mode} aria-pressed={params.mode === mode} onClick={() => setParams(old => ({ ...old, mode }))}>{mode === 'limiter' ? 'LIMIT' : 'COMP'}</button>)}</div>
          <div className="atz-control-group" role="group" aria-label="Niveau">{control('input', 'Gain', -24, 24, .5, .1, 1, 'dB')}{control('ceiling','Plafond',CEILING_RANGE.min,CEILING_RANGE.max,.5,.1,1,'dBFS')}{params.mode==='compressor'&&control('threshold','Seuil',-60,0,.5,.1,1,'dBFS')}</div>
          {params.mode === 'compressor' && <div className="atz-control-group" role="group" aria-label="Compression"><span>COMPRESSION</span>{control('ratio', 'Ratio', 1, 20, .5, .1, 1, ':1')}{control('knee', 'Coude', 0, 24, .5, .1, 1, 'dB')}{control('makeup', 'Compens.', -24, 24, .5, .1, 1, 'dB')}</div>}
          <div className="atz-control-group" role="group" aria-label="Enveloppe">{control('attack', 'Attaque', 0, 100, 1, .1, 1, 'ms')}{control('release', 'Relâch.', 10, 2000, 20, 1, 0, 'ms')}</div>
          <div className="atz-control-group" role="group" aria-label="Défilement"><EffectParameter label="Défilement" value={scroll} initial={0} spec={{min:-3,max:3,step:.25,fine:.05,digits:2}} onChange={setScroll}/></div>
        </div><p className="atz-hint">Sortie : clair → orange pour les niveaux forts · Réduction de gain : violet · Ligne verte : seuil/plafond en direct · Limiteur sur crêtes d’échantillons, pas true peak</p>
      </>}
    </fieldset>{error && <p role="alert">{error}</p>}</main>
    <footer><span role="status">{applying ? 'Application…' : ''}</span><button type="button" onClick={props.onClose}>Annuler</button><button type="button" onClick={apply} disabled={!source[0]?.length || pending || applying || !!error}>Appliquer</button></footer>
  </EffectPanel></div>;
}
