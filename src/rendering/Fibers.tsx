import {useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {Building,Point,maxCells} from '../simulation/building';

const MAX_SEGMENTS=maxCells*6;
const cellKey=(p:Point)=>p.map(v=>Math.round(v/.4)).join(',');
const noise=(p:Point,s:number)=>{const n=Math.sin(p[0]*127.1+p[1]*311.7+p[2]*74.7+s*43.3)*43758.5453;return n-Math.floor(n);};
const vertexShader=`
attribute vec3 startPoint;
attribute vec3 endPoint;
attribute float birth;
attribute float vigor;
uniform float growthTime;
varying float freshness;
varying vec3 surfaceNormal;
void main(){
 float age=max(0.0,growthTime-birth);
 float extension=clamp(age/0.65,0.015,1.0);
 vec3 axis=normalize(endPoint-startPoint);
 vec3 tangent=normalize(cross(axis,abs(axis.y)>.9?vec3(1.,0.,0.):vec3(0.,1.,0.)));
 vec3 bitangent=cross(axis,tangent);
 float thickness=(0.006+0.013*clamp(age/6.0,0.0,1.0))*vigor;
 vec3 radial=tangent*position.x+bitangent*position.z;
 vec3 p=mix(startPoint,endPoint,(position.y+.5)*extension)+radial*thickness;
 surfaceNormal=normalize(normalMatrix*(tangent*normal.x+axis*normal.y+bitangent*normal.z));
 freshness=1.-clamp(age/2.5,0.,1.);
 gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
}`;
const fragmentShader=`
varying float freshness;
varying vec3 surfaceNormal;
void main(){
 float light=.56+.44*abs(dot(normalize(surfaceNormal),normalize(vec3(.3,.8,.6))));
 vec3 mature=vec3(.72,.78,.58)*light;
 vec3 tip=vec3(.78,1.,.47);
 gl_FragColor=vec4(mix(mature,tip,freshness*.8),1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;

/** Three curved strands per colonization link, two segments each, one GPU draw call.
 * Endpoints and age are uploaded only when simulation state or visibility changes.
 * The GPU interpolates extension and reinforcement; no per-strand React objects.
 */
export default function Fibers({b,roof,cut}:{b:Building;roof:boolean;cut:boolean}){
 const data=useMemo(()=>{
   const base=new THREE.CylinderGeometry(1,1,1,4,1,true);
   const geometry=new THREE.InstancedBufferGeometry();geometry.index=base.index;
   geometry.attributes.position=base.attributes.position;geometry.attributes.normal=base.attributes.normal;
   for(const [name,width] of [['startPoint',3],['endPoint',3],['birth',1],['vigor',1]] as const){geometry.setAttribute(name,new THREE.InstancedBufferAttribute(new Float32Array(MAX_SEGMENTS*width),width).setUsage(THREE.DynamicDrawUsage));}
   geometry.instanceCount=0;
   const material=new THREE.ShaderMaterial({vertexShader,fragmentShader,uniforms:{growthTime:{value:0}},side:THREE.DoubleSide});
   return {geometry,material};
 },[]);
 const previous=useRef({b:null as Building|null,revision:-1,roof,cut,count:-1,time:-1});
 const displayTime=useRef(b.time);
 useFrame((_,delta)=>{
   const prev=previous.current;
   if(prev.b!==b||b.time<prev.time)displayTime.current=b.time;
   displayTime.current+=Math.min(1,delta*16)*(b.time-displayTime.current);
   data.material.uniforms.growthTime.value=displayTime.current+.25;
   if(prev.b===b&&prev.revision===b.revision&&prev.roof===roof&&prev.cut===cut&&prev.count===b.cells.length&&prev.time===b.time)return;
   const attrs=data.geometry.attributes;let count=0;
   // Older saves lack parent links. Reconstruct only from cells born earlier in their stored order.
   const earlier=new Map<string,Point>();const existing=new Set(b.cells.map(c=>cellKey(c.p)));
   for(const c of b.cells){
     const parent=c.parent??b.neighbors(c.p).map(p=>earlier.get(cellKey(p))).find(Boolean);
     earlier.set(cellKey(c.p),c.p);
     if(!parent||!existing.has(cellKey(parent))||!roof&&c.kind==='roof'||cut&&(c.p[2]>1||parent[2]>1))continue;
     for(let strand=0;strand<3;strand++){
       const jitter=(p:Point):Point=>p.map((v,i)=>v+(noise(p,strand*3+i)-.5)*.13) as Point;
       const a=jitter(parent),end=jitter(c.p);
       const mid=a.map((v,i)=>(v+end[i])/2+(noise(c.p,strand*9+i+20)-.5)*.11) as Point;
       for(let half=0;half<2;half++){
         if(count>=MAX_SEGMENTS)break;
         (attrs.startPoint as THREE.InstancedBufferAttribute).setXYZ(count,...(half?mid:a));
         (attrs.endPoint as THREE.InstancedBufferAttribute).setXYZ(count,...(half?end:mid));
         attrs.birth.setX(count,c.born+half*.25);attrs.vigor.setX(count,c.vigor*(strand===0?1.15:.7));count++;
       }
     }
   }
   data.geometry.instanceCount=count;
   for(const name of ['startPoint','endPoint','birth','vigor']){const attr=attrs[name] as THREE.InstancedBufferAttribute;attr.clearUpdateRanges();attr.addUpdateRange(0,Math.max(1,count)*attr.itemSize);attr.needsUpdate=true;}
   previous.current={b,revision:b.revision,roof,cut,count:b.cells.length,time:b.time};
 });
 useEffect(()=>()=>{data.geometry.dispose();data.material.dispose();},[data]);
 return <mesh geometry={data.geometry} material={data.material} frustumCulled={false}/>;
}

