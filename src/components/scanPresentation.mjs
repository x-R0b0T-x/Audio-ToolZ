export const advanceScanScroll=(position,target,elapsed)=>Math.min(target,position+48*Math.max(0,Math.min(elapsed,100))/1000);
export const scanVerdict=(audioOk,processingMs,durationMs)=>!audioOk||!Number.isFinite(processingMs)||processingMs<0||!Number.isFinite(durationMs)||durationMs<=0?'error':processingMs>durationMs?'warning':'success';
