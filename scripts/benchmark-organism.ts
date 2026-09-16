import {mkdirSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {firstSpore,Organism,V} from '../src/simulation/organism';

import {fixture} from './scaleFixture';
const results=[];
for(const count of [24_000,100_000,490_000])for(const mature of [false,true]){
 const raw=fixture(count,mature).save(),begin=performance.now(),o=Organism.load(raw),load=performance.now()-begin;
 const samples:number[]=[];
 for(let i=0;i<32;i++){const start=performance.now();o.step();samples.push(performance.now()-start);}
 const sorted=[...samples].sort((a,b)=>a-b);
 results.push({nodes:count,mature,loadMs:+load.toFixed(2),firstFourStepsMaxMs:+Math.max(...samples.slice(0,4)).toFixed(2),medianMs:+sorted[16].toFixed(2),p95Ms:+sorted[30].toFixed(2),activeTips:o.living});
}
mkdirSync('artifacts',{recursive:true});
writeFileSync('artifacts/growth-benchmark.json',JSON.stringify({note:'Node.js CPU simulation timings on synthetic 128-branch networks. Not browser FPS.',results},null,2));
console.table(results);
if(process.argv.includes('--browser-fixture'))writeFileSync('artifacts/scale-500k.json',fixture(500_000,false).save());

