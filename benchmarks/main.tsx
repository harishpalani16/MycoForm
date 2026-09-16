import React,{useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Canvas,useFrame} from '@react-three/fiber';
import {OrbitControls} from '@react-three/drei';
import LivingNetwork,{FiberDetail} from '../src/rendering/LivingNetwork';
import {fixture} from '../scripts/scaleFixture';
import {Organism} from '../src/simulation/organism';

function Meter({report}:{report:(value:string)=>void}){
 const ref=useRef({frames:0,seconds:0});useFrame(({gl},dt)=>{ref.current.frames++;ref.current.seconds+=dt;if(ref.current.seconds>=2){report(`${Math.round(ref.current.frames/ref.current.seconds)} FPS · ${gl.info.render.calls} draw calls · ${gl.info.render.triangles.toLocaleString()} triangles · ${gl.info.render.lines.toLocaleString()} line segments`);ref.current={frames:0,seconds:0};}});return null;
}
function Benchmark(){
 const [count,setCount]=useState(100_000),[o,setO]=useState(()=>Organism.load(fixture(100_000,false).save()));
 const [detail,setDetail]=useState<FiberDetail>('auto'),[stats,setStats]=useState('Measuring…');
 return <><div style={{position:'absolute',zIndex:1,padding:20,background:'#17251be8',borderRadius:6,margin:12}}><b>Synthetic network renderer test</b><p>{o.nodes.length.toLocaleString()} nodes · {o.edges.length.toLocaleString()} strands</p><label>Fixture size <select aria-label="Fixture size" value={count} onChange={e=>setCount(+e.target.value)}>{[24_000,100_000,500_000].map(n=><option key={n} value={n}>{n.toLocaleString()}</option>)}</select></label> <button onClick={()=>{setStats('Measuring…');setO(Organism.load(fixture(count,false).save()))}}>Build fixture</button><p><label>Fiber detail <select aria-label="Fiber detail" value={detail} onChange={e=>setDetail(e.target.value as FiberDetail)}><option value="auto">Adaptive</option><option value="full">Full fibers</option><option value="light">Lightweight</option></select></label></p><output>{stats}</output><p>Live browser measurement, including idle or background throttling.</p></div><div style={{height:'100vh'}}><Canvas camera={{position:[200,145,200],near:.1,far:3000,fov:43}} dpr={[1,1.5]}><LivingNetwork o={o} mode="living" detail={detail}/><OrbitControls target={[0,23,0]} makeDefault/><Meter report={setStats}/></Canvas></div></>;
}
createRoot(document.getElementById('root')!).render(<Benchmark/>);
