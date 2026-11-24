/** Z-Reverbe: deterministic offline DSP. No Web Audio or UI dependency. */
export const DEFAULT_REVERB = Object.freeze({size: 50, decay: 2, preDelay: 20,
  diffusion: 70, damping: 6000, lowCut: 100, modulation: 20,
  rate: 0.6, width: 100, direct: 100, reflections: 25, reverb: 30});
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export function reverbSettings(values = {}) {
  const limits = {size:[0,100],decay:[0.1,20],preDelay:[0,250],diffusion:[0,100],
    damping:[200,20000],lowCut:[20,2000],modulation:[0,100],rate:[0.05,5],
    width:[0,100],direct:[0,150],reflections:[0,150],reverb:[0,150]};
  return Object.fromEntries(Object.entries(DEFAULT_REVERB).map(([k,v]) =>
    [k,clamp(Number.isFinite(values[k]) ? values[k] : v,...limits[k])]));
}
function validate(channels, sampleRate) {
  if (!Number.isFinite(sampleRate) || sampleRate < 8000 || sampleRate > 384000)
    throw new RangeError('Fréquence non prise en charge (8–384 kHz).');
  if (!Array.isArray(channels) || !channels.length || channels.length > 32)
    throw new RangeError('Un à 32 canaux sont requis.');
  const n = channels[0].length;
  for (const ch of channels) {
    if (!(ch instanceof Float32Array) || ch.length !== n)
      throw new TypeError('Canaux Float32Array de même longueur requis.');
    for (const x of ch) if (!Number.isFinite(x)) throw new TypeError('Échantillon non fini.');
  }
  return n;
}
function delayLine(length) {
  const data = new Float32Array(Math.ceil(length) + 8);
  let position = 0;
  return {
    read(delay) {
      const p = (position - clamp(delay,1,data.length-2) + data.length) % data.length;
      const a = Math.floor(p), f = p-a;
      return data[a]*(1-f) + data[(a+1)%data.length]*f;
    },
    write(value) { data[position] = value; position = (position+1)%data.length; }
  };
}
/** Returns separated audible wet signal for a future wet-only meter. */
export function renderReverb(channels, sampleRate, values = {}) {
  const n = validate(channels,sampleRate), p = reverbSettings(values);
  const dry = channels.map(ch => Float32Array.from(ch,x=>x*p.direct/100));
  const audible = channels.some(ch=>ch.some(x=>x!==0));
  if (!n || !audible || (!p.reflections && !p.reverb))
    return {channels:dry,wet:channels.map(()=>new Float32Array(n)),tailSamples:0};
  const scale = 0.35 + 1.65*p.size/100;
  const pre = Math.round(p.preDelay*sampleRate/1000);
  // Render to -100 dB relative decay, plus longest propagation path.
  const tail = Math.ceil(sampleRate*(p.preDelay/1000 + p.decay*5/3 + 0.15*scale));
  const total = n+tail;
  const wet = channels.map((input,channel) => {
    const result = new Float32Array(total);
    const predelay = new Float32Array(pre+1);
    let prePosition=0, low=0, lastInput=0, high=0;
    const highA = Math.exp(-2*Math.PI*Math.min(p.lowCut,sampleRate*0.45)/sampleRate);
    const dampA = Math.exp(-2*Math.PI*Math.min(p.damping,sampleRate*0.45)/sampleRate);
    const times = [0.0297,0.0371,0.0411,0.0437,0.0479,0.0531,0.0593,0.0677];
    const depth = p.modulation/100*sampleRate*0.0005;
    const combs = times.map((t,k) => {
      const delay = sampleRate*(t*scale + channel*0.00073 + k*0.00011);
      return {delay,line:delayLine(delay+depth+4),low:0,
        feedback:Math.pow(10,-3*delay/(sampleRate*p.decay)),phase:k*0.79+channel*0.43};
    });
    const early = delayLine(sampleRate*0.12*scale+8);
    const taps = [0.007,0.013,0.023,0.037,0.061];
    const allpasses = [0.0047,0.0017,0.0009].map(t=>{
      const delay = Math.max(1,Math.round(t*scale*sampleRate));
      return {delay,line:delayLine(delay+2)};
    });
    const diffusion = p.diffusion/100*0.7;
    for(let i=0;i<total;i++) {
      let x = i<n ? input[i] : 0;
      if(pre) { const old=predelay[prePosition]; predelay[prePosition]=x;
        prePosition=(prePosition+1)%pre; x=old; }
      high=highA*(high+x-lastInput); lastInput=x;
      low=(1-dampA)*high+dampA*low;
      let reflections=0;
      for(let k=0;k<taps.length;k++)
        reflections+=early.read(sampleRate*taps[k]*scale)*(k%2?-1:1)/(k+2);
      early.write(low);
      let late=0;
      for(const comb of combs) {
        const offset=depth*Math.sin(2*Math.PI*p.rate*i/sampleRate+comb.phase);
        const delayed=comb.line.read(comb.delay+offset);
        comb.low=(1-dampA)*delayed+dampA*comb.low;
        comb.line.write(low+comb.low*comb.feedback);
        late+=delayed/combs.length;
      }
      for(const ap of allpasses) {
        const delayed=ap.line.read(ap.delay), y=delayed-diffusion*late;
        ap.line.write(late+diffusion*y); late=y;
      }
      result[i]=reflections*p.reflections/100+late*p.reverb/100;
    }
    return result;
  });
  if(wet.length===2) {
    const width=p.width/100;
    for(let i=0;i<total;i++) {
      const mid=(wet[0][i]+wet[1][i])*0.5, side=(wet[0][i]-wet[1][i])*0.5*width;
      wet[0][i]=mid+side; wet[1][i]=mid-side;
    }
  }
  const output = wet.map((ch,c) => Float32Array.from(ch,(x,i)=>x+(dry[c][i]??0)));
  return {channels:output,wet,tailSamples:tail};
}
/** Replaces the selected dry region; adds only wet tail over following audio.
 * No samples after the selection are shifted. The original arrays stay intact.
 * Selection-only export policy is intentionally left to the application.
 */
export function applyReverbRange(channels,sampleRate,start,end,values={}) {
  const n=validate(channels,sampleRate);
  if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<start||end>n)
    throw new RangeError('Sélection hors limites.');
  if(start===end) return {channels:channels.map(ch=>ch.slice()),tailSamples:0};
  const rendered=renderReverb(channels.map(ch=>ch.subarray(start,end)),sampleRate,values);
  const length=Math.max(n,start+rendered.channels[0].length), selected=end-start;
  const output=channels.map((ch,c)=>{
    const full=new Float32Array(length); full.set(ch);
    full.set(rendered.channels[c].subarray(0,selected),start);
    for(let i=selected;i<rendered.channels[c].length;i++)
      full[start+i]+=rendered.wet[c][i];
    return full;
  });
  return {channels:output,tailSamples:rendered.tailSamples};
}
