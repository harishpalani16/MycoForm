import {Sprout,ArrowUpRight} from 'lucide-react';
import {Organism,V,capacity,Placement} from '../simulation/organism';
import {FiberDetail} from '../rendering/LivingNetwork';
import {GumballMode} from '../rendering/PlacementGumball';
import TransformPanel from '../TransformPanel';

export default function RightRail({
 id,o,tool,selection,select,transformMode,setTransformMode,transform,remove,undo,canUndo,
 doneTransform,mature,setMoisture,setExploration,offer,detail,setDetail,stepCostMs,
}:{
 id:string;
 o:Organism;tool:string;
 selection:Placement|null;select:(s:Placement|null)=>void;
 transformMode:GumballMode;setTransformMode:(m:GumballMode)=>void;
 transform:(s:Placement,p:V,radius?:number)=>void;
 remove:()=>void;undo:()=>void;canUndo:boolean;doneTransform:()=>void;
 mature:number;
 setMoisture:(v:number)=>void;setExploration:(v:number)=>void;
 offer:()=>void;
 detail:FiberDetail;setDetail:(d:FiberDetail)=>void;
 stepCostMs:number;
}){
 return <aside className="right" id={id} tabIndex={-1} aria-label="Organism details and conditions">
  {tool==='transform'&&<TransformPanel o={o} selection={selection} select={select}
   mode={transformMode} setMode={setTransformMode} change={transform} remove={remove}
   undo={undo} canUndo={canUndo} done={doneTransform}/>}

  <section className="rail-section rail-intent">
   <div className="section-title">A LIVING RELATIONSHIP</div>
   <div className="objective">
    <span className="eyebrow">CULTIVATE, THEN DISCOVER</span>
    <h3>The structure is an outcome <Sprout size={16}/></h3>
    <p>Feed a spore. Follow its branching. Tend its oldest paths. Over time, find shelter, passages, and places within what grows.</p>
   </div>
  </section>

  <section className="rail-section rail-organism">
   <div className="section-title">THE ORGANISM <span>ALIVE</span></div>
   <div className="stats">
    <div><span>Exploring tips</span><strong>{o.living}</strong></div>
    <div><span>Network joins</span><strong>{o.joins}</strong></div>
   </div>
   <div className="metrics">
    <p>Resting tips <b>{o.tips.length-o.living}</b></p>
    <p>Established strands <b>{mature.toLocaleString()}</b></p>
    <p>Total living length <b>{o.length.toFixed(1)} m</b></p>
    <p>Food absorbed <b>{Math.floor(o.absorbed).toLocaleString()} units</b></p>
    <p>Food still available <b>{Math.ceil(o.foods.reduce((s,f)=>s+f.remaining,0))} units</b></p>
   </div>
  </section>

  <section className="rail-section rail-climate">
   <div className="divider"/>
   <div className="section-title">CONDITIONS FOR LIFE</div>
   <div className="tool-options climate">
    <label>Moisture <b>{Math.round(o.moisture*100)}%</b></label>
    <input aria-label="Moisture" type="range" min=".15" max="1" step=".05"
     value={o.moisture} onChange={e=>setMoisture(+e.target.value)}/>
    <label>Exploratory tendency <b>{o.exploration.toFixed(2)}</b></label>
    <input aria-label="Exploratory tendency" type="range" min=".2" max="1.4" step=".05"
     value={o.exploration} onChange={e=>setExploration(+e.target.value)}/>
   </div>
  </section>

  <section className="rail-section rail-feed">
   <button className="first-feed" onClick={offer}>Offer the first feeding <ArrowUpRight size={15}/></button>
   <p className="hint">A few food patches above the first spore. Watch, then add your own. You can feed new growth for as long as there is room to explore.</p>
  </section>

  <section className="rail-section rail-care">
   <div className="care-note">
    <span className="eyebrow">TIME LEAVES A TRACE</span>
    <p>Busy pathways thicken. New shoots stay fine. A living form holds the history of how you tended it.</p>
   </div>
  </section>

  <section className="rail-section rail-detail">
   <div className="detail-control">
    <label htmlFor="fiber-detail">Fiber detail</label>
    <select id="fiber-detail" value={detail} onChange={e=>setDetail(e.target.value as FiberDetail)}>
     <option value="auto">Adaptive · recommended</option>
     <option value="full">Full fibers</option>
     <option value="light">Lightweight</option>
    </select>
    <p>Adaptive detail reduces fine strands in large or distant views. Exports keep the complete network.</p>
    <span>{stepCostMs.toFixed(1)} ms / last growth step</span>
   </div>
  </section>

  <p className="approx">A speculative growth game, not a biological time model. Cycles are game time. Capacity: {o.nodes.length.toLocaleString()} / {capacity.toLocaleString()} nodes. Pruning reclaims space.</p>
 </aside>;
}
