import {useRef} from 'react';
import {RotateCcw,Save,FolderOpen,Download} from 'lucide-react';
import {Organism,firstSpore} from '../simulation/organism';

export default function AppFooter({o,seed,setSeed,setO,setRunning,setNotice,openExport}:{
 o:Organism;
 seed:number;setSeed:(s:number)=>void;
 setO:(o:Organism)=>void;setRunning:(r:boolean)=>void;setNotice:(n:string)=>void;
 openExport:()=>void;
}){
 const file=useRef<HTMLInputElement>(null);
 return <footer>
  <span><span className="status-dot"/> CONTINUOUS GROWTH <b>/</b> LOCAL RULES, OPEN POSSIBILITIES</span>
  <div>
   <label>SEED <input aria-label="Seed for next organism" type="number" value={seed}
    onChange={e=>setSeed(+e.target.value)}/></label>

   <button onClick={()=>{setRunning(false);setO(firstSpore(seed));setNotice('A new spore. A new possibility.')}}>
    <RotateCcw size={13}/> New spore
   </button>

   <button onClick={()=>{
    try{localStorage.setItem('mycoform-organism',o.save());setNotice('Organism and feeding history saved.')}
    catch{setNotice('Unable to save in this browser.')}
   }}><Save size={13}/> Save</button>

   <button onClick={()=>{
    try{setO(Organism.load(localStorage.getItem('mycoform-organism')||''));setRunning(false)}
    catch{setNotice('No saved organism found.')}
   }}><FolderOpen size={13}/> Load</button>

   <button onClick={()=>file.current?.click()}>Import</button>

   <button onClick={openExport}><Download size={13}/> Export options</button>

   <input ref={file} type="file" accept=".json" hidden onChange={async e=>{
    try{const f=e.target.files?.[0];if(f){setO(Organism.load(await f.text()));setRunning(false)}}
    catch{setNotice('Choose an organism experiment JSON file.')}
   }}/>
  </div>
 </footer>;
}
