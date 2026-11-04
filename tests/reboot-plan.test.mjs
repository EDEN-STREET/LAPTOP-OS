import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT } from '../lib/core.mjs';
import { startServer } from '../lib/server.mjs';
import {
  REBOOT_PLAN_STATUS, buildRebootPlan, loadRebootConfig,
  validateRebootConfig, saveRebootPlanOnce, rebootPlanPath,
} from '../lib/reboot-plan.mjs';

const snapshot={
  platform:'win32',arch:'x64',cpus:8,ram_gib:32,
  free_disk_gib_approx:400,node_suitable:true,
};
const fixedTime=new Date('2026-11-04T12:00:00Z');

function isolated(action) {
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'eden-reboot-plan-sandbox-'));
  const old=process.env.EDEN_DATA_HOME;
  process.env.EDEN_DATA_HOME=tmp;
  const sentinel=path.join(tmp,'WINDOWS_PARTITION_UNTOUCHED.txt');
  fs.writeFileSync(sentinel,'USER DATA UNCHANGED\n',{flag:'wx'});
  try {
    action({tmp,sentinel});
    assert.equal(fs.readFileSync(sentinel,'utf8'),'USER DATA UNCHANGED\n');
  } finally {
    if(old===undefined)delete process.env.EDEN_DATA_HOME;
    else process.env.EDEN_DATA_HOME=old;
    fs.rmSync(tmp,{recursive:true,force:true});
  }
}

test('versioned read-only Qubes workflow has all mandatory independent gates',()=>{
  const cfg=loadRebootConfig();
  assert.equal(validateRebootConfig(cfg),true);
  assert.equal(cfg.mode,'READ_ONLY_PLAN');
  assert.equal(cfg.installation_engine,'NOT_IMPLEMENTED');
  assert.equal(cfg.reboot_engine,'NOT_IMPLEMENTED');
  assert.equal(cfg.mandatory_independent_gates.length,8);
  for(const key of ['allow_disk_mutations','allow_windows_removal','allow_automatic_reboot','allow_boot_changes'])
    assert.equal(cfg[key],false);
  assert.equal(cfg.thresholds.architecture,'x64');
});

test('even ideal CPU/RAM and apparent free workspace do not authorize OS reboot or Windows deletion',()=>{
  const p=buildRebootPlan({snapshot,now:fixedTime});
  assert.equal(p.result,REBOOT_PLAN_STATUS);
  assert.equal(p.mode,'READ_ONLY_PLAN');
  assert.equal(p.hardware_indicators.architecture,'CPU_ARCH_ONLY_POSSIBLY_SUPPORTED');
  assert.equal(p.hardware_indicators.memory,'RECOMMENDED_CAPACITY_OBSERVED');
  assert.equal(p.hardware_indicators.target_storage,'UNKNOWN_NOT_DERIVED_FROM_WORKSPACE');
  assert.equal(p.hardware_indicators.virtualization,'UNKNOWN_NO_HARDWARE_IOMMU_PROOF');
  assert.equal(p.execution.reboot_triggered,false);
  assert.equal(p.execution.disk_modified,false);
  assert.equal(p.execution.windows_removed,false);
  assert.equal(p.execution.destructive_actions_authorized,false);
  assert.equal(p.execution.kill_switch_verified,false);
  assert.equal(p.stages.length,8);
  assert.equal(p.stages[6].status,'NOT_IMPLEMENTED');
});

test('low memory or unsupported architecture produce non-authorizing indicators',()=>{
  const low=buildRebootPlan({snapshot:{...snapshot,ram_gib:2,arch:'arm64'},now:fixedTime});
  assert.equal(low.hardware_indicators.memory,'BELOW_MINIMUM');
  assert.equal(low.hardware_indicators.architecture,'NOT_COMPATIBLE_OR_UNKNOWN');
  assert.equal(low.result,REBOOT_PLAN_STATUS);
});

test('arbitrary caller flags never become independent backup/disk/signature verification',()=>{
  const spoof=buildRebootPlan({snapshot:{
    ...snapshot,target_disk_identified:true,backup_verified:true,installer_signature_verified:true,
    installation_authorized:true,reboot_allowed:true
  },now:fixedTime});
  assert.equal(spoof.hardware_indicators.target_disk_mapping,'NOT_VERIFIED');
  assert.equal(spoof.hardware_indicators.installation_media_signature,'NOT_VERIFIED');
  assert.equal(spoof.hardware_indicators.recovery_backup_restore,'NOT_VERIFIED');
  assert.equal(spoof.execution.destructive_actions_authorized,false);
});

test('config cannot bypass minimum hardware thresholds or safety switches',()=>{
  const original=loadRebootConfig();
  for(const modify of [
    x=>{x.thresholds.minimum_ram_gib=1;},
    x=>{x.thresholds.minimum_target_storage_gib=1;},
    x=>{x.allow_windows_removal=true;},
    x=>{x.allow_automatic_reboot=true;},
    x=>{x.installation_engine='ACTIVE';},
    x=>{x.mandatory_independent_gates=x.mandatory_independent_gates.slice(1);},
    x=>{x.tails_role='QUBES_DEFAULT_GATEWAY';},
    x=>{x.official_docs.verification='http://untrusted.example/';},
    x=>{x.official_docs.verification='https://untrusted.example/qubes';},
    x=>{x.official_docs.hardware='https://www.qubes-os.org.untrusted.example/hcl';},
  ]){
    const cloned=structuredClone(original);
    modify(cloned);
    assert.throws(()=>validateRebootConfig(cloned));
  }
});

