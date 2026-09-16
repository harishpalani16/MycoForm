export type Point = [number, number, number];
export type HabitatKind = 'column' | 'wall' | 'roof' | 'void' | 'nutrient';
export type Habitat = { id: number; kind: HabitatKind; p: Point; size: Point };
export type Cell = { p: Point; kind: HabitatKind; born: number; vigor: number; parent?: Point };
export const spacing = .4;
export const maxCells = 64000;
const key = (p: Point) => p.map(x => Math.round(x / spacing)).join(',');
export class Building {
  seed: number; rng: number; time = 0; height = 4.8; moisture = .72; vitality = .75;
  cells: Cell[] = []; habitats: Habitat[] = []; budget = 22000; spent = 0;
  frontier = new Map<string, Point>(); occupied = new Set<string>(); revision = 0;
  constructor(seed = 42912) { this.seed = seed; this.rng = seed; }
  random() { this.rng = (Math.imul(this.rng, 1664525) + 1013904223) >>> 0; return this.rng / 4294967296; }
  add(kind: HabitatKind, p: Point, size: Point) { this.habitats.push({id: this.habitats.length, kind, p, size}); this.revision++; }
  contains(h: Habitat, p: Point) {
    const d = p.map((v, i) => Math.abs(v - h.p[i]));
    if (h.kind === 'column') return Math.hypot(d[0], d[2]) <= h.size[0] / 2 && d[1] <= h.size[1] / 2;
    if (h.kind === 'roof') { const roofY = h.p[1] + Math.max(0, 1 - d[0] / (h.size[0] / 2)) * 1.2; return d[0] <= h.size[0]/2 && d[2] <= h.size[2]/2 && Math.abs(p[1] - roofY) < .31; }
    return d.every((v, i) => v <= h.size[i] / 2 + .01);
  }
  medium(p: Point) {
    if (p[1] < .19 || p[1] > 40 || Math.abs(p[0]) > 40 || Math.abs(p[2]) > 40) return undefined;
    if (this.habitats.some(h => h.kind === 'void' && this.contains(h,p))) return undefined;
    return this.habitats.find(h => !['void','nutrient'].includes(h.kind) && this.contains(h,p));
  }
  neighbors(p: Point) { const points: Point[] = []; for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++){if(!x&&!y&&!z)continue;if(Math.abs(x)+Math.abs(y)+Math.abs(z)>2)continue;points.push([p[0]+x*spacing,p[1]+y*spacing,p[2]+z*spacing]);} return points; }
  spread(p: Point) { for(const q of this.neighbors(p)){const k=key(q);if(!this.occupied.has(k)&&this.medium(q))this.frontier.set(k,q);} }
  inoculate(p: Point) {
    const q=p.map(v=>Math.round(v/spacing)*spacing) as Point;q[1]=Math.max(.4,q[1]);
    if (!this.medium(q) || this.occupied.has(key(q))) return false;
    this.growCell(q);return true;
  }
  growCell(p: Point) {
    const h=this.medium(p);if(!h||this.cells.length>=maxCells||this.spent>=this.budget)return;
    // Persist an actual already-colonized neighbor as the source of this growth.
    // Selecting it without consuming randomness preserves the growth model's seed sequence.
    const sources=this.neighbors(p).filter(q=>this.occupied.has(key(q)));
    const index=Math.abs(Math.round(p[0]*71+p[1]*113+p[2]*173))%Math.max(1,sources.length);
    this.cells.push({p,kind:h.kind,born:this.time,vigor:.7+this.random()*.3,...(sources[index]?{parent:sources[index]}:{})});
    this.occupied.add(key(p));this.frontier.delete(key(p));this.spread(p);this.spent++;
  }
  step() {
    this.time += .25; let count=0;
    for(const [k,p] of [...this.frontier]) {
      if(this.spent>=this.budget||this.cells.length>=maxCells||count>=110)break;
      if(!this.medium(p)){this.frontier.delete(k);continue;}
      const food=this.habitats.some(h=>h.kind==='nutrient'&&this.contains(h,p));
      // Only a connected frontier can colonize substrate. Fields change local probability.
      const probability=(.035+this.moisture*.13+this.vitality*.06+(food?.22:0))*(.8+this.random()*.4);
      if(this.random()<probability){this.growCell(p);count++;}
    }
    this.revision++;
  }
  rebuildFrontier(){this.frontier.clear();for(const c of this.cells)this.spread(c.p);}
  replenish(){this.budget+=8000;this.revision++;}
  prune(p:Point,r=1.2){this.cells=this.cells.filter(c=>Math.hypot(...c.p.map((v,i)=>v-p[i]))>r);this.occupied=new Set(this.cells.map(c=>key(c.p)));this.rebuildFrontier();this.revision++;}
  reset(){this.cells=[];this.spent=0;this.time=0;this.rng=this.seed;this.frontier.clear();this.occupied.clear();this.revision++;}
  coverage(kind: HabitatKind){let total=0,filled=0;for(let x=-8;x<=8;x+=spacing)for(let z=-6;z<=6;z+=spacing){if(kind==='roof'){const h=this.habitats.find(h=>h.kind==='roof'&&Math.abs(x-h.p[0])<=h.size[0]/2&&Math.abs(z-h.p[2])<=h.size[2]/2);if(!h)continue;const y=h.p[1]+Math.max(0,1-Math.abs(x-h.p[0])/(h.size[0]/2))*1.2;const p:Point=[x,Math.round(y/spacing)*spacing,z];if(!this.medium(p))continue;total++;if(this.occupied.has(key(p)))filled++;}}
    return total?Math.round(filled/total*100):0;
  }
  save(){return JSON.stringify({version:2,seed:this.seed,rng:this.rng,time:this.time,height:this.height,moisture:this.moisture,vitality:this.vitality,cells:this.cells,habitats:this.habitats,budget:this.budget,spent:this.spent});}
  static load(raw:string){const d=JSON.parse(raw);if(d.version!==2||!Array.isArray(d.cells)||!Array.isArray(d.habitats)||d.cells.length>maxCells||d.habitats.length>1000)throw Error('Invalid studio file');if(!d.cells.every((c:Cell)=>Array.isArray(c.p)&&c.p.length===3&&c.p.every(Number.isFinite)))throw Error('Invalid cells');const b=new Building(d.seed);Object.assign(b,d);b.occupied=new Set(b.cells.map(c=>key(c.p)));b.rebuildFrontier();return b;}
}
export function pavilion(layout='pavilion',height=4.8,seed=42912) {
  const b=new Building(seed);b.height=height;
  for(const x of [-5.6,0,5.6])for(const z of [-4,4])b.add('column',[x,height/2,z],[1.1,height,1.1]);
  b.add('wall',[0,height/2,-4],[11.6,height,.6]);
  for(const x of [-5.6,5.6])b.add('wall',[x,height/2,0],[.6,height,8]);
  if(layout==='courtyard')b.add('wall',[0,height/2,4],[11.6,height,.6]);
  b.add('roof',[0,height,0],[12.8,.6,9.6]);
  b.add('void',[0,1.4,4],[2.8,2.8,1.6]);
  for(const x of [-5.6,5.6])b.add('void',[x,2.2,0],[1.3,1.6,3.2]);
  b.add('void',[0,2.4,-4],[3.2,1.6,1.4]);
  if(layout==='courtyard')b.add('void',[0,height+1,0],[3.2,4,3.2]);
  return b;
}

