import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const json=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
export function plan(workflow,agents,config,exists=(p)=>fs.existsSync(path.join(root,p))){
 const errors=[],steps=[],seen=new Set();
 if(workflow?.schemaVersion!=='1.0.0'||!Array.isArray(workflow?.steps)||!workflow.steps.length||workflow.steps.length>config.maxSteps)errors.push('invalid workflow');
 if(agents?.mode!=='plan_only'||agents.mayChangeDevices||agents.mayPublishPrivate||agents.mayMergePR)errors.push('unsafe agent mode');
 for(const [idx,step] of (workflow?.steps||[]).entries()){
   const source=config.skills?.[step?.skillId];
   if(!source||!config.allowedClasses.includes(source.class))errors.push('unknown skill at '+idx);
   if(source && !exists(source.source))errors.push('missing skill file at '+idx);
   if(seen.has(step?.skillId))errors.push('duplicate skill '+idx);
   seen.add(step?.skillId);
   if(!step?.parameters||typeof step.parameters!=='object'||Array.isArray(step.parameters)||Object.keys(step.parameters).length)errors.push('unexpected parameters at '+idx);
   if(Object.keys(step||{}).some(k=>!['skillId','parameters'].includes(k)))errors.push('unknown step field');
   const owners=Object.entries(agents.agents||{}).filter(([,a])=>a.skillIds?.includes(step?.skillId));
   if(owners.length!==1)errors.push('invalid agent owner at '+idx);
   steps.push({index:idx+1,skillId:step.skillId,agent:owners.length===1?owners[0][0]:null,execution:'NOT_EXECUTED'});
 }
 if(Object.keys(workflow||{}).some(k=>!['schemaVersion','id','title','purpose','steps'].includes(k)))errors.push('unknown workflow field');
 return {valid:errors.length===0,mode:'plan_only',steps,errors};
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=plan(json('workflows/full-recovery.json'),json('agents/registry.json'),json('config/tool.json'));
 console.log(JSON.stringify(result,null,2));if(!result.valid)process.exitCode=2;
}
