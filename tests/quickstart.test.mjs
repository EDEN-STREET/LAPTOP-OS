import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, BUILD, safePlanPath, installedWebRoot, userDataRoot } from '../lib/core.mjs';
import { CONSENT_SCOPE, quickstartConsentPath, quickstartState, prepareQuickstart } from '../lib/quickstart.mjs';

function isolatedTest(fn) {
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'eden-virtual-laptop-'));
  const old=process.env.EDEN_DATA_HOME;
  try {
    process.env.EDEN_DATA_HOME=temp;
    const virtualWindowsDisk=path.join(temp,'VIRTUAL_WINDOWS_DISK_SENTINEL.txt');
    fs.writeFileSync(virtualWindowsDisk,'DO NOT MODIFY VIRTUAL WINDOWS\n');
    fn({temp, virtualWindowsDisk});
    assert.equal(fs.readFileSync(virtualWindowsDisk,'utf8'),'DO NOT MODIFY VIRTUAL WINDOWS\n');
  } finally {
    if(old===undefined) delete process.env.EDEN_DATA_HOME;
    else process.env.EDEN_DATA_HOME=old;
    fs.rmSync(temp,{recursive:true,force:true});
  }
}

test('npm start and npm go use one-consent quickstart on preview.7',()=>{
  const pkg=JSON.parse(fs.readFileSync(path.join(ROOT,'package.json'),'utf8'));
  const lock=JSON.parse(fs.readFileSync(path.join(ROOT,'npm-shrinkwrap.json'),'utf8'));
  assert.equal(pkg.version,'0.8.0-preview.7');
  assert.equal(pkg.version,lock.packages[''].version);
  assert.equal(pkg.version,BUILD);
  assert.equal(pkg.scripts.start,'node bin/eden.mjs quickstart');
  assert.equal(pkg.scripts.go,'node bin/eden.mjs quickstart');
  assert.equal(pkg.scripts.launch,'node bin/eden.mjs launch');
  assert.equal(pkg.scripts.preinstall,undefined);
  assert.equal(pkg.scripts.postinstall,undefined);
  assert.equal(pkg.dependencies,undefined);
});

test('virtual laptop remains unchanged until one explicit local-app approval',()=>{
  isolatedTest(({temp})=>{
    const prior=quickstartState();
    assert.equal(prior.consent_recorded,false);
    assert.equal(prior.local_ui_present,false);
    const denied=prepareQuickstart();
    assert.equal(denied.status,'NEEDS_LOCAL_UI_CONSENT');
    assert.equal(fs.existsSync(installedWebRoot()),false);
    assert.equal(fs.existsSync(quickstartConsentPath()),false);
    assert.equal(fs.existsSync(safePlanPath()),false);
    assert.deepEqual(fs.readdirSync(temp),['VIRTUAL_WINDOWS_DISK_SENTINEL.txt']);
  });
});

test('one explicit approval installs only bundled UI and non-destructive Qubes planning state',()=>{
  isolatedTest(()=>{
    const result=prepareQuickstart({confirmed:true});
    assert.equal(result.status,'READY');
    assert.equal(result.consent_recorded,true);
    assert.equal(result.local_ui_present,true);
    assert.equal(result.disk_erase_authorized,false);
    assert.equal(result.os_installation_authorized,false);
    assert.equal(result.firmware_changes_authorized,false);
    assert.equal(result.tor_enforcement_verified,false);
    for(const file of ['index.html','setup.html','wiki.html','projects.js','eden-hub.css','reboot-plan.html','hardware-readiness.html']) {
      assert.ok(fs.statSync(path.join(installedWebRoot(),file)).isFile());
    }
    const plan=JSON.parse(fs.readFileSync(safePlanPath(),'utf8'));
    assert.equal(plan.mode,'PLAN_ONLY');
    assert.equal(plan.selected_target,'qubes-plan');
    assert.equal(plan.gates.system_writes_enabled,false);
    assert.equal(plan.gates.disk_changes_enabled,false);
    assert.equal(plan.gates.firmware_changes_enabled,false);
    const receipt=JSON.parse(fs.readFileSync(quickstartConsentPath(),'utf8'));
    assert.equal(receipt.scope,CONSENT_SCOPE);
    assert.equal(receipt.approved,true);
    assert.equal(receipt.disk_erase_authorized,false);
  });
});

test('repeated npm quickstart is idempotent and never overwrites user files',()=>{
  isolatedTest(()=>{
    const a=prepareQuickstart({confirmed:true});
    const beforeReceipt=fs.readFileSync(quickstartConsentPath());
    const beforePlan=fs.readFileSync(safePlanPath());
    const dest=path.join(installedWebRoot(),'index.html');
    const beforeUi=fs.readFileSync(dest);
    const b=prepareQuickstart();
    assert.equal(a.reused_consent,false);
    assert.equal(b.reused_consent,true);
    assert.equal(b.status,'READY');
    assert.deepEqual(fs.readFileSync(quickstartConsentPath()),beforeReceipt);
    assert.deepEqual(fs.readFileSync(safePlanPath()),beforePlan);
    assert.deepEqual(fs.readFileSync(dest),beforeUi);
  });
});

test('corrupt consent fails closed without silently overwriting it',()=>{
  isolatedTest(()=>{
    prepareQuickstart({confirmed:true});
    fs.writeFileSync(quickstartConsentPath(),'INVALID JSON\n');
    assert.throws(()=>prepareQuickstart({confirmed:true}),/nicht lesbar/);
    assert.equal(fs.readFileSync(quickstartConsentPath(),'utf8'),'INVALID JSON\n');
  });
});

test('partial virtual installation stops; existing files never replaced',()=>{
  isolatedTest(()=>{
    fs.mkdirSync(installedWebRoot(),{recursive:true});
    fs.writeFileSync(path.join(installedWebRoot(),'index.html'),'HANDMADE USER FILE\n');
    assert.throws(()=>prepareQuickstart({confirmed:true}),/Unvollstaendige/);
    assert.equal(fs.readFileSync(path.join(installedWebRoot(),'index.html'),'utf8'),'HANDMADE USER FILE\n');
    assert.equal(fs.existsSync(quickstartConsentPath()),false);
  });
});

test('CLI without interactive terminal refuses first-run consent and makes no changes',()=>{
  isolatedTest(({temp})=>{
    const r=spawnSync(process.execPath,['bin/eden.mjs','quickstart','--no-open'],{
      cwd:ROOT,encoding:'utf8',timeout:15000,
      env:{...process.env,EDEN_DATA_HOME:temp},
      input:'ja\n',
    });
    assert.equal(r.status,2,r.stderr);
    assert.match(r.stderr,/interaktives Terminal/);
    assert.equal(fs.existsSync(quickstartConsentPath()),false);
    assert.equal(fs.existsSync(installedWebRoot()),false);
  });
});

test('no destructive automation commands are exposed by npm entrypoint',()=>{
  const cli=fs.readFileSync(path.join(ROOT,'bin','eden.mjs'),'utf8');
  const quick=fs.readFileSync(path.join(ROOT,'lib','quickstart.mjs'),'utf8');
  assert.doesNotMatch(quick,/\b(?:spawn|execSync|rmSync|format|diskpart|dd\s+if=)\s*\(/);
  assert.match(cli,/command==='quickstart'/);
  assert.match(cli,/keine Windows-Loeschung/);
  assert.ok(userDataRoot);
});
