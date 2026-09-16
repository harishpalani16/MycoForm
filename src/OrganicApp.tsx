import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {PanelLeft,PanelRight,Maximize2,BookOpen} from 'lucide-react';
import {Organism,firstSpore,V,capacity,Placement} from './simulation/organism';
import {FiberDetail} from './rendering/LivingNetwork';
import {GumballMode} from './rendering/PlacementGumball';
import ExportDialog from './ExportDialog';
import LeftRail from './ui/LeftRail';
import SceneHud from './ui/SceneHud';
import RightRail from './ui/RightRail';
import AppFooter from './ui/AppFooter';
import {useMediaQuery,usePrefersReducedMotion} from './ui/hooks';
import './tokens.css';import './app.css';

const LEFT_ID='rail-left',RIGHT_ID='rail-right';

function App(){
 const [o,setO]=useState(()=>firstSpore());
 const [,update]=useState(0);
 const [running,setRunning]=useState(false);
 const [tool,setTool]=useState('feed');
 const [height,setHeight]=useState(.8);
 const [radius,setRadius]=useState(1.6);
 const [speed,setSpeed]=useState(1);
 const [fields,setFields]=useState(true);
 const [mode,setMode]=useState('living');
 const [view,setView]=useState('grove');
 const [notice,setNotice]=useState('');
 const [noticeHeld,setNoticeHeld]=useState(false);
 const [seed,setSeed]=useState(42912);
 const [fit,setFit]=useState(0);
 const [detail,setDetail]=useState<FiberDetail>('auto');
 const [selection,setSelection]=useState<Placement|null>(null);
 const [transformMode,setTransformMode]=useState<GumballMode>('translate');
 const [exportOpen,setExportOpen]=useState(false);
 const [deleted,setDeleted]=useState<{before:string;revision:number;owner:Organism}|null>(null);
 const [focus,setFocus]=useState(false);
 const [openRail,setOpenRail]=useState<'left'|'right'|null>(null);
 const [showNotes,setShowNotes]=useState(false);
 const stepCost=useRef(0);
 const reduced=usePrefersReducedMotion();

 // Docking. Width and the manual Focus toggle share one code path, so a rail is
 // never deleted — only moved into a slide-over sheet. Every control stays
 // reachable at every supported width.
 const roomyLeft=useMediaQuery('(min-width:980px)');
 const roomyRight=useMediaQuery('(min-width:1180px)');
 const dockLeft=roomyLeft&&!focus,dockRight=roomyRight&&!focus;
 const overlay=`${dockLeft?'':'left '}${dockRight?'':'right'}`.trim();
 useEffect(()=>{if(dockLeft&&openRail==='left')setOpenRail(null)},[dockLeft,openRail]);
 useEffect(()=>{if(dockRight&&openRail==='right')setOpenRail(null)},[dockRight,openRail]);

 // A sheet is not a dialog — no focus trap, no aria-modal — but focus should
 // still follow it in and come back to the toggle on close.
 const returnFocus=useRef<HTMLElement|null>(null);
 useEffect(()=>{
  if(openRail){
   returnFocus.current=document.activeElement as HTMLElement;
   // Deferred a frame: the sheet is still visibility:hidden when this effect
   // runs, and focus() on a hidden element silently does nothing.
   const id=openRail==='left'?LEFT_ID:RIGHT_ID;
   const raf=requestAnimationFrame(()=>document.getElementById(id)?.focus());
   return()=>cancelAnimationFrame(raf);
  }
  if(returnFocus.current){returnFocus.current.focus();returnFocus.current=null}
 },[openRail]);

 // Growth loop. Accumulates a time debt so a slow frame catches up, but yields
 // after 8ms so the browser stays responsive, and throttles React re-renders.
 useEffect(()=>{
  if(!running)return;let frame=0,previous=performance.now(),display=previous,debt=1;
  const gap=reduced?500:200;
  const tick=(now:number)=>{
   debt=Math.min(5,debt+(now-previous)*speed/100);previous=now;const deadline=performance.now()+8;let changed=false;
   while(debt>=1){const begin=performance.now();o.step();stepCost.current=performance.now()-begin;debt--;changed=true;
    if(o.nodes.length>=capacity){setRunning(false);setNotice('500,000-node capacity reached. Prune to reclaim space, or export this organism.');update(v=>v+1);return;}
    if(!o.living){setRunning(false);setNotice('The organism is resting. Offer food near existing tissue to wake new growth.');update(v=>v+1);return;}
    if(performance.now()>=deadline)break;
   }
   if(changed&&now-display>=gap){update(v=>v+1);display=now;}frame=requestAnimationFrame(tick);
  };frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
 },[running,speed,o,reduced]);

 // Long messages get longer on screen, and hovering or focusing the toast holds
 // it open (WCAG 2.2.1 — a timed failure message must not be the only chance to
 // read it). The dismiss button is the manual escape.
 useEffect(()=>{
  if(!notice||noticeHeld)return;
  const ms=Math.max(6500,notice.split(/\s+/).length*400);
  const t=setTimeout(()=>setNotice(''),ms);return()=>clearTimeout(t);
 },[notice,noticeHeld]);

 useEffect(()=>{setSelection(null)},[o]);
 useEffect(()=>{
  if(tool==='transform'){
   setRunning(false);setFields(true);
   // The transform panel lives in the right rail. Without this the tool would
   // be selectable with its panel off-screen and Undo delete unreachable.
   if(!dockRight)setOpenRail('right');
  }else setSelection(null);
 },[tool,dockRight]);

 const canUndo=deleted?.owner===o&&deleted.revision===o.revision;

 const deleteSelected=()=>{
  if(!selection)return;setRunning(false);const before=o.save();
  if(o.deletePlacement(selection)){
   setDeleted({before,revision:o.revision,owner:o});setSelection(null);update(v=>v+1);
   setNotice(selection.kind==='spore'
    ?'Spore and connected tissue deleted. Undo delete is available in the transform panel.'
    :'Placement deleted. Undo delete is available in the transform panel.');
  }
 };
 const undoDelete=()=>{
  if(!canUndo||!deleted)return;
  setRunning(false);setO(Organism.load(deleted.before));setDeleted(null);setSelection(null);
  setNotice('Deleted placement restored.');
 };
 const selectPlacement=(s:Placement|null)=>{
  setSelection(s);setRunning(false);setFields(true);setTool('transform');
  if(s?.kind==='spore')setTransformMode('translate');
 };
 const transform=(s:Placement,p:V,r?:number)=>{setRunning(false);o.transformPlacement(s,p,r);update(v=>v+1)};

 useEffect(()=>{
  const key=(e:KeyboardEvent)=>{
   // An open sheet takes Escape first; only then does it clear the selection.
   if(e.key==='Escape'&&openRail){e.preventDefault();setOpenRail(null);return}
   if(exportOpen||tool!=='transform'||(e.target as HTMLElement)?.closest('input,select,textarea'))return;
   if((e.key==='Delete'||e.key==='Backspace')&&selection){e.preventDefault();deleteSelected();}
   if(e.key==='Escape')setSelection(null);
   if(e.key.toLowerCase()==='w')setTransformMode('translate');
   if(e.key.toLowerCase()==='r'&&selection?.kind!=='spore')setTransformMode('scale');
  };
  window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
 },[tool,selection,o,exportOpen,openRail]);

 const place=(p:V)=>{
  if(tool==='feed'){if(!o.feed(p,radius))setNotice('Too many active food patches. Let existing food be absorbed first.');}
  else if(tool==='spore'){if(!o.plant([p[0],.15,p[2]]))setNotice('Up to 12 spores may grow in one experiment. Plant outside protected space.');}
  else if(tool==='clear')o.reserve(p,radius);
  else if(tool==='prune')o.prune(p,radius);
  update(v=>v+1);
 };
 const grow=()=>{
  if(!o.nodes.length){setNotice('Plant a spore first.');return}
  if(!o.living){setNotice('Feed close to existing tissue to wake it, then resume.');return}
  if(!running){setSelection(null);if(tool==='transform')setTool('observe')}
  setRunning(!running);
 };
 const offer=()=>{
  setSelection(null);if(tool==='transform')setTool('observe');
  o.feed([1.3,1.1,.4],1.4);o.feed([-.9,2.5,.8],1.4);o.feed([.7,4,-.8],1.4);
  // Under reduced motion nothing starts moving without an explicit action.
  if(!reduced)setRunning(true);
  setNotice(reduced
   ?'Three food patches offered. Press Let it grow when you are ready.'
   :'Three food patches offered. Nothing specifies the form it will take.');
  update(v=>v+1);
 };
 const refit=()=>{setFit(v=>v+1);setTool('observe')};
 const setMoisture=(v:number)=>{setDeleted(null);o.moisture=v;update(n=>n+1)};
 const setExploration=(v:number)=>{setDeleted(null);o.exploration=v;update(n=>n+1)};

 // Latched so pruning back below a threshold never pops the editorial layer
 // in mid-session. Resets only on a new or imported organism.
 const stageRef=useRef(0);
 useEffect(()=>{stageRef.current=0},[o]);
 const reached=o.time>=50?2:o.nodes.length>40?1:0;
 if(reached>stageRef.current)stageRef.current=reached;
 const stage=stageRef.current;

 const mature=o.mature;
 const age=o.time<10?'AWAKENING':o.time<50?'EXPLORING':o.time<130?'ESTABLISHING':'AN OLD, LIVING NETWORK';

 return <div className="app" data-stage={stage} data-copy={showNotes?0:stage}>
  <header>
   <div className="brand"><span className="brandmark">✳</span> MYCOFORM <span className="brand-sub">THE ART OF CULTIVATING SPACE</span></div>
   <div className="header-right">
    <span className="header-note"><span className="status-dot"/> ONE SPORE. MANY POSSIBILITIES. <span className="version">LIVING EXPERIMENT / 03</span></span>
    {!dockLeft&&<button className="rail-toggle" aria-expanded={openRail==='left'} aria-controls={LEFT_ID}
     onClick={()=>setOpenRail(openRail==='left'?null:'left')}><PanelLeft size={13}/> Tools</button>}
    {!dockRight&&<button className="rail-toggle" aria-expanded={openRail==='right'} aria-controls={RIGHT_ID}
     onClick={()=>setOpenRail(openRail==='right'?null:'right')}><PanelRight size={13}/> Details</button>}
    <button className="rail-toggle" aria-pressed={showNotes} onClick={()=>setShowNotes(!showNotes)}
     title="Show the written notes again"><BookOpen size={13}/> Notes</button>
    <button className="rail-toggle" aria-pressed={focus} onClick={()=>{setFocus(!focus);setOpenRail(null)}}>
     <Maximize2 size={13}/> Focus</button>
   </div>
  </header>

  <div className="workspace" data-overlay={overlay||undefined} data-open={openRail??undefined}>
   <LeftRail id={LEFT_ID} tool={tool} setTool={setTool} height={height} setHeight={setHeight}
    radius={radius} setRadius={setRadius}/>

   <SceneHud o={o} tool={tool} height={height} radius={radius} place={place}
    view={view} setView={setView} refit={refit} fit={fit} detail={detail} fields={fields}
    setFields={setFields} mode={mode} setMode={setMode} selection={selection}
    select={selectPlacement} transformMode={transformMode} transform={transform}
    running={running} grow={grow} speed={speed} setSpeed={setSpeed} notice={notice}
    dismissNotice={()=>{setNoticeHeld(false);setNotice('')}} holdNotice={setNoticeHeld}
    age={age} snap={reduced}/>

   <RightRail id={RIGHT_ID} o={o} tool={tool} selection={selection} select={selectPlacement}
    transformMode={transformMode} setTransformMode={setTransformMode} transform={transform}
    remove={deleteSelected} undo={undoDelete} canUndo={canUndo}
    doneTransform={()=>{setSelection(null);setTool('observe')}} mature={mature}
    setMoisture={setMoisture} setExploration={setExploration} offer={offer}
    detail={detail} setDetail={setDetail} stepCostMs={stepCost.current}/>
  </div>

  <AppFooter o={o} seed={seed} setSeed={setSeed} setO={setO} setRunning={setRunning}
   setNotice={setNotice} openExport={()=>{setRunning(false);setExportOpen(true)}}/>

  {exportOpen&&<ExportDialog o={o} close={()=>setExportOpen(false)} notify={setNotice}/>}
 </div>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
