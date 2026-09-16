import {firstSpore,Organism,V} from '../src/simulation/organism';
// Synthetic 128-branch canopy: a repeatable stress fixture, not a biological model.
export function fixture(count:number,mature:boolean){
 const o=firstSpore();o.nodes=[[0,.15,0]];o.edges=[];o.tips=[];o.time=100;
 for(let i=1;i<count;i++){
  const branch=(i-1)%128,level=Math.floor((i-1)/128)+1,angle=branch/128*Math.PI*2;
  const distance=level*.025;
  o.nodes.push([Math.cos(angle)*distance,level*.012+.15+Math.sin(level*.03+angle)*.1,Math.sin(angle)*distance] as V);
  o.edges.push({a:i<=128?0:i-128,b:i,born:0,radius:mature?.23:.025,flow:0,alive:true});
 }
 for(let i=Math.max(1,count-128);i<count;i++)o.tips.push({node:i,dir:[0,1,0],energy:90,age:0,asleep:false});
 return o;
}
