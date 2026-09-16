import {actions} from './actions';

const hints:Record<string,string>={
 transform:'Click a placed object to show its gumball. Drag colored axes to move it, or choose a placement in the panel.',
 feed:'Click or drag to offer food. Start near a growing tip; place the next feed a little farther away. Raise the height to invite upward growth.',
 observe:'Drag to orbit, right-drag to pan, and scroll to zoom. Watch what the organism chooses.',
 clear:'Reserve a pocket of empty space. New tips will turn away from it. Existing strands remain until pruned.',
 spore:'Click the ground to introduce another colony. Nearby networks may eventually join.',
 prune:'Click at the selected height to remove local strands. Feed elsewhere to invite a different direction.',
};

export default function LeftRail({id,tool,setTool,height,setHeight,radius,setRadius}:{
 id:string;
 tool:string;setTool:(t:string)=>void;
 height:number;setHeight:(h:number)=>void;
 radius:number;setRadius:(r:number)=>void;
}){
 return <aside className="left" id={id} tabIndex={-1} aria-label="Cultivation tools">
  <div className="eyebrow">AN OPEN-ENDED CULTIVATION <span>↗</span></div>
  <h1>Let it<br/>become<span>.</span></h1>
  <p className="intro">Give it food, space, and time.<br/><em>Discover what takes root.</em></p>
  <div className="divider"/>
  <div className="section-title">TEND THE ORGANISM</div>
  <nav>
   {actions.map(([id,label,Icon])=>
    <button className={`tool ${tool===id?'selected':''}`} key={id} onClick={()=>setTool(id)}>
     <Icon size={17}/>{label}
    </button>)}
  </nav>
  <div className="tool-options">
   <label>Feeding height <b>{height.toFixed(1)} m</b></label>
   <input aria-label="Feeding height" type="range" min=".2" max="150" step=".2"
    value={height} onChange={e=>setHeight(+e.target.value)}/>
   <div className="height-presets">
    {[.4,2,8,30].map(h=>
     <button className={height===h?'active':''} key={h} onClick={()=>setHeight(h)}>
      {h===.4?'Ground':`${h} m`}
     </button>)}
   </div>
   <label className="radius-label">Influence radius <b>{radius.toFixed(1)} m</b></label>
   <input aria-label="Influence radius" type="range" min=".6" max="10" step=".2"
    value={radius} onChange={e=>setRadius(+e.target.value)}/>
   <p className="hint">{hints[tool]??hints.prune}</p>
  </div>
  <div className="left-bottom">
   <span className="eyebrow">THE FORM IS NOT GIVEN</span>
   <p>You offer a possibility.<br/>The organism finds a way.</p>
  </div>
 </aside>;
}
