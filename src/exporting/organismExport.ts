import * as THREE from 'three';
import {OBJExporter} from 'three/examples/jsm/exporters/OBJExporter.js';
import {STLExporter} from 'three/examples/jsm/exporters/STLExporter.js';
import {Organism} from '../simulation/organism';

export type ExportFormat='experiment'|'obj-lines'|'obj-mesh'|'stl';
export type ExportOptions={format:ExportFormat;units:'m'|'mm';detail:'low'|'high'};
export type ExportFile={name:string;mime:string;data:string|ArrayBuffer};

/** Export only live organism strands, never the ground, gizmos or environmental fields. */
export function createStrandMesh(o:Organism,units:'m'|'mm',detail:'low'|'high'){
 const positions:number[]=[],indices:number[]=[];const radial=detail==='high'?10:6,scale=units==='mm'?1000:1;
 for(let edgeIndex=0;edgeIndex<o.edges.length;edgeIndex++){
  const edge=o.edges[edgeIndex];if(!edge.alive)continue;
  const a=new THREE.Vector3(...o.nodes[edge.a]),b=new THREE.Vector3(...o.nodes[edge.b]);if(a.distanceToSquared(b)<1e-12)continue;
  // Same bend as the main strand in the live renderer, at full extension.
  const mid=a.clone().add(b).multiplyScalar(.5).add(new THREE.Vector3(...[0,1,2].map(i=>Math.sin(edgeIndex*1.7+i*2)*.022) as [number,number,number]));
  const tangent=b.clone().sub(a).normalize();
  const u=new THREE.Vector3().crossVectors(tangent,Math.abs(tangent.y)>.9?new THREE.Vector3(1,0,0):new THREE.Vector3(0,1,0)).normalize();
  const v=new THREE.Vector3().crossVectors(tangent,u);const offset=positions.length/3;
  for(const center of [a,mid,b])for(let j=0;j<radial;j++){const theta=j/radial*Math.PI*2;const p=center.clone().addScaledVector(u,Math.cos(theta)*edge.radius).addScaledVector(v,Math.sin(theta)*edge.radius).multiplyScalar(scale);positions.push(p.x,p.y,p.z);}
  for(let ring=0;ring<2;ring++)for(let j=0;j<radial;j++){const next=(j+1)%radial,p=offset+ring*radial+j,q=offset+ring*radial+next;indices.push(p,q,p+radial,q,q+radial,p+radial);}
  // Capped individual strands. Intersections are not boolean-unioned.
  const capA=positions.length/3;positions.push(a.x*scale,a.y*scale,a.z*scale,b.x*scale,b.y*scale,b.z*scale);
  for(let j=0;j<radial;j++){const next=(j+1)%radial;indices.push(capA,offset+next,offset+j,capA+1,offset+2*radial+j,offset+2*radial+next);}
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
 const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:'#bcc79e'}));mesh.name='Mycoform_Living_Strands';mesh.updateMatrixWorld(true);return mesh;
}

export function exportOrganism(o:Organism,options:ExportOptions):ExportFile{
 const base=`mycoform-${o.seed}-${Math.floor(o.time)}cycles`;
 if(options.format==='experiment')return {name:`${base}.json`,mime:'application/json',data:o.save()};
 if(!o.edges.some(e=>e.alive))throw Error('Grow some strands before exporting geometry. Use Experiment JSON to save a spore-only setup.');
 const scale=options.units==='mm'?1000:1;
 if(options.format==='obj-lines'){
  const text=[`# MYCOFORM centerlines | units: ${options.units} | Y-up`,'o Mycoform_Centerlines'];let vertex=1;
  o.edges.forEach((e,i)=>{if(!e.alive)return;const a=o.nodes[e.a],b=o.nodes[e.b],mid=a.map((x,axis)=>(x+b[axis])/2+Math.sin(i*1.7+axis*2)*.022);for(const p of [a,mid,b])text.push(`v ${p.map(x=>(x*scale).toFixed(6)).join(' ')}`);text.push(`l ${vertex} ${vertex+1} ${vertex+2}`);vertex+=3;});
  return {name:`${base}-centerlines-${options.units}.obj`,mime:'text/plain',data:text.join('\n')+'\n'};
 }
 const mesh=createStrandMesh(o,options.units,options.detail);
 try {
  if(options.format==='obj-mesh')return {name:`${base}-mesh-${options.units}.obj`,mime:'text/plain',data:`# MYCOFORM mesh | units: ${options.units} | Y-up\n`+new OBJExporter().parse(mesh)};
  const result=new STLExporter().parse(mesh,{binary:true});
  return {name:`${base}-mesh-${options.units}.stl`,mime:'model/stl',data:result.buffer.slice(result.byteOffset,result.byteOffset+result.byteLength) as ArrayBuffer};
 } finally {mesh.geometry.dispose();mesh.material.dispose();}
}
