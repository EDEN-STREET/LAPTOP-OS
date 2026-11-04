import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { ROOT, BUILD, UI_BUNDLE_FILES, installedWebRoot, userDataRoot } from '../lib/core.mjs';
import { quickstartState, prepareQuickstart, quickstartConsentPath } from '../lib/quickstart.mjs';
import { startServer } from '../lib/server.mjs';

function isolated(testBody){
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'eden-independent-audit-'));
  const original=process.env.EDEN_DATA_HOME;
  process.env.EDEN_DATA_HOME=temp;
  const sentinel=path.join(temp,'WINDOWS_USER_DATA_DO_NOT_TOUCH.txt');
  fs.writeFileSync(sentinel,'ORIGINAL USER DATA\n');
  try{
    testBody();
    assert.equal(fs.readFileSync(sentinel,'utf8'),'ORIGINAL USER DATA\n');
  }finally{
    if(original===undefined)delete process.env.EDEN_DATA_HOME;
    else process.env.EDEN_DATA_HOME=original;
    fs.rmSync(temp,{recursive:true,force:true});
  }
}

test('one authoritative UI manifest includes every shipped standalone page',()=>{
  assert.equal(BUILD,'0.8.0-preview.8');
  const actual=fs.readdirSync(path.join(ROOT,'web')).filter(x=>/\.(html|css|js)$/.test(x)).sort();
  assert.deepEqual([...UI_BUNDLE_FILES].sort(),actual);
  assert.equal(new Set(UI_BUNDLE_FILES).size,UI_BUNDLE_FILES.length);
});

test('first-run consent is strictly local and preserves complete byte-identical UI bundle',()=>{
  isolated(()=>{
    assert.equal(prepareQuickstart().status,'NEEDS_LOCAL_UI_CONSENT');
    assert.equal(fs.existsSync(installedWebRoot()),false);
    const started=prepareQuickstart({confirmed:true});
    assert.equal(started.status,'READY');
    assert.equal(started.os_installation_authorized,false);
    assert.equal(started.disk_erase_authorized,false);
    const hash=buf=>crypto.createHash('sha256').update(buf).digest('hex');
    for(const page of UI_BUNDLE_FILES){
      const installed=path.join(installedWebRoot(),page);
      assert.ok(fs.lstatSync(installed).isFile(),page);
      assert.equal(hash(fs.readFileSync(installed)),hash(fs.readFileSync(path.join(ROOT,'web',page))),page);
    }
    const repeat=prepareQuickstart();
    assert.equal(repeat.reused_consent,true);
    assert.equal(repeat.local_ui_present,true);
  });
});

test('missing secondary UI page invalidates installation; no silent repair or overwrite',()=>{
  isolated(()=>{
    prepareQuickstart({confirmed:true});
    const missing=path.join(installedWebRoot(),'testlab.html');
    fs.unlinkSync(missing);
    assert.equal(quickstartState().local_ui_present,false);
    assert.throws(()=>prepareQuickstart(),/fehlen/);
    assert.equal(fs.existsSync(missing),false);
  });
});

test('modified previously installed UI is detected instead of trusted or overwritten',()=>{
  isolated(()=>{
    prepareQuickstart({confirmed:true});
    const page=path.join(installedWebRoot(),'index.html');
    fs.appendFileSync(page,'\n<!-- tampered -->\n');
    const altered=fs.readFileSync(page);
    assert.equal(quickstartState().local_ui_present,false);
    assert.throws(()=>prepareQuickstart(),/fehlen/);
    assert.deepEqual(fs.readFileSync(page),altered);
  });
});

test('elevated permission flags inserted into user-owned consent are never accepted',()=>{
  isolated(()=>{
    prepareQuickstart({confirmed:true});
    const receipt=quickstartConsentPath();
    for(const key of ['disk_erase_authorized','os_installation_authorized',
      'firmware_changes_authorized','tor_enforcement_verified']){
      const record=JSON.parse(fs.readFileSync(receipt,'utf8'));
      record[key]=true;
      fs.writeFileSync(receipt,JSON.stringify(record));
      assert.throws(()=>quickstartState(),/Zustimmungsnachweis/);
      record[key]=false;
      fs.writeFileSync(receipt,JSON.stringify(record));
    }
    assert.equal(quickstartState().consent_recorded,true);
  });
});

test('all bundled internal HTML links resolve to a shipped file, no hidden missing navigation',()=>{
  const webRoot=path.join(ROOT,'web');
  const problems=[];
  for(const file of UI_BUNDLE_FILES.filter(x=>x.endsWith('.html'))){
    const text=fs.readFileSync(path.join(webRoot,file),'utf8');
    for(const match of text.matchAll(/\b(?:href|src)\s*=\s*["']([^"']+)["']/g)){
      const url=match[1];
      if(/^(?:https?:|mailto:|data:|javascript:|#|\/\/)/i.test(url))continue;
      const target=url.split(/[?#]/)[0];
      if(!target)continue;
      const full=path.resolve(path.dirname(path.join(webRoot,file)),target);
      if(!full.startsWith(webRoot+path.sep)||!fs.existsSync(full))problems.push(file+' -> '+url);
    }
  }
  assert.deepEqual(problems,[]);
});

test('actual loopback server does not expose private files, permit writes or weaken security headers',async()=>{
  const server=await startServer({port:0,root:path.join(ROOT,'web')});
  try{
    assert.equal(server.address().address,'127.0.0.1');
    const base='http://127.0.0.1:'+server.address().port;
    for(const name of UI_BUNDLE_FILES.filter(x=>x.endsWith('.html'))){
      const response=await fetch(base+'/'+name);
      assert.equal(response.status,200,name);
      assert.match(response.headers.get('content-type'),/text\/html/);
      assert.ok((await response.text()).length>150,name);
    }
    const head=await fetch(base+'/index.html',{method:'HEAD'});
    assert.equal(head.status,200);
    assert.equal(await head.text(),'');
    for(const url of ['/.git/config','/bin/eden.mjs','/lib/core.mjs','/%2e%2e/%2e%2e/etc/passwd']){
      const r=await fetch(base+url);
      assert.notEqual(r.status,200,url);
    }
    assert.equal((await fetch(base+'/index.html',{method:'POST',body:'x'})).status,405);
    const doc=await fetch(base+'/index.html');
    assert.equal(doc.headers.get('x-content-type-options'),'nosniff');
    assert.match(doc.headers.get('content-security-policy'),/connect-src 'none'/);
    assert.equal(doc.headers.get('referrer-policy'),'no-referrer');
  }finally{await new Promise(resolve=>server.close(resolve));}
});
