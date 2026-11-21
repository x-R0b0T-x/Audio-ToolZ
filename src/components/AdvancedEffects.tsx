import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { PreviewBand } from '../audio/engine';
import type { AudioDocument } from '../audio/types';
import { clampSelection } from '../audio/dsp';
import { bandsDefault, colors, dynamicsDefault, type Band, type Dynamics, type Trace } from '../audio/advancedDsp';
import { EffectPanel } from './EffectPanel';
import { EffectGain, EffectParameter } from './EffectParameter';
import { DetailedEffectGraph } from './DetailedEffectGraph';
import './advancedEffects.css';
type Props = {
  document: AudioDocument; effect: 'eq' | 'filter' | 'compressor'; onClose: () => void;
  onStartPreview: (channels: Float32Array[], rate: number, gain?: number, bands?: PreviewBand[]) => void;
  onApply: (channels: Float32Array[], label: string) => void;
};
type RenderRequest = { id: number; kind: 'eq'; bands: Band[] } | { id: number; kind: 'dynamics'; params: Dynamics };
export function AdvancedEffects(props: Props) {
  const doc = props.document, eq = props.effect === 'eq';
  const range = useMemo(() => clampSelection(doc.selection, doc.channels[0]?.length ?? 0), [doc]);
  const source = useMemo(() => doc.channels.map(ch => ch.subarray(range.startSample, range.endSample)), [doc, range]);
  const [bands, setBands] = useState(() => bandsDefault(doc.sampleRate));
  const [params, setParams] = useState(() => dynamicsDefault(props.effect === 'compressor' ? 'compressor' : 'limiter'));
  const [pending, setPending] = useState(!eq), [applying, setApplying] = useState(false), [error, setError] = useState('');
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
    if (eq) { callbacks.current.onStartPreview(source, doc.sampleRate, undefined, bands.map(b => ({ ...b, type: 'peaking' as const }))); return; }
    const id = ++serial.current; rendered.current = null; setPending(true);
    desired.current = { kind: 'dynamics', id, params };
    const timer = window.setTimeout(() => { if (desired.current) dispatch(desired.current); }, 75);
    return () => window.clearTimeout(timer);
  }, [eq, source, doc.sampleRate, bands, params]);
  const update = (i: number, patch: Partial<Band>) => setBands(old => old.map((b, j) => j === i ? { ...b, ...patch } : b));
  const apply = () => {
    if (pending || applying || !source[0]?.length) return;
    setApplying(true);
    if (!eq && rendered.current?.id === serial.current) { commit.current(rendered.current.channels); return; }
    const id = ++serial.current; applyId.current = id; dispatch({ kind: 'eq', id, bands });
  };
  const control = (key: keyof Omit<Dynamics, 'mode'>, caption: string, min: number, max: number, step: number, fine: number, digits: number, unit = '') =>
    <EffectParameter label={caption} value={params[key]} initial={dynamicsDefault()[key]} spec={{ min, max, step, fine, digits }} unit={unit} onChange={value => setParams(old => ({ ...old, [key]: value }))}/>;
  const graph = <DetailedEffectGraph eq={eq} bands={bands} source={source} output={output} rate={doc.sampleRate} params={params} trace={trace} onBandChange={update}/>;
  return <div className="atz-advanced-backdrop"><EffectPanel className={`atz-advanced ${eq ? 'atz-equalizer' : 'atz-dynamics'}`} minWidth={760} minHeight={400} role="dialog" aria-modal="true" aria-labelledby="advanced-title">
    <header><div><h2 id="advanced-title">{eq ? label : 'Limiteur / Compresseur'}</h2><small>Audio ToolZ 1.6 dev · Écoute directe</small></div><button type="button" aria-label="Fermer" onClick={props.onClose}>×</button></header>
    <main><fieldset className="atz-effect-body" disabled={applying} inert={applying}>
      {eq ? <><div className="atz-eq-layout">{graph}<div className="atz-eq-rack" role="group" aria-label="Sept bandes de l’égaliseur">
        {bands.map((b, i) => <div className="atz-band" key={i} style={{ color: colors[i], borderColor: colors[i] }} role="group" aria-label={`Bande de ${b.frequency} Hz`}>
          <strong>{Math.round(b.frequency)} Hz</strong>
          <EffectGain label={`${b.frequency} Hz : gain`} value={b.gainDb} onChange={gainDb => update(i, { gainDb })}/>
          <EffectParameter compact label="Hz" value={b.frequency} initial={bandsDefault(doc.sampleRate)[i].frequency} spec={{ min: 20, max: Math.min(20000, Math.floor(doc.sampleRate * .45)), step: 1, fine: 1, digits: 0, logarithmic: true }} unit="Hz" onChange={frequency => update(i, { frequency })}/>
          <EffectParameter compact label="Q" value={b.q} initial={1} spec={{ min: .1, max: 24, step: .1, fine: .001, digits: 3, logarithmic: true }} onChange={q => update(i, { q })}/>
        </div>)}
      </div></div><p className="atz-hint">Spectre d’entrée stéréo · Glisser un point : fréquence/gain · Molette sur un point : largeur Q · Maj : réglage fin · Double-clic : valeur initiale</p></> : <>
        {graph}<div className="atz-dynamics-controls">
          <div className="atz-control-group atz-mode" role="group" aria-label="Mode" onDoubleClick={() => setParams(old => ({ ...old, mode: props.effect === 'compressor' ? 'compressor' : 'limiter' }))}><span>MODE</span>{(['limiter', 'compressor'] as const).map(mode => <button type="button" key={mode} aria-pressed={params.mode === mode} onClick={() => setParams(old => ({ ...old, mode }))}>{mode === 'limiter' ? 'LIMIT' : 'COMP'}</button>)}</div>
          <div className="atz-control-group" role="group" aria-label="Niveau"><span>NIVEAU</span>{control('input', 'Gain', -24, 24, .5, .1, 1, 'dB')}{params.mode === 'limiter' ? control('ceiling', 'Plafond', -18, 0, .5, .1, 1, 'dBFS') : control('threshold', 'Seuil', -60, 0, .5, .1, 1, 'dBFS')}</div>
          {params.mode === 'compressor' && <div className="atz-control-group" role="group" aria-label="Compression"><span>COMPRESSION</span>{control('ratio', 'Ratio', 1, 20, .5, .1, 1, ':1')}{control('knee', 'Coude', 0, 24, .5, .1, 1, 'dB')}{control('makeup', 'Compens.', -24, 24, .5, .1, 1, 'dB')}</div>}
          <div className="atz-control-group" role="group" aria-label="Enveloppe"><span>ENVELOPPE</span>{control('attack', 'Attaque', 0, 100, 1, .1, 1, 'ms')}{control('release', 'Relâch.', 10, 2000, 20, 1, 0, 'ms')}</div>
        </div><p className="atz-hint">Sortie : clair → orange pour les niveaux forts · Réduction de gain : violet · Ligne verte : seuil/plafond en direct · Limiteur sur crêtes d’échantillons, pas true peak</p>
      </>}
    </fieldset>{error && <p role="alert">{error}</p>}</main>
    <footer><span role="status">{applying ? 'Application…' : pending ? 'Recalcul audio… le traitement précédent continue' : 'Molette : réglage · Maj : précision · Double-clic : réinitialisation'}</span><button type="button" onClick={props.onClose}>Annuler</button><button type="button" onClick={apply} disabled={!source[0]?.length || pending || applying || !!error}>Appliquer</button></footer>
  </EffectPanel></div>;
}