test('save-plan is opt-in, creates only new JSON and cannot overwrite existing or mutate sentinel',()=>{
  isolated(({tmp,sentinel})=>{
    const initial=buildRebootPlan({snapshot,now:fixedTime});
    assert.equal(fs.existsSync(rebootPlanPath()),false);
    assert.deepEqual(fs.readdirSync(tmp),['WINDOWS_PARTITION_UNTOUCHED.txt']);
    const saved=saveRebootPlanOnce(initial);
    assert.equal(saved,rebootPlanPath());
    assert.equal(JSON.parse(fs.readFileSync(saved,'utf8')).result,REBOOT_PLAN_STATUS);
    assert.throws(()=>saveRebootPlanOnce(initial),err=>err.code==='EEXIST');
    assert.equal(fs.readFileSync(sentinel,'utf8'),'USER DATA UNCHANGED\n');
  });
});

test('forged or mutation-authorizing reports are refused even for JSON save',()=>{
  isolated(()=>{
    const p=buildRebootPlan({snapshot,now:fixedTime});
    for(const modify of [
      x=>{x.result='PASS';},
      x=>{x.execution.reboot_triggered=true;},
      x=>{x.execution.disk_modified=true;},
      x=>{x.execution.destructive_actions_authorized=true;},
    ]){
      const clone=structuredClone(p);
      modify(clone);
      assert.throws(()=>saveRebootPlanOnce(clone));
    }
    assert.equal(fs.existsSync(rebootPlanPath()),false);
  });
});

test('CLI JSON is safe and does not create any files',()=>{
  isolated(({tmp})=>{
    const r=spawnSync(process.execPath,['bin/eden.mjs','reboot-plan','--json'],{
      cwd:ROOT,encoding:'utf8',timeout:15000,env:{...process.env,EDEN_DATA_HOME:tmp}
    });
    assert.equal(r.status,0,r.stderr);
    const parsed=JSON.parse(r.stdout);
    assert.equal(parsed.result,REBOOT_PLAN_STATUS);
    assert.equal(parsed.execution.reboot_triggered,false);
    assert.equal(parsed.execution.disk_modified,false);
    assert.equal(fs.existsSync(rebootPlanPath()),false);
    assert.deepEqual(fs.readdirSync(tmp),['WINDOWS_PARTITION_UNTOUCHED.txt']);
  });
});

test('strict CLI readiness returns nonzero when reboot cannot be independently authorized',()=>{
  isolated(({tmp})=>{
    const r=spawnSync(process.execPath,['bin/eden.mjs','reboot-plan','--json','--strict'],{
      cwd:ROOT,encoding:'utf8',timeout:15000,env:{...process.env,EDEN_DATA_HOME:tmp}
    });
    assert.equal(r.status,3,r.stderr);
    assert.equal(JSON.parse(r.stdout).result,REBOOT_PLAN_STATUS);
    assert.equal(fs.existsSync(rebootPlanPath()),false);
  });
});

test('CLI explicit --save-plan writes one immutable file, second invocation safely refuses overwrite',()=>{
  isolated(({tmp})=>{
    const run=()=>spawnSync(process.execPath,['bin/eden.mjs','reboot-plan','--json','--save-plan'],{
      cwd:ROOT,encoding:'utf8',timeout:15000,env:{...process.env,EDEN_DATA_HOME:tmp}
    });
    const first=run();
    assert.equal(first.status,0,first.stderr);
    const before=fs.readFileSync(rebootPlanPath());
    const second=run();
    assert.equal(second.status,2,second.stderr);
    assert.deepEqual(fs.readFileSync(rebootPlanPath()),before);
  });
});

test('reboot-plan HTML actually serves on local-only HTTP and advertises installation blocked',async()=>{
  const server=await startServer({port:0,root:path.join(ROOT,'web')});
  try {
    assert.equal(server.address().address,'127.0.0.1');
    const base='http://127.0.0.1:'+server.address().port;
    const response=await fetch(base+'/reboot-plan.html');
    assert.equal(response.status,200);
    const html=await response.text();
    assert.match(html,/Reboot-to-Installer/);
    assert.match(html,/INSTALLATION GESPERRT/);
    assert.match(html,/Tails/);
    assert.match(html,/keine Windows-Partition/i);
    assert.equal((await fetch(base+'/reboot-plan.html',{method:'POST'})).status,405);
  } finally {
    await new Promise(resolve=>server.close(resolve));
  }
});

test('no reboot, disk-wipe or boot-control commands in the implementation module',()=>{
  const source=fs.readFileSync(path.join(ROOT,'lib','reboot-plan.mjs'),'utf8');
  assert.doesNotMatch(source,/\b(?:spawnSync|execSync|execFileSync|spawn|execFile)\s*\(/);
  assert.doesNotMatch(source,/\b(?:process\.exit|reboot\s*\(|shutdown\s*\(|format\s*\(|diskpart\s*\()/);
});
