import {useEffect,useMemo,useRef} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {OrbitControls,Grid} from '@react-three/drei';
import * as THREE from 'three';
import {Organism,V,worldBounds,Placement} from '../simulation/organism';

import PlacementGumball,{GumballMode} from './PlacementGumball';
import LivingNetwork,{FiberDetail} from './LivingNetwork';
const camera={position:[13,10,16] as V,fov:43,far:3000};
function Camera({view,o,fit}:{view:string;o:Organism;fit:number}){
 const {camera,controls,size}=useThree();
 useEffect(()=>{
  const box=new THREE.Box3(),p=new THREE.Vector3();
  for(const node of o.nodes)box.expandByPoint(p.set(...node));
  for(const item of [...o.foods,...o.voids]){box.expandByPoint(p.set(...item.p).addScalar(item.radius));box.expandByPoint(p.set(...item.p).addScalar(-item.radius));}
  if(box.isEmpty())box.setFromCenterAndSize(new THREE.Vector3(0,2,0),new THREE.Vector3(8,6,8));
  const center=box.getCenter(new THREE.Vector3()),radius=Math.max(4,box.getSize(new THREE.Vector3()).length()/2);
  const fov=(camera as THREE.PerspectiveCamera).fov*Math.PI/180;
  const angle=Math.min(fov/2,Math.atan(Math.tan(fov/2)*size.width/size.height));
  const distance=Math.max(10,radius/Math.sin(angle))*(view==='close'?.75:1.2);
  const direction=new THREE.Vector3(...(view==='above'?[0,1,.001]:[1,.7,1.2]) as V).normalize();
  camera.position.copy(center).addScaledVector(direction,distance);
  if(controls){const c=controls as unknown as {target:THREE.Vector3;update:()=>void};c.target.copy(center);c.update();}camera.lookAt(center);
 // Growth must not move the user's camera; refit only on explicit view/fit changes or import.
 },[camera,controls,view,fit,o,size.width,size.height]);return null;
}
function Tips({o}:{o:Organism}){const ref=useRef<THREE.Points>(null);const geo=useMemo(()=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(240*3),3));return g},[]);useEffect(()=>()=>geo.dispose(),[geo]);useFrame(()=>{const a=geo.attributes.position;let i=0;for(const t of o.tips)if(!t.asleep&&i<240)a.setXYZ(i++,...o.nodes[t.node]);a.needsUpdate=true;geo.setDrawRange(0,i)});return <points ref={ref} geometry={geo} frustumCulled={false}><pointsMaterial color="#e6ffac" size={.075} transparent opacity={.85} depthWrite={false}/></points>}
function Brush({tool,height,radius,place}:{tool:string;height:number;radius:number;place:(p:V)=>void}){const ring=useRef<THREE.Mesh>(null);const last=useRef<V|null>(null);const apply=(p:V)=>{if(!last.current||Math.hypot(...p.map((x,i)=>x-last.current![i]))>radius*.55){place(p);last.current=p;}};return <><mesh ref={ring} rotation={[-Math.PI/2,0,0]} visible={false}><ringGeometry args={[radius*.97,radius,48]}/><meshBasicMaterial color={tool==='clear'?'#d6a777':'#bdde90'} transparent opacity={.5} depthWrite={false}/></mesh><mesh rotation={[-Math.PI/2,0,0]} position={[0,height,0]} onPointerDown={e=>{if(tool==='observe')return;e.stopPropagation();last.current=null;apply([e.point.x,height,e.point.z]);}} onPointerUp={()=>{last.current=null}} onPointerLeave={()=>{last.current=null;if(ring.current)ring.current.visible=false}} onPointerMove={e=>{if(tool==='observe')return;e.stopPropagation();if(ring.current){ring.current.visible=true;ring.current.position.set(e.point.x,height,e.point.z);}if(e.buttons===1&&tool==='feed')apply([e.point.x,height,e.point.z]);}}><planeGeometry args={[worldBounds.horizontal*2,worldBounds.horizontal*2]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh></>}
export default function OrganicWorld({o,tool,height,radius,place,view,fit,detail,fields,mode,selection,select,transformMode,transform}:{o:Organism;tool:string;height:number;radius:number;place:(p:V)=>void;view:string;fit:number;detail:FiberDetail;fields:boolean;mode:string;selection:Placement|null;select:(s:Placement)=>void;transformMode:GumballMode;transform:(s:Placement,p:V,radius?:number)=>void}){return <Canvas camera={camera} dpr={[1,1.5]}><color attach="background" args={['#121b18']}/><ambientLight intensity={1.4}/><directionalLight position={[5,15,8]} intensity={2}/><Grid args={[1000,1000]} cellSize={1} sectionSize={5} cellColor="#26362c" sectionColor="#354b3a" fadeDistance={600} position={[0,-.04,0]}/><mesh rotation={[-Math.PI/2,0,0]} position={[0,-.08,0]}><planeGeometry args={[1500,1500]}/><meshStandardMaterial color="#15221b" roughness={1}/></mesh><mesh rotation={[-Math.PI/2,0,0]} position={[0,-.02,0]}><circleGeometry args={[9,80]}/><meshStandardMaterial color="#273728" roughness={1}/></mesh>{Array.from({length:11},(_,i)=><mesh key={i} position={[Math.cos(i*2.4)*(7+i*.08),.08,Math.sin(i*2.4)*7]} scale={[.22+(i%3)*.1,.12,.22]} rotation={[i*.1,i,0]}><dodecahedronGeometry args={[1,0]}/><meshStandardMaterial color="#566049" roughness={1}/></mesh>)}<LivingNetwork o={o} mode={mode} detail={detail}/><Tips o={o}/><PlacementGumball o={o} selection={selection} select={select} enabled={tool==='transform'} fields={fields} mode={transformMode} change={transform}/>{tool!=='transform'&&<Brush tool={tool} height={height} radius={radius} place={place}/>}<OrbitControls makeDefault enableRotate={tool==='observe'||tool==='transform'} enablePan={tool==='observe'||tool==='transform'} maxPolarAngle={Math.PI/2-.04} minDistance={3} maxDistance={1600}/><Camera view={view} o={o} fit={fit}/></Canvas>}
