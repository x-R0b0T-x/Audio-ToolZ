import React,{useLayoutEffect,useState} from 'react';
import {createPortal} from 'react-dom';
export function SnapIndicatorPortal({children}:{children:React.ReactNode}){
 const [target,setTarget]=useState<HTMLElement|null>(null);
 useLayoutEffect(()=>{setTarget(document.getElementById('atz-header-kick-slot'));},[]);
 return target?createPortal(children,target):null;
}
