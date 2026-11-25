type Props={fraction:number;count:number;center:number;inner:number;outer:number};
export function KnobTicks({fraction,count,center,inner,outer}:Props){
 const selected=Math.round(Math.max(0,Math.min(1,fraction))*Math.max(0,count-1));
 return <>{Array.from({length:count},(_,i)=>{const a=(-135+i*270/Math.max(1,count-1))*Math.PI/180;return <line key={i} data-zonyx-tick={i===selected?'selected':Math.abs(i-selected)===1?'neighbor':'idle'} x1={center+inner*Math.sin(a)} y1={center-inner*Math.cos(a)} x2={center+outer*Math.sin(a)} y2={center-outer*Math.cos(a)}/>;})}</>;
}
