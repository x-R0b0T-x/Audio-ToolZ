export const labelLight=(fraction,position)=>Math.max(0,Math.min(1,1-Math.abs(fraction-position)/.25));
export const speedPosition=value=>value<=1?(value-.5)*100:50+(value-1)*50;
export const positionSpeed=position=>position<=50?.5+position/100:1+(position-50)/50;
