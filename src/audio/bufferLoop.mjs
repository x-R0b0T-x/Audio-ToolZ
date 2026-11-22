export function startDecodedLoop(ctx,buffer,{volume=.4,signal}={}){
 if(signal?.aborted)throw new DOMException('Aborted','AbortError');
 const source=ctx.createBufferSource(),gain=ctx.createGain();let stopped=false;
 gain.gain.value=Math.max(0,Math.min(1,volume));source.buffer=buffer;source.loop=true;source.loopStart=0;source.loopEnd=buffer.duration;
 const stop=()=>{if(stopped)return;stopped=true;signal?.removeEventListener('abort',stop);try{source.stop();}catch{}source.disconnect();gain.disconnect();};
 source.connect(gain);gain.connect(ctx.destination);signal?.addEventListener('abort',stop,{once:true});
 try{source.start();}catch(error){stop();throw error;}return stop;
}
