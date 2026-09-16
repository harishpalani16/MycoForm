import {useEffect,useState} from 'react';

const mql=(q:string)=>typeof window!=='undefined'&&typeof window.matchMedia==='function'?window.matchMedia(q):null;

// Reads synchronously on first render so the layout never flashes a wrong
// docking state before the effect runs.
export function useMediaQuery(q:string){
 const [matches,setMatches]=useState(()=>mql(q)?.matches??false);
 useEffect(()=>{
  const m=mql(q);if(!m)return;
  const onChange=()=>setMatches(m.matches);
  onChange();
  m.addEventListener('change',onChange);
  return()=>m.removeEventListener('change',onChange);
 },[q]);
 return matches;
}

export const usePrefersReducedMotion=()=>useMediaQuery('(prefers-reduced-motion: reduce)');
