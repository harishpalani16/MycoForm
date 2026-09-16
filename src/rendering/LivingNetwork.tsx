import {useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {Organism,renderChunkSize} from '../simulation/organism';

export type FiberDetail='auto'|'full'|'light';
const vertexShader=`
attribute vec3 a; attribute vec3 b; attribute float born;
attribute float radius; attribute float edgeId; attribute float lane;
uniform float time; uniform float fine; varying float fresh; varying vec3 n;
void main(){
 float age=max(0.,time-born);float progress=clamp(age/.5,.001,1.);
 vec3 axis=normalize(b-a);vec3 u=normalize(cross(axis,abs(axis.y)>.9?vec3(1.,0.,0.):vec3(0.,1.,0.)));vec3 v=cross(axis,u);
 vec3 offset=lane<.5?vec3(0.):vec3(sin(edgeId*2.1+lane),cos(edgeId*1.3+lane),sin(edgeId*.7+lane))*.035;
 vec3 mid=(a+b)*.5+vec3(sin(edgeId*1.7+lane),sin(edgeId*1.7+2.+lane),sin(edgeId*1.7+4.+lane))*.022;
 float along=(position.y+.5)*progress;
 vec3 center=along<.5?mix(a,mid,along*2.):mix(mid,b,(along-.5)*2.);
 float width=lane<.5?mix(radius,min(radius,.022),fine):.0045;
 vec3 p=center+offset+(position.x*u+position.z*v)*width;
 n=normalize(normalMatrix*(normal.x*u+normal.y*axis+normal.z*v));
 fresh=1.-clamp(age/2.,0.,1.);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
}`;
const fragmentShader=`varying float fresh;varying vec3 n;
void main(){float l=.65+.35*abs(dot(normalize(n),normalize(vec3(.3,.8,.5))));
 vec3 col=mix(vec3(.78,.83,.58)*l,vec3(.87,1.,.58),fresh*.8);gl_FragColor=vec4(col,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;

/** Three lanes share a single edge instance. Draw only the first lane at low detail. */
function template(){
 const tube=new THREE.CylinderGeometry(1,1,1,5,2,true),count=tube.attributes.position.count;
 const geo=new THREE.BufferGeometry();
 for(const name of ['position','normal']){const source=tube.attributes[name].array as Float32Array,all=new Float32Array(source.length*3);for(let lane=0;lane<3;lane++)all.set(source,lane*source.length);geo.setAttribute(name,new THREE.BufferAttribute(all,3));}
 const lanes=new Float32Array(count*3);for(let lane=0;lane<3;lane++)lanes.fill(lane,lane*count,(lane+1)*count);geo.setAttribute('lane',new THREE.BufferAttribute(lanes,1));
 const single=tube.index!.count,indices=new Uint16Array(single*3);for(let lane=0;lane<3;lane++)for(let i=0;i<single;i++)indices[lane*single+i]=tube.index!.array[i]+lane*count;
 geo.setIndex(new THREE.BufferAttribute(indices,1));tube.dispose();return {geo,single};
}
type Chunk={geo:THREE.InstancedBufferGeometry;mesh:THREE.Mesh;lineGeo:THREE.InstancedBufferGeometry;lines:THREE.LineSegments;count:number;radiusVersion:number;box:THREE.Box3};
export default function LivingNetwork({o,mode,detail}:{o:Organism;mode:string;detail:FiberDetail}){
 const group=useRef<THREE.Group>(null);
 const data=useMemo(()=>{const base=template(),material=new THREE.ShaderMaterial({vertexShader,fragmentShader,uniforms:{time:{value:0},fine:{value:0}}});return {base,material,chunks:[] as Chunk[],owner:null as Organism|null,epoch:-1,time:0};},[]);
 useEffect(()=>()=>{for(const c of data.chunks){c.geo.dispose();c.lineGeo.dispose();}data.base.geo.dispose();data.material.dispose();},[data]);
 useFrame(({camera},dt)=>{
  if(!group.current)return;
  if(data.owner!==o||data.epoch!==o.geometryRevision){for(const c of data.chunks){group.current.remove(c.mesh,c.lines);c.geo.dispose();c.lineGeo.dispose();}data.chunks=[];data.owner=o;data.epoch=o.geometryRevision;data.time=o.time;}
  data.time+=Math.min(1,dt*18)*(o.time-data.time);data.material.uniforms.time.value=data.time+.1;data.material.uniforms.fine.value=mode==='fibers'?1:0;
  const needed=Math.ceil(o.edges.length/renderChunkSize);
  while(data.chunks.length<needed){
   const geo=new THREE.InstancedBufferGeometry();geo.index=data.base.geo.index;geo.attributes={...data.base.geo.attributes};
   for(const [name,size] of [['a',3],['b',3],['born',1],['radius',1],['edgeId',1]] as const)geo.setAttribute(name,new THREE.InstancedBufferAttribute(new Float32Array(renderChunkSize*size),size).setUsage(THREE.DynamicDrawUsage));
   geo.instanceCount=0;geo.boundingSphere=new THREE.Sphere();const mesh=new THREE.Mesh(geo,data.material);mesh.raycast=()=>{};
   const lineGeo=new THREE.InstancedBufferGeometry();lineGeo.attributes={...geo.attributes};lineGeo.setAttribute('position',new THREE.Float32BufferAttribute([0,-.5,0,0,0,0,0,0,0,0,.5,0],3));lineGeo.setAttribute('normal',new THREE.Float32BufferAttribute([0,0,1,0,0,1,0,0,1,0,0,1],3));lineGeo.setAttribute('lane',new THREE.Float32BufferAttribute([0,0,0,0],1));lineGeo.boundingSphere=geo.boundingSphere;
   const lines=new THREE.LineSegments(lineGeo,data.material);lines.raycast=()=>{};
   group.current.add(mesh,lines);data.chunks.push({geo,mesh,lineGeo,lines,count:0,radiusVersion:-1,box:new THREE.Box3()});
  }
  const p=new THREE.Vector3();
  data.chunks.forEach((chunk,k)=>{
   const start=k*renderChunkSize,count=Math.min(renderChunkSize,o.edges.length-start),attrs=chunk.geo.attributes;
   if(count!==chunk.count){
    for(let i=chunk.count;i<count;i++){const e=o.edges[start+i],a=o.nodes[e.a],b=o.nodes[e.b];attrs.a.setXYZ(i,...a);attrs.b.setXYZ(i,...b);attrs.born.setX(i,e.born);attrs.edgeId.setX(i,start+i);attrs.radius.setX(i,e.radius);chunk.box.expandByPoint(p.set(...a));chunk.box.expandByPoint(p.set(...b));}
    for(const name of ['a','b','born','edgeId','radius']){const attr=attrs[name] as THREE.InstancedBufferAttribute;attr.addUpdateRange(chunk.count*attr.itemSize,(count-chunk.count)*attr.itemSize);attr.needsUpdate=true;}
    chunk.count=count;chunk.geo.instanceCount=count;chunk.lineGeo.instanceCount=count;chunk.box.getBoundingSphere(chunk.geo.boundingSphere!);chunk.geo.boundingSphere!.radius+=.35;
   }
   const version=o.radiusChunks.get(k)||0;
   if(chunk.radiusVersion!==version){for(let i=0;i<count;i++)attrs.radius.setX(i,o.edges[start+i].radius);const attr=attrs.radius as THREE.InstancedBufferAttribute;attr.clearUpdateRanges();attr.addUpdateRange(0,count);attr.needsUpdate=true;chunk.radiusVersion=version;}
   const sphere=chunk.geo.boundingSphere!,distance=Math.max(0,camera.position.distanceTo(sphere.center)-sphere.radius);
   const full=detail==='full'||detail==='auto'&&o.edges.length<80_000&&distance<45;
   const lines=detail==='light'||detail==='auto'&&(distance>60||o.edges.length>250_000&&distance>25);
   chunk.lines.visible=lines;chunk.mesh.visible=!lines;
   chunk.geo.setDrawRange(0,data.base.single*(full?3:1));
  });
 });
 return <group ref={group}/>;
}
