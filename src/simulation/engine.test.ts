import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from './engine';
function cultivated(seed=42912){const s=new Simulation(seed);s.place('inoculate',[-8,2.25,0]);for(let x=-6;x<=6;x+=2)s.place('nutrient',[x,2.25,0],2.5,1);s.place('attractor',[8,2.25,0],3,1);return s;}
test('same seed and interventions reproduce the exact network',()=>{const a=cultivated(),b=cultivated();for(let i=0;i<90;i++){a.step();b.step();}assert.equal(a.save(),b.save());});
test('cultivated bridge achieves a connected success state within budget',()=>{const s=cultivated();for(let i=0;i<700&&s.status!=='success'&&s.status!=='failed';i++)s.step();assert.equal(s.status,'success',JSON.stringify({score:s.score,nodes:s.nodes.length,joins:s.joins,biomass:s.biomass,connected:s.connected}));assert.ok(s.connected);assert.ok(s.joins>0);assert.ok(s.edges.some(e=>e.thickness>.018));assert.equal(s.violations,0);});
test('fields and seeds causally change growth',()=>{const a=cultivated(),b=cultivated(991),c=new Simulation();c.place('inoculate',[-8,2.25,0]);for(let i=0;i<55;i++){a.step();b.step();c.step();}assert.notDeepEqual(a.nodes,b.nodes);assert.notDeepEqual(a.nodes,c.nodes);});
test('save and load preserve deterministic continuation',()=>{const a=cultivated();for(let i=0;i<35;i++)a.step();const b=Simulation.load(a.save());for(let i=0;i<20;i++){a.step();b.step();}assert.equal(a.save(),b.save());});
test('growth avoids placed obstacles and cannot spend nonexistent resources',()=>{const s=cultivated();s.place('obstacle',[-3,2.25,0],2,1,'sphere');for(let i=0;i<80;i++)s.step();assert.ok(s.nodes.every(n=>!s.blocked(n.p)));s.nutrients=0;assert.equal(s.place('nutrient',[0,2.25,0]),false);});
test('unfed growth eventually fails and isolated supports do not count as connection',()=>{const s=new Simulation();s.place('inoculate',[-8,2.25,0]);s.place('inoculate',[8,2.25,0]);s.evaluate();assert.equal(s.connected,false);s.biomass=1;s.step();assert.equal(s.status,'failed');});
