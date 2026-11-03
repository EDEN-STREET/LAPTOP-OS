import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ROOT, installUserUI, installedWebRoot } from '../lib/core.mjs';
import { startServer } from '../lib/server.mjs';
const web=path.join(ROOT,'web');

test('main navigation includes Wiki, Handbook and Kanban',()=>{
 const html=fs.readFileSync(path.join(web,'index.html'),'utf8');
 for(const page of ['wiki.html','handbuch.html','projects.html']) assert.match(html,new RegExp('href="'+page+'"'));
});
test('wiki main section includes sources and search',()=>{
 const html=fs.readFileSync(path.join(web,'wiki.html'),'utf8');
 for(const word of ['wikiQuery','wikiTopic','Policy Broker','Vertrauenszonen'])assert.ok(html.includes(word),word);
 assert.ok(html.includes('EDEN-Term'),'EDEN-Term');
});
test('kanban has separate project tracks and four status columns',()=>{
 const js=fs.readFileSync(path.join(web,'projects.js'),'utf8');
 for(const word of ['Wiki / Wissenshub','EDEN Handbuch','LAPTOP-OS','ROUTER','PIXEL','backlog','doing','review','done','localStorage','eden.kanban/1'])assert.ok(js.includes(word),word);
 assert.ok(!js.includes('eval('));assert.ok(!js.includes('fetch('));
});
test('new pages load over isolated local HTTP server',async()=>{
 const server=await startServer({port:0,root:web});
 try{const url=`http://127.0.0.1:${server.address().port}`;for(const page of ['wiki.html','handbuch.html','projects.html','eden-hub.css','projects.js']){const r=await fetch(`${url}/${page}`);assert.equal(r.status,200,page);assert.ok((await r.text()).length>250,page)}}finally{await new Promise(r=>server.close(r))}
});
test('installUserUI copies Wiki, Kanban and shared CSS into user profile app directory',()=>{
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'eden-wiki-install-'));
 const old=process.env.EDEN_DATA_HOME;
 try{
  process.env.EDEN_DATA_HOME=profile;
  const dir=installUserUI();
  assert.equal(dir,installedWebRoot());
  for(const f of ['wiki.html','projects.html','projects.js','eden-hub.css']){
   assert.ok(fs.existsSync(path.join(dir,f)),`missing installed file: ${f}`);
  }
 }finally{
  if(old===undefined)delete process.env.EDEN_DATA_HOME;else process.env.EDEN_DATA_HOME=old;
  fs.rmSync(profile,{recursive:true,force:true});
 }
});
