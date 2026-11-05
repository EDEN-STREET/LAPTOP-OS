#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const load=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const cfg=load(path.join(root,'config/tool.json'));
export function validate(w){
 const errors=[];
 if(!w || typeof w!=='object' || Array.isArray(w))return {valid:false,errors:['object required']};
 if(w.schemaVersion!=='1.0.0')errors.push('unsupported schemaVersion');
 if(typeof w.id!=='string'||!/^[a-z0-9][a-z0-9._-]{2,79}$/.test(w.id))errors.push('invalid id');
 if(typeof w.title!=='string'||!w.title.trim())errors.push('invalid title');
 if(typeof w.purpose!=='string'||w.purpose.trim().length<8)errors.push('purpose missing');
 if(!Array.isArray(w.steps)||w.steps.length<1||w.steps.length>cfg.maxSteps)errors.push('invalid steps');
 const used=new Set();
 for(const [i,s] of (Array.isArray(w.steps)?w.steps:[]).entries()){
  const skill=cfg.skills?.[s?.skillId];
  if(!skill||!cfg.allowedClasses.includes(skill.class)||!skill.source)errors.push('step '+i+': unregistered/unsafe skill');
  if(!s?.skillId||used.has(s.skillId))errors.push('step '+i+': duplicate id');
  used.add(s?.skillId);
  if(!s?.parameters||typeof s.parameters!=='object'||Array.isArray(s.parameters)||Object.keys(s.parameters).length)errors.push('step '+i+': unknown parameters');
  if(!s||Object.keys(s).some(k=>!['skillId','parameters'].includes(k)))errors.push('step '+i+': extra fields');
 }
 if(Object.keys(w).some(k=>!['schemaVersion','id','title','purpose','steps'].includes(k)))errors.push('unexpected workflow field');
 return {valid:!errors.length,errors};
}
const [cmd,...args]=process.argv.slice(2);
if(cmd==='validate'){
 try{const out=validate(load(path.resolve(args[0]||'')));console.log(JSON.stringify(out,null,2));if(!out.valid)process.exitCode=2;}catch(e){console.error(e.message);process.exitCode=2;}
}else if(cmd==='status'){
 console.log(JSON.stringify({toolVersion:cfg.version,builder:'web/builder.html',mode:cfg.mode,hardwareVerified:false,historical031CodeRecovered:false},null,2));
}else if(cmd==='goal'){
 console.log(fs.readFileSync(path.join(root,'docs/GOAL.md'),'utf8'));
}else{
 console.log('EDEN Builder Kit: status | validate <workflow.json> | goal. No execution or device writes.');
}
