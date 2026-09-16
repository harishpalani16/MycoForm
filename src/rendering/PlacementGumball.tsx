import {useLayoutEffect,useMemo,useRef} from 'react';
import {TransformControls} from '@react-three/drei';
import * as THREE from 'three';
import {Organism,Placement,V} from '../simulation/organism';

export type GumballMode='translate'|'scale';
type Props={o:Organism;selection:Placement|null;select:(s:Placement)=>void;enabled:boolean;fields:boolean;mode:GumballMode;change:(s:Placement,p:V,radius?:number)=>void};
const isSelected=(a:Placement|null,b:Placement)=>a?.kind===b.kind&&a.index===b.index;
function Gumball({o,selection,mode,change}:{o:Organism;selection:Placement;mode:GumballMode;change:Props['change']}){
 const object=useMemo(()=>new THREE.Object3D(),[]);const dragging=useRef(false);const baseRadius=useRef(1);const item=o.placement(selection);
 useLayoutEffect(()=>{if(item&&!dragging.current){object.position.set(...item.p);object.scale.setScalar(1);}},[object,item,o.revision]);
 if(!item)return null;
 return <><primitive object={object}/><TransformControls object={object} mode={selection.kind==='spore'?'translate':mode} space="world" size={.85}
 onMouseDown={()=>{dragging.current=true;baseRadius.current=item.radius;}}
 onObjectChange={()=>{if(!dragging.current)return;const scale=Math.max(object.scale.x,object.scale.y,object.scale.z);const smaller=Math.min(object.scale.x,object.scale.y,object.scale.z);const factor=scale>1.0001?scale:smaller;change(selection,object.position.toArray() as V,mode==='scale'&&selection.kind!=='spore'?baseRadius.current*Math.max(.01,factor):undefined);}}
 onMouseUp={()=>{dragging.current=false;const current=o.placement(selection);if(current){object.position.set(...current.p);object.scale.setScalar(1);}}}/></>;
}
export default function PlacementGumball({o,selection,select,enabled,fields,mode,change}:Props){
 const pick=(s:Placement)=>(e:{stopPropagation:()=>void})=>{if(enabled){e.stopPropagation();select(s);}};
 return <>
 {o.roots.map((id,index)=>{const s:Placement={kind:'spore',index};return <group key={`s${id}`} position={o.nodes[id]} onPointerDown={pick(s)}><mesh><sphereGeometry args={[.13,16,16]}/><meshStandardMaterial color={isSelected(selection,s)?'#f5e2ab':'#b8c985'} emissive="#719943" emissiveIntensity={.35}/></mesh>{enabled&&<mesh><sphereGeometry args={[.32,12,12]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>}{isSelected(selection,s)&&<mesh><sphereGeometry args={[.25,16,12]}/><meshBasicMaterial color="#f5e2ab" wireframe transparent opacity={.6}/></mesh>}</group>})}
 {(fields||enabled)&&o.foods.map((f,index)=>{const s:Placement={kind:'food',index};if(f.remaining<=0&&!enabled)return null;return <group key={`f${index}`} position={f.p} onPointerDown={pick(s)}><mesh><sphereGeometry args={[enabled?.14:.08,12,12]}/><meshBasicMaterial color={isSelected(selection,s)?'#ffe2a5':f.remaining>0?'#d4e998':'#66745b'}/></mesh><mesh rotation={[-Math.PI/2,0,0]}><ringGeometry args={[f.radius*.96,f.radius,48]}/><meshBasicMaterial color={isSelected(selection,s)?'#ffe2a5':'#a4c870'} transparent opacity={isSelected(selection,s)?.7:.25} side={THREE.DoubleSide} depthWrite={false}/></mesh><mesh><sphereGeometry args={[f.radius,20,12]}/><meshBasicMaterial color="#a4c870" wireframe transparent opacity={isSelected(selection,s)?.12:.035} depthWrite={false}/></mesh>{enabled&&<mesh><sphereGeometry args={[.32,12,12]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>}</group>})}
 {(fields||enabled)&&o.voids.map((v,index)=>{const s:Placement={kind:'void',index};return <group key={`v${index}`} position={v.p} onPointerDown={pick(s)}><mesh><sphereGeometry args={[v.radius,20,16]}/><meshBasicMaterial color={isSelected(selection,s)?'#ffe2a5':'#bd936d'} wireframe transparent opacity={isSelected(selection,s)?.45:.18}/></mesh>{enabled&&<mesh><sphereGeometry args={[.14,12,12]}/><meshBasicMaterial color="#dfb084"/></mesh>}</group>})}
 {enabled&&selection&&<Gumball key={`${selection.kind}-${selection.index}`} o={o} selection={selection} mode={mode} change={change}/>}
 </>;
}
