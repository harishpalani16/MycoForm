import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(p:string)=>readFileSync(new URL(p,import.meta.url),'utf8');
const SOURCES=['../OrganicApp.tsx','../TransformPanel.tsx','../ExportDialog.tsx',
 './LeftRail.tsx','./SceneHud.tsx','./RightRail.tsx','./AppFooter.tsx'];
const STYLES=['../tokens.css','../app.css'];

/**
 * String literals that could reach the DOM as class names. Skips literals in
 * comparison position (`mode==='living'?…`) — those are state values, not
 * classes — and walks template literals so the static chunk of
 * `` `tool ${sel?'selected':''}` `` yields both "tool" and "selected".
 */
function literalsIn(expr:string):string[]{
 const out:string[]=[];
 for(let i=0;i<expr.length;i++){
  const c=expr[i];
  if(c==="'"||c==='"'){
   const end=expr.indexOf(c,i+1);if(end<0)break;
   if(!/[=!]=+$/.test(expr.slice(0,i).trimEnd()))out.push(expr.slice(i+1,end));
   i=end;
  }else if(c==='`'){
   let j=i+1,stat='';
   while(j<expr.length&&expr[j]!=='`'){
    if(expr[j]==='$'&&expr[j+1]==='{'){
     let depth=1,k=j+2;
     while(k<expr.length&&depth){depth+=expr[k]==='{'?1:expr[k]==='}'?-1:0;k++}
     out.push(...literalsIn(expr.slice(j+2,k-1)),stat);stat='';j=k;
    }else stat+=expr[j++];
   }
   out.push(stat);i=j;
  }
 }
 return out;
}

/** Every whitespace-separated token appearing in any className expression. */
function usedClasses(){
 const out=new Set<string>();
 const add=(lit:string)=>{
  for(const c of lit.split(/\s+/))if(c&&/^[a-zA-Z][\w-]*$/.test(c))out.add(c);
 };
 for(const f of SOURCES){
  const src=read(f);
  for(let i=src.indexOf('className=');i>=0;i=src.indexOf('className=',i+1)){
   let j=i+'className='.length;
   if(src[j]==='"'){add(src.slice(j+1,src.indexOf('"',j+1)));continue}
   if(src[j]!=='{')continue;
   let depth=0;const start=j;
   for(;j<src.length;j++){
    if(src[j]==='{')depth++;
    else if(src[j]==='}'&&--depth===0){j++;break}
   }
   for(const lit of literalsIn(src.slice(start+1,j-1)))add(lit);
  }
 }
 return out;
}

/** Class names appearing in selector position, ignoring declaration bodies. */
function styledClasses(){
 const out=new Set<string>();
 for(const f of STYLES){
  const css=read(f).replace(/\/\*[\s\S]*?\*\//g,'');
  let buf='';
  for(let i=0;i<css.length;i++){
   const c=css[i];
   if(c!=='{'){buf+=c;continue}
   if(buf.trimStart().startsWith('@')){buf='';continue}   // at-rule prelude: descend
   for(const [,name] of buf.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g))out.add(name);
   buf='';
   // Skip the declaration body, including any nested braces.
   let depth=1;
   while(++i<css.length&&depth)depth+=css[i]==='{'?1:css[i]==='}'?-1:0;
  }
 }
 return out;
}

test('every class used in the markup is styled',()=>{
 const used=usedClasses(),styled=styledClasses();
 const missing=[...used].filter(c=>!styled.has(c)).sort();
 assert.deepEqual(missing,[],`used in JSX but absent from CSS: ${missing.join(', ')}`);
});

test('every class in the stylesheets is used by the markup',()=>{
 const used=usedClasses(),styled=styledClasses();
 const dead=[...styled].filter(c=>!used.has(c)).sort();
 assert.deepEqual(dead,[],`styled but never rendered (dead CSS): ${dead.join(', ')}`);
});

test('the extractor actually found the markup',()=>{
 // Guards against a silently-empty scan making both tests above vacuous.
 const used=usedClasses();
 assert.ok(used.size>40,`expected to find many classes, found ${used.size}`);
 for(const anchor of ['app','hud','transport','export-dialog','transform-panel'])
  assert.ok(used.has(anchor),`extractor missed the "${anchor}" class`);
});
