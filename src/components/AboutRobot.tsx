import React from 'react';
import {ringMaskUrl,ringCenter} from './about-ring.generated';
export function AboutRobot({src}:{src:string}){
 const style={'--atz-ring-mask':`url("${ringMaskUrl}")`,'--atz-ring-x':`${ringCenter[0]/320*100}%`,'--atz-ring-y':`${ringCenter[1]/320*100}%`} as React.CSSProperties;
 const light=()=> <span className="atz-about-ring" style={style} aria-hidden="true"><span className="atz-about-sweep"/></span>;
 return <div className="atz-about-robot"><span className="atz-about-glow" aria-hidden="true">{light()}</span><img src={src} alt="Robot violet aux yeux verts"/>{light()}</div>;
}
