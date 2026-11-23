import {useEffect,useRef,useState} from 'react';
export function useControlActivity() {
  const [active, setActive] = useState(false), timer = useRef<ReturnType<typeof setTimeout> | null>(null), held = useRef(false);
  const clear = () => { if (timer.current !== null) clearTimeout(timer.current); };
  useEffect(() => () => clear(), []);
  return { active, begin: () => { clear(); held.current = true; setActive(true); }, end: () => { held.current = false; clear(); setActive(false); }, pulse: () => { clear(); setActive(true); if (!held.current) timer.current = setTimeout(() => setActive(false), 180); } };
}
