import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { ROOT } from '../lib/core.mjs';

function npm(args,options={}){
  const cli=process.env.npm_execpath;
  const jsCli=cli && fs.existsSync(cli);
  const command=jsCli?process.execPath:process.platform==='win32'?'npm.cmd':'npm';
  const argv=jsCli?[cli,...args]:args;
  return spawnSync(command,argv,{
    cwd:ROOT,encoding:'utf8',timeout:90000,
    ...options,
  });
}

test('npm tarball can be installed offline and run in an isolated virtual user profile',async()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'eden-npm-tarball-vm-'));
  const old=process.env.EDEN_DATA_HOME;
  try{
    const pack=npm(['pack','--silent','--pack-destination',tmp,'--ignore-scripts']);
    assert.equal(pack.status,0,pack.stderr);
    const tarName=pack.stdout.trim().split(/\r?\n/).pop();
    assert.match(tarName,/\.tgz$/);
    const prefix=path.join(tmp,'sandbox');
    const install=npm(['install','--offline','--ignore-scripts','--no-audit','--no-fund','--prefix',prefix,path.join(tmp,tarName)]);
    assert.equal(install.status,0,install.stderr);
    const root=path.join(prefix,'node_modules','eden-laptop-os');
    for(const name of ['bin/eden.mjs','lib/quickstart.mjs','lib/network-policy.mjs',
      'web/index.html','web/security-architecture.html','web/reboot-plan.html','config/reboot-workflow.v0.1.0.json','lib/reboot-plan.mjs','web/eden-hub.css']){
      assert.ok(fs.statSync(path.join(root,name)).isFile(),name);
    }
    const data=path.join(tmp,'simulated-user-profile');
    const diagnosis=spawnSync(process.execPath,[path.join(root,'bin','eden.mjs'),'doctor','--json'],{
      cwd:root,encoding:'utf8',timeout:12000,env:{...process.env,EDEN_DATA_HOME:data},
    });
    assert.equal(diagnosis.status,0,diagnosis.stderr);
    assert.equal(JSON.parse(diagnosis.stdout).can_preview,true);
    process.env.EDEN_DATA_HOME=data;
    const quick=await import(pathToFileURL(path.join(root,'lib','quickstart.mjs')).href);
    const installed=quick.prepareQuickstart({confirmed:true});
    assert.equal(installed.status,'READY');
    assert.equal(installed.disk_erase_authorized,false);
    const again=quick.prepareQuickstart();
    assert.equal(again.reused_consent,true);
    assert.equal(again.status,'READY');
    assert.ok(fs.statSync(path.join(data,'app','0.8.0-preview.6','web','security-architecture.html')).isFile());
  }finally{
    if(old===undefined)delete process.env.EDEN_DATA_HOME;
    else process.env.EDEN_DATA_HOME=old;
    fs.rmSync(tmp,{recursive:true,force:true});
  }
});
