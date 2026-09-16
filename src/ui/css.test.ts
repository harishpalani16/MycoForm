import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(p:string)=>readFileSync(new URL(p,import.meta.url),'utf8');
const tokens=read('../tokens.css'),app=read('../app.css');
const strip=(css:string)=>css.replace(/\/\*[\s\S]*?\*\//g,'');

// --- colour maths -----------------------------------------------------------
type RGB={r:number;g:number;b:number;a:number};
function parse(hex:string):RGB{
 const h=hex.slice(1);
 const wide=h.length>4;
 const n=wide?2:1,f=(i:number)=>{const s=h.substr(i*n,n);return parseInt(wide?s:s+s,16)/255};
 return {r:f(0),g:f(1),b:f(2),a:h.length===4||h.length===8?f(3):1};
}
const channel=(c:number)=>c<=.03928?c/12.92:((c+.055)/1.055)**2.4;
const luminance=(c:RGB)=>.2126*channel(c.r)+.7152*channel(c.g)+.0722*channel(c.b);
// Composite a translucent colour over an opaque backdrop.
const over=(fg:RGB,bg:RGB):RGB=>({r:fg.r*fg.a+bg.r*(1-fg.a),g:fg.g*fg.a+bg.g*(1-fg.a),
 b:fg.b*fg.a+bg.b*(1-fg.a),a:1});
function ratio(fg:RGB,bg:RGB){
 const a=luminance(over(fg,bg)),b=luminance(bg);
 return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
}

// --- token table ------------------------------------------------------------
const declared=new Map<string,string>();
for(const [,name,value] of strip(tokens).matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g))
 declared.set(name,value);
const tok=(name:string)=>{
 const v=declared.get(name);
 assert.ok(v,`token ${name} is not declared in tokens.css`);
 return parse(v!);
};

const SURFACES=['--surface-0','--surface-1','--surface-2','--surface-3'];
const TEXT=['--text-1','--text-2','--text-3'];

test('app.css contains no raw hex literals',()=>{
 const found=[...strip(app).matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map(m=>m[0]);
 assert.deepEqual(found,[],`app.css must use tokens, found: ${found.join(', ')}`);
});

test('tokens.css declares every hex inside :root',()=>{
 // Cut the :root block out, then nothing colour-shaped may remain.
 const body=strip(tokens);
 const start=body.indexOf(':root{'),end=body.indexOf('\n}',start);
 assert.ok(start>=0&&end>start,'could not locate the :root block');
 const outside=body.slice(0,start)+body.slice(end);
 const found=[...outside.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map(m=>m[0]);
 assert.deepEqual(found,[],`hex declared outside :root: ${found.join(', ')}`);
});

test('no font-size is expressed in px',()=>{
 for(const [name,css] of [['tokens.css',tokens],['app.css',app]] as const){
  const found=[...strip(css).matchAll(/font-size\s*:\s*[^;}]*\bpx\b/g)].map(m=>m[0]);
  assert.deepEqual(found,[],`${name} must use the rem scale, found: ${found.join(', ')}`);
 }
});

test('every text token clears 4.5:1 on every surface',()=>{
 for(const t of [...TEXT,'--accent'])for(const s of SURFACES){
  const r=ratio(tok(t),tok(s));
  assert.ok(r>=4.5,`${t} on ${s} is ${r.toFixed(2)}:1, below the 4.5:1 floor`);
 }
});

test('control boundaries clear 3:1 on every surface',()=>{
 for(const c of ['--border-control','--focus'])for(const s of SURFACES){
  const r=ratio(tok(c),tok(s));
  assert.ok(r>=3,`${c} on ${s} is ${r.toFixed(2)}:1, below the 3:1 floor`);
 }
});

test('text on the accent fill clears 4.5:1',()=>{
 const r=ratio(tok('--accent-ink'),tok('--accent'));
 assert.ok(r>=4.5,`--accent-ink on --accent is ${r.toFixed(2)}:1`);
});

test('danger text clears 4.5:1 where it is used',()=>{
 for(const s of ['--surface-2','--surface-3']){
  const r=ratio(tok('--danger'),tok(s));
  assert.ok(r>=4.5,`--danger on ${s} is ${r.toFixed(2)}:1`);
 }
});

test('translucent surfaces stay close enough to their base to inherit its contrast',()=>{
 const glass=tok('--surface-glass');
 assert.ok(glass.a>=.92,`--surface-glass alpha is ${glass.a.toFixed(2)}, below .92`);
 for(const t of TEXT){
  const r=ratio(tok(t),over(glass,tok('--surface-1')));
  assert.ok(r>=4.5,`${t} on --surface-glass over --surface-1 is ${r.toFixed(2)}:1`);
 }
});

test('the three.js clear colour matches --surface-1',()=>{
 const world=read('../rendering/OrganicWorld.tsx');
 const m=world.match(/<color attach="background" args=\{\['(#[0-9a-fA-F]{6})'\]\}/);
 assert.ok(m,'could not find the canvas background colour in OrganicWorld.tsx');
 assert.equal(m![1].toLowerCase(),declared.get('--surface-1')!.toLowerCase(),
  'the canvas clear colour and --surface-1 must match, or the page shows a colour step before WebGL initialises');
});

test('no growth-driven stage rule resizes the grid',()=>{
 // A [data-stage] rule that changes column tracks resizes <main>, which fires
 // the r3f ResizeObserver and refits the camera mid-play.
 for(const block of strip(app).split('}')){
  if(!/\[data-stage[^\]]*\]/.test(block))continue;
  assert.ok(!/grid-template-columns|--rail-[lr]\s*:/.test(block),
   `stage rules must not resize tracks: ${block.trim().slice(0,120)}`);
 }
});
