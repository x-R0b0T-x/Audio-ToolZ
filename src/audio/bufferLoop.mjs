const active=new Set();
export function startDecodedLoop(ctx,buffer,{volume=.4,signal}={}){
 if(signal?.aborted)throw new DOMException('Aborted','AbortError');
 const source=ctx.createBufferSource(),gain=ctx.createGain(),entry={ctx,gain};let stopped=false;
 gain.gain.value=Math.max(0,Math.min(1,volume));source.buffer=buffer;source.loop=true;source.loopStart=0;source.loopEnd=buffer.duration;
 const stop=()=>{if(stopped)return;stopped=true;active.delete(entry);signal?.removeEventListener('abort',stop);try{source.stop();}catch{}source.disconnect();gain.disconnect();};
 source.connect(gain);gain.connect(ctx.destination);signal?.addEventListener('abort',stop,{once:true});
 try{source.start();}catch(error){stop();throw error;}active.add(entry);return stop;
}
export function fadeOutDecodedLoops(seconds=1.2){
 for(const {ctx,gain} of active){
  const param=gain.gain,now=ctx.currentTime,from=param.value;
  if(typeof param.cancelScheduledValues==='function'){param.cancelScheduledValues(now);param.setValueAtTime(from,now);param.linearRampToValueAtTime(0,now+Math.max(.05,seconds));}
  else param.value=0;
 }
}
