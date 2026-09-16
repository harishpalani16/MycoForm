import {test} from 'node:test';
import assert from 'node:assert/strict';
import {firstSpore,Organism,capacity,V} from './organism';

function lattice(count:number){
 const o=firstSpore();o.nodes=Array.from({length:count},(_,i)=>[(i%100)*.4,.15+(Math.floor(i/100)%50)*.4,Math.floor(i/5000)*.4] as V);
 o.edges=Array.from({length:count-1},(_,i)=>({a:i,b:i+1,born:0,radius:.23,flow:0,alive:true}));o.tips=[];
 return Organism.load(o.save());
}
test('fully consumed nutrients leave the model, picker data and saved experiment',()=>{
 const o=firstSpore();o.feed([0,.15,0],2);o.foods[0].remaining=.01;o.feed([15,1,0],1);
 o.step();assert.equal(o.foods.length,1);assert.deepEqual(o.foods[0].p,[15,1,0]);assert.equal(o.foods[0].remaining,180);
 assert.ok(Math.abs(o.absorbed-.01)<1e-9);assert.deepEqual(Organism.load(o.save()).foods,o.foods);
});
test('pruning reclaims nodes and edges without dangling references, then growth resumes',()=>{
 const o=firstSpore();o.feed([1,1,0],2);for(let i=0;i<40;i++)o.step();const before=o.nodes.length;
 o.prune([1,1,0],2);assert.ok(o.nodes.length<before);assert.ok(o.edges.every(e=>e.alive&&o.nodes[e.a]&&o.nodes[e.b]));assert.ok(o.tips.every(t=>o.nodes[t.node]));
 o.feed(o.nodes[o.roots[0]],2);const after=o.nodes.length;o.step();assert.ok(o.nodes.length>after);
 const length=o.edges.reduce((s,e)=>s+Math.hypot(...o.nodes[e.a].map((v,k)=>v-o.nodes[e.b][k])),0);assert.ok(Math.abs(o.length-length)<1e-7);
});
test('growth continues beyond the previous 24,000-node cap',()=>{
 const o=lattice(24_000);o.plant([150,.15,0]);o.feed([150,2,0],2);for(let i=0;i<12;i++)o.step();
 assert.ok(o.nodes.length>24_050);assert.ok(o.living>0);assert.ok(o.nodes.some(p=>p[0]>35));
 const b=Organism.load(o.save());for(let i=0;i<8;i++){o.step();b.step();}assert.equal(o.save(),b.save());
});
test('500,000-node imports reach the new limit and pruning frees capacity',()=>{
 const o=lattice(capacity);assert.equal(o.nodes.length,500_000);assert.equal(o.plant([150,.15,0]),false);
 o.prune([0,.15,0],.9);assert.ok(o.nodes.length<capacity);assert.ok(o.plant([150,.15,0]));o.step();assert.ok(o.nodes.length<=capacity);
});
test('saturated transport paths remain deterministic after save and edits',()=>{
 const o=lattice(6000);o.tips=[{node:5999,dir:[0,1,0],energy:35,age:0,asleep:false}];o.reinforce();
 const b=Organism.load(o.save());for(let i=0;i<12;i++){o.step();b.step();}assert.equal(o.save(),b.save());
 o.prune([0,.15,0],.6);const c=Organism.load(o.save());for(let i=0;i<8;i++){o.step();c.step();}assert.equal(o.save(),c.save());
});
