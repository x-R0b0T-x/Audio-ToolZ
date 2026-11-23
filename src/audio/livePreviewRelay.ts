export function createPreviewRelay<T extends unknown[]>(isPlaying:()=>boolean,send:(...args:T)=>void){
 let cached:T|null=null,playing=isPlaying();
 return {
  submit:(...args:T)=>{cached=args;playing=isPlaying();send(...args);},
  poll:()=>{const next=isPlaying(),replay=next&&!playing;playing=next;if(replay&&cached)send(...cached);},
  clear:()=>{cached=null;playing=isPlaying();},
 };
}
