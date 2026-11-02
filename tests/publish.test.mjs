import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { ROOT } from '../lib/core.mjs';
import { BRANCH, REPO, FILES, getPublicPayload } from '../lib/github-publisher.mjs';

test('GitHub publisher has a fixed allowlist and no private/source archives',()=>{
 const entries=getPublicPayload();
 assert.equal(entries.length,FILES.length);
 assert.ok(entries.length>=20);
 assert.match(BRANCH,/^feature\//);
 assert.equal(REPO,'EDEN-STREET/LAPTOP-OS');
 assert.ok(entries.every(f=>f.type==='blob' && f.mode==='100644' && f.bytes<1024*1024));
 assert.ok(entries.every(f=>!/(\.zip|\.tgz|\.pdf|\.env|secret|token)/i.test(f.path)));
 assert.ok(entries.some(f=>f.path==='lib/github-publisher.mjs'));
 assert.ok(entries.some(f=>f.path==='docs/PLAYWRIGHT_UND_RELEASE.md'));
 assert.ok(entries.every(f=>f.sha256.length===64));
});

test('GitHub publisher rejects symlinked files',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'eden-publish-'));
 try{
  for(const f of FILES){const p=path.join(temp,f);fs.mkdirSync(path.dirname(p),{recursive:true});fs.copyFileSync(path.join(ROOT,f),p);}
  const target=path.join(temp,FILES[0]);fs.unlinkSync(target);fs.symlinkSync(path.join(ROOT,FILES[0]),target);
  assert.throws(()=>getPublicPayload(temp),/abgelehnt/);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

test('GitHub publisher dry run does not need gh or issue writes',()=>{
 const r=spawnSync(process.execPath,['bin/eden.mjs','publish-github','--dry-run'],{cwd:ROOT,encoding:'utf8',timeout:10000,env:{...process.env,PATH:''}});
 assert.equal(r.status,0,r.stderr);
 assert.match(r.stdout,/DRY RUN/);
 assert.match(r.stdout,/GitHub-Publisher/);
});

test('GitHub publisher cannot upload unattended without TTY',()=>{
 const r=spawnSync(process.execPath,['bin/eden.mjs','publish-github'],{cwd:ROOT,encoding:'utf8',timeout:10000,env:{...process.env,PATH:''}});
 assert.equal(r.status,1);
 assert.match(r.stderr,/interaktive/);
});
