import {Play,Pause,Sprout,Eye} from 'lucide-react';
import {Organism,V,Placement} from '../simulation/organism';
import OrganicWorld from '../rendering/OrganicWorld';
import {FiberDetail} from '../rendering/LivingNetwork';
import {GumballMode} from '../rendering/PlacementGumball';

const views=[['grove','The grove'],['above','From above'],['close','Up close']] as const;

export default function SceneHud({
 o,tool,height,radius,place,view,setView,refit,fit,detail,fields,setFields,
 mode,setMode,selection,select,transformMode,transform,running,grow,speed,setSpeed,
 notice,dismissNotice,holdNotice,age,snap,
}:{
 snap:boolean;
 o:Organism;
 tool:string;
 height:number;radius:number;place:(p:V)=>void;
 view:string;setView:(v:string)=>void;refit:()=>void;fit:number;
 detail:FiberDetail;fields:boolean;setFields:(f:boolean)=>void;
 mode:string;setMode:(m:string)=>void;
 selection:Placement|null;select:(s:Placement)=>void;
 transformMode:GumballMode;transform:(s:Placement,p:V,radius?:number)=>void;
 running:boolean;grow:()=>void;speed:number;setSpeed:(s:number)=>void;
 notice:string;dismissNotice:()=>void;holdNotice:(held:boolean)=>void;
 age:string;
}){
 return <main>
  <div className="scene">
   <OrganicWorld o={o} tool={tool} height={height} radius={radius} place={place} view={view}
    fit={fit} detail={detail} fields={fields} mode={mode} selection={selection} select={select}
    transformMode={transformMode} transform={transform} snap={snap}/>
  </div>

  {/* Always mounted so screen readers reliably announce. Inserting a live
      region and its text in the same mutation is frequently missed. */}
  <div className="sr-only" role="status" aria-live="polite">{notice}</div>

  <div className="hud">
   <div className="viewport-top">
    <div>
     <span className="live-dot"/> {running?'GROWING':o.living?'WAITING FOR YOUR NEXT MOVE':'RESTING — READY TO BE FED'}
     <small>OPEN SPACE / NO PREDEFINED ENVELOPE</small>
    </div>
    <span className="studio-tag">{age}</span>
   </div>

   <div className="view-modes">
    {views.map(([id,label])=>
     <button className={view===id?'active':''} key={id} onClick={()=>{setView(id);refit()}}>{label}</button>)}
    <button onClick={refit}>Fit organism</button>
   </div>

   <div className="material-switch">
    <button className={fields?'active':''} onClick={()=>setFields(!fields)}><Eye size={13}/> Food &amp; space</button>
    <button className={mode==='living'?'active':''} onClick={()=>setMode('living')}>Living tissue</button>
    <button className={mode==='fibers'?'active':''} onClick={()=>setMode('fibers')}>Fine fibers</button>
   </div>

   <div className="scene-caption">
    <span>A SPORE, A PLACE, A PASSAGE OF TIME</span>
    <h2>Architecture<br/><i>without a blueprint.</i></h2>
    <p>Follow the food. Find a path. Become something.</p>
   </div>

   <div className="hud-notices">
    <div className="tutorial">
     <span className="step"><Sprout size={25}/></span>
     <div>
      <strong>{!o.foods.length?'Start with a small act of care':!o.living?'Dormancy is a pause, not an ending':'Feed the direction you are curious about'}</strong>
      <p>{!o.foods.length?'Offer food near the spore, or try the first feeding on the right. Then let it grow.':!o.living?'Food near old tissue can wake resting tips and encourage new shoots.':'Keep feeding near the edge of the network. Its branching and joins decide the form.'}</p>
     </div>
    </div>

    {notice&&<div className="toast"
     onMouseEnter={()=>holdNotice(true)} onMouseLeave={()=>holdNotice(false)}
     onFocusCapture={()=>holdNotice(true)} onBlurCapture={()=>holdNotice(false)}>
     {/* Hidden from AT because the always-mounted live region above carries the text. */}
     <p aria-hidden="true">{notice}</p>
     <button onClick={dismissNotice} aria-label="Dismiss message">×</button>
    </div>}
   </div>

   <div className="transport">
    <button className="grow" onClick={grow}>
     {running?<Pause size={15}/>:<Play size={15}/>} {running?'Pause':'Let it grow'}
    </button>
    <div className="speeds">
     {[1,2,5].map(s=><button className={speed===s?'active':''} onClick={()=>setSpeed(s)} key={s}>{s}×</button>)}
    </div>
    <span className="time">{Math.floor(o.time)} cycles</span>
   </div>

   <div className="camera-help">
    {tool==='observe'
     ?'DRAG TO ORBIT · RIGHT DRAG TO PAN · SCROLL TO ZOOM'
     :`${tool==='feed'?'CLICK OR DRAG TO FEED':tool.toUpperCase()} · HEIGHT ${height.toFixed(1)} M · SWITCH TO OBSERVE TO ORBIT`}
   </div>
  </div>
 </main>;
}
