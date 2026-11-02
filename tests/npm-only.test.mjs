import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, BUILD, installUserUI, safePlanPath, savePlanOnce, installedWebRoot, resolvePublicFile } from '../lib/core.mjs';
import { startServer } from '../lib/server.mjs';

test('npm-only CLI exposes a bin, supports Node 22+, has lockfile, no lifecycle hooks',()=>{
  const pkg=JSON.parse(fs.readFileSync(path.join(ROOT,'package.json'),'utf8'));
  assert.equal(pkg.bin.eden,'./bin/eden.mjs');
  assert.equal(pkg.engines.node,'>=22');
  assert.equal(pkg.scripts.postinstall,undefined);
  assert.equal(pkg.scripts.preinstall,undefined);
  assert.equal(pkg.dependencies,undefined);
  assert.equal(pkg.private,true);
  const lock=JSON.parse(fs.readFileSync(path.join(ROOT,'npm-shrinkwrap.json'),'utf8'));
  assert.equal(lock.packages[''].version,pkg.version);
  assert.equal(BUILD,pkg.version);
});

test('every NOUZ menu item resolves to an actual public page, no private archive bundled',()=>{
  const root=path.join(ROOT,'web');
  const home=fs.readFileSync(path.join(root,'index.html'),'utf8');
  for(const file of ['setup.html','handbuch.html','builder.html','toolbox.html','grimoire.html','testlab.html','quellen.html']) {
    assert.ok(home.includes(`href="${file}"`),`menu missing ${file}`);
    assert.ok(fs.statSync(path.join(root,file)).size>1000,`page missing ${file}`);
  }
  for(const page of fs.readdirSync(root)) {
    const contents=fs.readFileSync(path.join(root,page),'utf8');
    for(const href of contents.matchAll(/\bhref="([^"#?]+)"/g)){
      const url=href[1];
      if(url.startsWith('http:')||url.startsWith('https:')||url.startsWith('mailto:'))continue;
      assert.ok(!url.startsWith('/'),`absolute path in ${page}: ${url}`);
      const target=path.resolve(root,decodeURIComponent(url));
      assert.ok(target.startsWith(root+path.sep),`escape href in ${page}: ${url}`);
      assert.ok(fs.existsSync(target),`broken link in ${page}: ${url}`);
    }
  }
  assert.equal(fs.existsSync(path.join(ROOT,'offline')),false);
});

test('explicit user app install creates only new version, never overwrites',()=>{
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'eden-npm-profile-'));
  const old=process.env.EDEN_DATA_HOME;
  try{
    process.env.EDEN_DATA_HOME=profile;
    const dir=installUserUI();
    assert.equal(dir,installedWebRoot());
    assert.ok(fs.existsSync(path.join(dir,'setup.html')));
    const before=fs.readFileSync(path.join(dir,'index.html'));
    assert.throws(()=>installUserUI(),err=>err.code==='EEXIST');
    assert.deepEqual(fs.readFileSync(path.join(dir,'index.html')),before);
    const p={mode:'PLAN_ONLY',selected_target:'windows-ui'};
    const saved=savePlanOnce(p);
    assert.equal(saved,safePlanPath());
    assert.deepEqual(JSON.parse(fs.readFileSync(saved,'utf8')),p);
    assert.throws(()=>savePlanOnce(p),err=>err.code==='EEXIST');
  }finally{
    if(old===undefined)delete process.env.EDEN_DATA_HOME;else process.env.EDEN_DATA_HOME=old;
    fs.rmSync(profile,{recursive:true,force:true});
  }
});

test('npm-only command diagnosis runs without Git or hardware changes',()=>{
  const proc=spawnSync(process.execPath,['bin/eden.mjs','doctor','--json'],{cwd:ROOT,encoding:'utf8',timeout:10000,env:{...process.env,PATH:''}});
  assert.equal(proc.status,0,proc.stderr);
  const parsed=JSON.parse(proc.stdout);
  assert.equal(parsed.can_preview,true);
  assert.equal(parsed.os_installed,false);
  assert.equal(parsed.hardware_verified,false);
});

test('all published pages respond locally, unknown route and write method denied',async()=>{
  const server=await startServer({port:0,root:path.join(ROOT,'web')});
  try{
    const addr=`http://127.0.0.1:${server.address().port}`;
    for(const page of ['index.html','setup.html','handbuch.html','builder.html','toolbox.html','grimoire.html','testlab.html','quellen.html']){
      const res=await fetch(`${addr}/${page}`);
      assert.equal(res.status,200,page);
      assert.match(res.headers.get('content-type'),/text\/html/);
    }
    const none=await fetch(`${addr}/doesnotexist.html`);assert.equal(none.status,404);
    const post=await fetch(`${addr}/`,{method:'POST'});assert.equal(post.status,405);
    assert.equal((await fetch(`${addr}/`)).headers.get('referrer-policy'),'no-referrer');
  }finally{await new Promise(resolve=>server.close(resolve));}
});
