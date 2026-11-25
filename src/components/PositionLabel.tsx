import type {CSSProperties} from 'react';
import {labelLight} from './finalFeedbackMath.mjs';
import './finalFeedback.css';
export function PositionLabel({children,fraction,position}:{children:string;fraction:number;position:number}){return <span className="zonyx-position-label" style={{'--label-light':labelLight(fraction,position)} as CSSProperties}>{children}</span>;}
