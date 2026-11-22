export function widthFromWheel(q,delta,fine=false){if(!Number.isFinite(q)||q<=0)q=1;if(!Number.isFinite(delta)||delta===0)return q;return Number(Math.max(.1,Math.min(24,q*(fine?1.025:1.15)**(delta<0?-1:1))).toFixed(3));}
export function nextSecretClick(count,enabled){return enabled?Math.min(30,Math.max(0,count)+1):0;}
export function canDragBand(pointer,held,buttons,captured){return held!==null&&pointer===held&&buttons===1&&captured;}
