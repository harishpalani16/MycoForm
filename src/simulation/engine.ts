export type Vec = [number,number,number];
export type Tool = 'inspect'|'inoculate'|'nutrient'|'moisture'|'attractor'|'repeller'|'obstacle'|'target'|'prune';
export type Field = {kind:Tool;p:Vec;radius:number;strength:number;shape?:string};
export type Node = {p:Vec;root:number};
export type Edge = {a:number;b:number;age:number;thickness:number;flow:number;length:number};
type Tip = {node:number;dir:Vec;energy:number;age:number};
export const defaults = {persistence:0.65,exploration:0.55,branching:0.16,attraction:1.2,connection:0.45,maxTips:180};
const distance=(a:Vec,b:Vec)=>Math.hypot(...a.map((x,i)=>x-b[i]));
const unit=(v:Vec):Vec=>{const l=Math.hypot(...v)||1;return v.map(x=>x/l) as Vec};
export class Simulation {
 seed:number; rng:number; nodes:Node[]=[]; edges:Edge[]=[]; tips:Tip[]=[]; fields:Field[]=[];
 time=0; biomass=4200; nutrients=100; interventions=24; colonies=0; connected=false; violations=0; score=0; joins=0; status='ready'; params={...defaults}; hash=new Map<string,number[]>();
 constructor(seed=42912){this.seed=seed;this.rng=seed;}
 random(){this.rng=(Math.imul(1664525,this.rng)+1013904223)>>>0;return this.rng/4294967296;}
 key(p:Vec){return p.map(x=>Math.floor(x/0.6)).join(',');}
 addNode(p:Vec,root:number){let id=this.nodes.length;this.nodes.push({p,root});const k=this.key(p);this.hash.set(k,[...(this.hash.get(k)||[]),id]);return id;}
 nearby(p:Vec){const c=p.map(x=>Math.floor(x/0.6)),r=Math.ceil(this.params.connection/0.6),ids:number[]=[];for(let x=-r;x<=r;x++)for(let y=-r;y<=r;y++)for(let z=-r;z<=r;z++)ids.push(...(this.hash.get([c[0]+x,c[1]+y,c[2]+z].join(','))||[]));return ids;}
 place(kind:Tool,p:Vec,radius=2,strength=1,shape='box'){
 if(kind==='inoculate'){if(this.colonies>=3||Math.abs(p[0])<6||Math.abs(p[2])>3)return false;let root=this.nodes.length,id=this.addNode(p,root);for(let i=0;i<8;i++)this.tips.push({node:id,dir:unit([p[0]<0?1:-1,(this.random()-.5)*.4,(this.random()-.5)*1.5]),energy:95,age:0});this.colonies++;this.status='ready';return true;}
 if(kind==='inspect')return false;
 if(kind==='prune'){if(this.interventions<=0)return false;const removed=new Set<number>();this.edges=this.edges.filter(e=>{const hit=distance(this.nodes[e.b].p,p)<radius;if(hit)removed.add(e.b);return !hit});this.tips=this.tips.filter(t=>!removed.has(t.node));this.interventions--;this.evaluate();return true;}
 if(kind==='nutrient'){if(this.nutrients<5)return false;this.nutrients-=5;}else {if(this.interventions<=0)return false;this.interventions--;}
 this.fields.push({kind,p,radius,strength,shape});return true;
 }
 blocked(p:Vec){return this.fields.some(f=>f.kind==='obstacle'&&(f.shape==='sphere'?distance(p,f.p)<f.radius*.45:f.shape==='cylinder'?Math.hypot(p[0]-f.p[0],p[2]-f.p[2])<f.radius*.45&&Math.abs(p[1]-f.p[1])<1.8:Math.max(Math.abs(p[0]-f.p[0]),Math.abs(p[2]-f.p[2]))<f.radius*.45&&Math.abs(p[1]-f.p[1])<1.8));}
 step(){
 if(!this.tips.length||this.biomass<=0){this.status='failed';return;}this.time+=.2;const next:Tip[]=[];
 for(const tip of this.tips){if(this.biomass<=0||this.nodes.length>=18000)break;const p=this.nodes[tip.node].p;let food=0,wet=0;let v:Vec=tip.dir.map(x=>x*this.params.persistence) as Vec;
 // The far support is an environmental objective, never a precomputed path.
 const root=this.nodes[this.nodes[tip.node].root].p;const target:Vec=[root[0]<0?7.7:-7.7,2.3,0];const td=unit(target.map((x,i)=>x-p[i]) as Vec);v=v.map((x,i)=>x+td[i]*.12) as Vec;
 for(const f of this.fields){const d=distance(p,f.p);if(f.kind==='nutrient'||f.kind==='moisture'){const q=Math.max(0,1-d/f.radius)*f.strength;if(f.kind==='nutrient')food+=q;else wet+=q;}if(['nutrient','moisture','attractor','repeller','target'].includes(f.kind)){const range=f.kind==='attractor'||f.kind==='target'?f.radius*5:f.radius*2;const force=Math.max(0,1-d/range)*f.strength*this.params.attraction*(f.kind==='repeller'?-3:1);const dir=unit(f.p.map((x,i)=>x-p[i]) as Vec);v=v.map((x,i)=>x+dir[i]*force) as Vec;}}
 v[1]+=(2.4-p[1])*.25;v=v.map((x,i)=>x+(this.random()-.5)*this.params.exploration*(i===1?.4:1)) as Vec;let dir=unit(v);let q=p.map((x,i)=>x+dir[i]*.25) as Vec;
 if(this.blocked(q)){dir=unit([dir[2]+(this.random()-.5),.25,-dir[0]]);q=p.map((x,i)=>x+dir[i]*.25) as Vec;if(this.blocked(q))continue;}
 if(Math.abs(q[0])>10||Math.abs(q[2])>7||q[1]<.4||q[1]>6)continue;
 const energy=tip.energy-1.1+food*2.3+wet*.5;if(energy<=0)continue;
 let near=this.nearby(q).find(id=>id!==tip.node&&id<tip.node-14&&distance(this.nodes[id].p,q)<this.params.connection&&distance(this.nodes[id].p,p)>.12);
 // Occasional fusion preserves exploration while forming redundant graph paths.
 const joined=near!==undefined&&this.random()<.16;let b=joined?near!:this.addNode(q,this.nodes[tip.node].root);
 this.edges.push({a:tip.node,b,age:0,thickness:.018,flow:food*.2,length:distance(p,this.nodes[b].p)});this.biomass--;if(joined){this.joins++;continue;}
 next.push({node:b,dir,energy:Math.min(120,energy),age:tip.age+1});
 if(tip.age>3&&this.random()<this.params.branching*(.25+food)&&next.length<this.params.maxTips){next.push({node:b,dir:unit([dir[0]+(this.random()-.5),dir[1]+(this.random()-.5)*.7,dir[2]+(this.random()-.5)*1.8]),energy:energy*.8,age:0});}
 }
 this.tips=next.slice(0,this.params.maxTips);for(const e of this.edges){e.age+=.2;e.flow*=.99;}if(Math.round(this.time*5)%5===0)this.transport();this.evaluate();if(this.status!=='success'&&(!this.tips.length||this.biomass<=0))this.status='failed';
 }
 transport(){const adj=this.nodes.map(()=>[] as {node:number;edge:number}[]);this.edges.forEach((e,i)=>{adj[e.a].push({node:e.b,edge:i});adj[e.b].push({node:e.a,edge:i});});const parent=new Int32Array(this.nodes.length).fill(-1),pe=new Int32Array(this.nodes.length).fill(-1),queue:number[]=[];this.nodes.forEach((n,i)=>{if(n.root===i){parent[i]=i;queue.push(i);}});for(let k=0;k<queue.length;k++)for(const a of adj[queue[k]])if(parent[a.node]===-1){parent[a.node]=queue[k];pe[a.node]=a.edge;queue.push(a.node);}const supply=this.nodes.map(n=>this.fields.reduce((s,f)=>s+(f.kind==='nutrient'?Math.max(0,1-distance(n.p,f.p)/f.radius)*.015:0),0));for(let k=queue.length-1;k>=0;k--){const id=queue[k];if(pe[id]>=0){const e=this.edges[pe[id]];e.flow=Math.min(3,e.flow+supply[id]);e.thickness=Math.min(.105,e.thickness+e.flow*.002);supply[parent[id]]+=supply[id];}}}
 evaluate(){const parents=this.nodes.map((_,i)=>i);const find=(x:number):number=>{while(parents[x]!==x){parents[x]=parents[parents[x]];x=parents[x];}return x};for(const e of this.edges)parents[find(e.b)]=find(e.a);const a=new Set<number>(),b=new Set<number>();this.nodes.forEach((n,i)=>{if(n.p[0]<-6)a.add(find(i));if(n.p[0]>6)b.add(find(i));});this.connected=[...a].some(x=>b.has(x));this.violations=this.nodes.filter(n=>Math.abs(n.p[0])<2&&n.p[1]<1.7&&Math.abs(n.p[2])<1.3).length;const span=this.nodes.length?Math.min(1,(Math.max(...this.nodes.map(n=>n.p[0]))-Math.min(...this.nodes.map(n=>n.p[0])))/12):0;this.score=Math.max(0,Math.round((this.connected?45:span*20)+Math.min(25,this.edges.length/24)+Math.min(20,this.joins*2)+(this.biomass>400?10:0)-this.violations*2));if(this.connected&&this.score>=70&&this.violations===0)this.status='success';}
 save(){return JSON.stringify({version:1,...this,hash:undefined});}
 static load(raw:string){const data=JSON.parse(raw);if(data.version!==1||!Array.isArray(data.nodes)||!Array.isArray(data.edges)||!Array.isArray(data.fields)||data.nodes.length>18000)throw Error('Unsupported experiment');const s=new Simulation();Object.assign(s,data);s.hash=new Map();s.nodes.forEach((n,i)=>{const k=s.key(n.p);s.hash.set(k,[...(s.hash.get(k)||[]),i]);});return s;}
}
