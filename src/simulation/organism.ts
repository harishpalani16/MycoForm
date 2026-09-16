export type V = [number,number,number];
export type Food = {p:V;radius:number;remaining:number;initial:number};
export type Strand = {a:number;b:number;born:number;radius:number;flow:number;alive:boolean};
export type GrowthTip = {node:number;dir:V;energy:number;age:number;asleep:boolean};
export type Placement = {kind:'food'|'spore'|'void';index:number};
export const capacity=500_000;
export const renderChunkSize=2048;
export const worldBounds={horizontal:250,height:150};
const dist=(a:V,b:V)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
const unit=(v:V):V=>{const l=Math.hypot(...v)||1;return v.map(x=>x/l) as V;};
const direction=(a:V,b:V)=>unit(b.map((x,i)=>x-a[i]) as V);
export class Organism {
 seed:number; rng:number; time=0; nodes:V[]=[]; edges:Strand[]=[]; tips:GrowthTip[]=[]; roots:number[]=[];
 foods:Food[]=[]; voids:{p:V;radius:number}[]=[]; joins=0; absorbed=0; moisture=.7; exploration=.65; revision=0;
 private grid=new Map<string,number[]>();
 // Append-only growth keeps both transport and GPU data incremental. Edits invalidate them.
 geometryRevision=0; radiusChunks=new Map<number,number>();
 private parent:number[]=[];private via:number[]=[];private skip:number[]=[];
 private transportEdges=0;private previousFlow:number[]=[];private flowScratch=new Float64Array(0);
 private totalLength=0;private established=0;
 constructor(seed=42912){this.seed=seed;this.rng=seed;}
 random(){this.rng=(Math.imul(this.rng,1664525)+1013904223)>>>0;return this.rng/4294967296;}
 private key(p:V){return p.map(x=>Math.floor(x/.5)).join(',');}
 private addNode(p:V){const id=this.nodes.length;this.nodes.push(p);const k=this.key(p),cell=this.grid.get(k);if(cell)cell.push(id);else this.grid.set(k,[id]);return id;}
 private rebuild(){
  this.grid.clear();this.nodes.forEach((p,id)=>{const k=this.key(p),cell=this.grid.get(k);if(cell)cell.push(id);else this.grid.set(k,[id]);});
  this.parent=[];this.via=[];this.skip=[];this.transportEdges=0;this.previousFlow=[];
  this.totalLength=0;this.established=0;
  this.edges.forEach((e,i)=>{if(e.alive){this.totalLength+=dist(this.nodes[e.a],this.nodes[e.b]);if(e.radius>.055)this.established++;if(e.flow>0)this.previousFlow.push(i);}});
  this.radiusChunks.clear();this.geometryRevision++;
 }
 /** Discard pruned strands and orphaned nodes, then remap every graph reference. */
 compact(){
  const keep=new Uint8Array(this.nodes.length);for(const r of this.roots)keep[r]=1;
  for(const e of this.edges)if(e.alive){keep[e.a]=1;keep[e.b]=1;}
  const remap=new Int32Array(this.nodes.length).fill(-1),nodes:V[]=[];
  this.nodes.forEach((p,i)=>{if(keep[i]){remap[i]=nodes.length;nodes.push(p);}});
  this.edges=this.edges.filter(e=>e.alive).map(e=>({...e,a:remap[e.a],b:remap[e.b]}));
  this.tips=this.tips.filter(t=>keep[t.node]).map(t=>({...t,node:remap[t.node]}));
  this.roots=this.roots.map(r=>remap[r]);this.nodes=nodes;this.rebuild();this.revision++;
 }
 private fusionCandidate(p:V,from:number){const c=p.map(x=>Math.floor(x/.5));for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++)for(const id of this.grid.get([c[0]+x,c[1]+y,c[2]+z].join(','))||[])if(id<from-18&&dist(this.nodes[id],p)<.24&&dist(this.nodes[id],this.nodes[from])>.12)return id;}
 plant(p:V){if(this.roots.length>=12||this.nodes.length>=capacity||this.excluded(p))return false;const id=this.addNode([p[0],Math.max(.15,p[1]),p[2]]);this.roots.push(id);for(let i=0;i<7;i++)this.tips.push({node:id,dir:unit([(this.random()-.5)*1.2,.25+this.random()*.7,(this.random()-.5)*1.2]),energy:32,age:0,asleep:false});this.revision++;return true;}
 feed(p:V,radius=1.8){
  // Refilling food is an intervention, never a request to generate geometry.
  const same=this.foods.find(f=>dist(f.p,p)<radius*.35);if(same){same.remaining+=180;same.initial+=180;}else{if(this.foods.length>=200)this.foods=this.foods.filter(f=>f.remaining>0);if(this.foods.length>=200)return false;this.foods.push({p,radius,remaining:180,initial:180});}
  this.wakeNear(p,radius);
  this.revision++;return true;
 }
 private wakeNear(p:V,radius:number){
  const close=this.tips.filter(t=>dist(this.nodes[t.node],p)<radius*3.5);
  for(const t of close){if(t.asleep){t.asleep=false;t.energy=40;t.dir=direction(this.nodes[t.node],p);}}
  // Old tissue can bud again when fed; growth doesn't end with the initial tips.
  if(!close.length&&this.nodes.length&&this.tips.length<160){let best=-1,d=radius*4;for(let id=0;id<this.nodes.length;id++){const n=dist(this.nodes[id],p);if(n<d){d=n;best=id;}}if(best>=0)for(let i=0;i<3;i++)this.tips.push({node:best,dir:direction(this.nodes[best],p),energy:40,age:0,asleep:false});}
 }
 placement(s:Placement){if(s.kind==='spore'){const p=this.nodes[this.roots[s.index]];return p?{p,radius:.15}:undefined;}return (s.kind==='food'?this.foods:this.voids)[s.index];}
 deletePlacement(s:Placement){
  if(!this.placement(s))return false;
  if(s.kind==='food')this.foods.splice(s.index,1);
  else if(s.kind==='void')this.voids.splice(s.index,1);
  else {
   const root=this.roots[s.index],adj=this.nodes.map(()=>[] as number[]);
   for(const e of this.edges)if(e.alive){adj[e.a].push(e.b);adj[e.b].push(e.a);}
   const queue=[root],removed=new Set(queue);
   for(let i=0;i<queue.length;i++)for(const id of adj[queue[i]])if(!removed.has(id)){removed.add(id);queue.push(id);}
   const remap=new Int32Array(this.nodes.length).fill(-1),nodes:V[]=[];
   this.nodes.forEach((p,i)=>{if(!removed.has(i)){remap[i]=nodes.length;nodes.push(p);}});
   this.edges=this.edges.filter(e=>!removed.has(e.a)&&!removed.has(e.b)).map(e=>({...e,a:remap[e.a],b:remap[e.b]}));
   this.tips=this.tips.filter(t=>!removed.has(t.node)).map(t=>({...t,node:remap[t.node]}));
   this.roots=this.roots.filter(id=>!removed.has(id)).map(id=>remap[id]);this.nodes=nodes;
   this.rebuild();
  }
  this.revision++;return true;
 }
 transformPlacement(s:Placement,p:V,radius?:number){
  const item=this.placement(s);if(!item||!p.every(Number.isFinite)||radius!==undefined&&!Number.isFinite(radius))return false;
  if(s.kind==='spore'){
   // A rooted network moves as one connected object; established strands never stretch.
   const root=this.roots[s.index],adj=this.nodes.map(()=>[] as number[]);
   for(const e of this.edges)if(e.alive){adj[e.a].push(e.b);adj[e.b].push(e.a);}
   const ids=[root],seen=new Set(ids);for(let i=0;i<ids.length;i++)for(const n of adj[ids[i]])if(!seen.has(n)){seen.add(n);ids.push(n);}
   const delta=p.map((x,i)=>x-item.p[i]) as V;
   const minimum=[-worldBounds.horizontal,.15,-worldBounds.horizontal],maximum=[worldBounds.horizontal,worldBounds.height,worldBounds.horizontal];
   for(let axis=0;axis<3;axis++){let lo=Infinity,hi=-Infinity;for(const id of ids){lo=Math.min(lo,this.nodes[id][axis]);hi=Math.max(hi,this.nodes[id][axis]);}delta[axis]=Math.max(minimum[axis]-lo,Math.min(maximum[axis]-hi,delta[axis]));}
   for(const id of ids)this.nodes[id]=this.nodes[id].map((x,i)=>x+delta[i]) as V;
   this.rebuild();
  }else{
   item.p=[Math.max(-worldBounds.horizontal,Math.min(worldBounds.horizontal,p[0])),Math.max(.15,Math.min(worldBounds.height,p[1])),Math.max(-worldBounds.horizontal,Math.min(worldBounds.horizontal,p[2]))];
   if(radius!==undefined)item.radius=Math.max(.2,Math.min(10,radius));
   if(s.kind==='food'&&this.foods[s.index].remaining>0)this.wakeNear(item.p,item.radius);
  }
  this.revision++;return true;
 }
 excluded(p:V){return this.voids.some(v=>dist(v.p,p)<v.radius);}
 reserve(p:V,radius:number){this.voids.push({p,radius});this.revision++;}
 prune(p:V,radius:number){for(const e of this.edges){const a=this.nodes[e.a],b=this.nodes[e.b];if(dist(a,p)<radius||dist(b,p)<radius)e.alive=false;}this.tips=this.tips.filter(t=>dist(this.nodes[t.node],p)>=radius);this.compact();}
 step(){
  this.time+=.2;const next:GrowthTip[]=[];let active=0;
  for(const t of this.tips){if(t.asleep){next.push(t);continue;}if(this.nodes.length>=capacity||active>=140){next.push({...t,asleep:true});continue;}
   const p=this.nodes[t.node];let v=t.dir.map(x=>x*.95) as V;let intake=0;
   for(const f of this.foods){if(f.remaining<=0)continue;const d=dist(p,f.p);const range=f.radius*4.5;if(d>=range)continue;const pull=1-d/range;const toward=direction(p,f.p);const force=pull*pull*1.6*(d<.45?.08:1);v=v.map((x,i)=>x+toward[i]*force) as V;
    if(d<f.radius){const uptake=Math.min(f.remaining,(1-d/f.radius)*1.6);f.remaining-=uptake;intake+=uptake;this.absorbed+=uptake;}
   }
   for(const f of this.voids){const d=dist(p,f.p);if(d<f.radius+1.2){const away=direction(f.p,p);v=v.map((x,i)=>x+away[i]*3*(1-d/(f.radius+1.2))) as V;}}
   // No target building, vertical tether, surface envelope, or endpoint is supplied.
   v=v.map(x=>x+(this.random()-.5)*this.exploration) as V;
   if(p[1]<.45)v[1]+=(.45-p[1])*2;
   const dir=unit(v),energy=Math.min(90,t.energy-.7+intake*2.8*this.moisture);
   if(energy<=0){next.push({...t,energy:0,asleep:true});continue;}
   const length=.16+Math.min(1,energy/40)*.075;const q=p.map((x,i)=>x+dir[i]*length) as V;
   if(q[1]<.12||q[1]>worldBounds.height||Math.abs(q[0])>worldBounds.horizontal||Math.abs(q[2])>worldBounds.horizontal||this.excluded(q)){next.push({...t,dir:unit([dir[2],Math.abs(dir[1])+.2,-dir[0]]),energy:energy-.8});continue;}
   const near=this.fusionCandidate(q,t.node);
   const fuse=near!==undefined&&t.age>8&&this.random()<.1;
   const id=fuse?near!:this.addNode(q);this.edges.push({a:t.node,b:id,born:this.time,radius:.012,flow:0,alive:true});this.totalLength+=dist(p,this.nodes[id]);
   if(fuse){this.joins++;continue;}
   next.push({node:id,dir,energy,age:t.age+1,asleep:false});active++;
   if(intake>.12&&energy>18&&t.age>5&&this.random()<.08&&active<130&&next.length<180){next.push({node:id,dir:unit([dir[0]+(this.random()-.5)*1.5,dir[1]+(this.random()-.5)*1.5,dir[2]+(this.random()-.5)*1.5]),energy:energy*.65,age:0,asleep:false});active++;}
  }
  this.tips=next.slice(0,240);
  this.foods=this.foods.filter(f=>f.remaining>0);
  if(Math.round(this.time*5)%4===0)this.reinforce();this.revision++;
 }
 reinforce(){
  // A deterministic ancestry tree follows the first rooted growth path. Fusion still
  // joins the visible network, but never requires a whole-network BFS per tick.
  for(const r of this.roots){this.parent[r]=r;this.via[r]=-1;}
  for(;this.transportEdges<this.edges.length;this.transportEdges++){
   const e=this.edges[this.transportEdges];if(!e.alive)continue;
   if(this.parent[e.a]!==undefined&&this.parent[e.b]===undefined){this.parent[e.b]=e.a;this.via[e.b]=this.transportEdges;}
   else if(this.parent[e.b]!==undefined&&this.parent[e.a]===undefined){this.parent[e.a]=e.b;this.via[e.a]=this.transportEdges;}
  }
  for(const i of this.previousFlow)this.edges[i].flow=0;this.previousFlow=[];
  if(this.flowScratch.length<this.edges.length)this.flowScratch=new Float64Array(2**Math.ceil(Math.log2(Math.max(4096,this.edges.length))));
  const flows=this.flowScratch,affected:number[]=[],chunks=new Set<number>();
  // Path compression skips trunks that have reached maximum thickness.
  const growingAncestor=(start:number)=>{if(this.via[start]===undefined||this.via[start]<0||this.edges[this.via[start]].radius<.23)return start;let id=start;const path:number[]=[];while(this.via[id]!==undefined&&this.via[id]>=0&&this.edges[this.via[id]].radius>=.23){path.push(id);id=this.skip[id]??this.parent[id];}for(const n of path)this.skip[n]=id;return id;};
  for(const t of this.tips)if(!t.asleep){let id=growingAncestor(t.node);const demand=.12+t.energy/140;while(this.via[id]!==undefined&&this.via[id]>=0){const edge=this.via[id];if(flows[edge]===0)affected.push(edge);flows[edge]+=demand;id=growingAncestor(this.parent[id]);}}
  for(const i of affected){const e=this.edges[i],before=e.radius,flow=flows[i];flows[i]=0;e.flow=flow;e.radius=Math.min(.23,e.radius+.002*Math.sqrt(flow));if(before<=.055&&e.radius>.055)this.established++;chunks.add(Math.floor(i/renderChunkSize));}
  this.previousFlow=affected;for(const chunk of chunks)this.radiusChunks.set(chunk,(this.radiusChunks.get(chunk)||0)+1);
 }
 get living(){return this.tips.filter(t=>!t.asleep).length;}
 get length(){return this.totalLength;}
 get mature(){return this.established;}
 save(){return JSON.stringify({version:3,seed:this.seed,rng:this.rng,time:this.time,nodes:this.nodes,edges:this.edges,tips:this.tips,roots:this.roots,foods:this.foods,voids:this.voids,joins:this.joins,absorbed:this.absorbed,moisture:this.moisture,exploration:this.exploration});}
 static load(raw:string){const d=JSON.parse(raw);if(d.version!==3||!Array.isArray(d.nodes)||d.nodes.length>capacity||!Array.isArray(d.edges)||!Array.isArray(d.foods)||!Array.isArray(d.tips))throw Error('Invalid organism');const o=new Organism(d.seed);for(const key of ['seed','rng','time','nodes','edges','tips','roots','foods','voids','joins','absorbed','moisture','exploration'] as const)(o as unknown as Record<string,unknown>)[key]=d[key];o.foods=o.foods.filter(f=>f.remaining>0);o.compact();return o;}
}
export function firstSpore(seed=42912){const o=new Organism(seed);o.plant([0,.15,0]);return o;}

