import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildPlan, systemSnapshot, resolvePublicFile, ROOT, TARGETS } from '../lib/core.mjs';
import { startServer } from '../lib/server.mjs';

test('doctor JSON returns read-only evidence', () => {
  const r = spawnSync(process.execPath, ['bin/eden.mjs','doctor','--json'], {cwd:ROOT,encoding:'utf8'});
  assert.equal(r.status, 0, r.stderr);
  const data = JSON.parse(r.stdout);
  assert.equal(data.hardware_verified, false);
  assert.equal(data.can_preview, true);
});
test('all platform tracks are plan only and locked down', () => {
  for(const key of Object.keys(TARGETS)){
    const p=buildPlan(key,systemSnapshot(),new Date('2026-10-30T12:00:00Z'));
    assert.equal(p.mode,'PLAN_ONLY');
    assert.equal(p.gates.system_writes_enabled,false);
    assert.equal(p.gates.disk_changes_enabled,false);
    assert.equal(p.gates.firmware_changes_enabled,false);
    assert.equal(p.gates.router_changes_enabled,false);
    assert.equal(p.gates.remote_execution_enabled,false);
  }
});
test('bad track rejected',()=>assert.throws(()=>buildPlan('99',systemSnapshot())));
test('path traversal blocked',()=>{
  const root=path.join(ROOT,'web');
  for(const route of ['/../LICENSE','/%2e%2e/LICENSE','/%2Fprivate','/%5cprivate','/.git/config','/secrets.key','/bad.exe','/x\\y.html'])
    assert.equal(resolvePublicFile(route,root),null,route);
});
test('root points to expected HTML',()=>{
  assert.equal(path.basename(resolvePublicFile('/',path.join(ROOT,'web'))),'index.html');
});
test('local HTTP serves UI, rejects post and traversal',async()=>{
  const server=await startServer({port:0,root:path.join(ROOT,'web')});
  try{
    const address=server.address(),base=`http://127.0.0.1:${address.port}`;
    const ui=await fetch(base+'/');
    assert.equal(ui.status,200);
    assert.match(await ui.text(),/EDEN-TERM|EDEN-Term/);
    const bad=await fetch(base+'/../../LICENSE');
    assert.notEqual(bad.status,200);
    const post=await fetch(base+'/',{method:'POST'});
    assert.equal(post.status,405);
  }finally{await new Promise(resolve=>server.close(resolve));}
});
test('package has no install lifecycle script and no dependencies',()=>{
  const p=JSON.parse(fs.readFileSync(path.join(ROOT,'package.json'),'utf8'));
  assert.equal(p.scripts.postinstall,undefined);
  assert.equal(p.scripts.preinstall,undefined);
  assert.equal(p.dependencies,undefined);
});
