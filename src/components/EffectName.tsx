import React from 'react';
import {normalizeEffectName} from '../utils/effectReview.mjs';
import './effectName.css';
import './effectReview.css';
export function EffectName({name}:{name:string}){const label=normalizeEffectName(name);return label.startsWith('Z-')?<span className="atz-effect-name"><span className="atz-name-z">Z</span><span className="atz-name-dash">-</span><span className="atz-name-effect">{label.slice(2)}</span></span>:<>{label}</>;}
export function colorEffectText(n:React.ReactNode):React.ReactNode{if(typeof n==='string')return <EffectName name={n}/>;if(!React.isValidElement<{children?:React.ReactNode}>(n)||typeof n.type!=='string')return n;return React.cloneElement(n,{},React.Children.map(n.props.children,colorEffectText));}
