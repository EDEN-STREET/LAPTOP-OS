import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { ROOT } from '../lib/core.mjs';
import { evaluateEdenReadiness } from '../lib/readiness-bridge.mjs';

const fixture={
  platform:'linux', arch:'x64',cpu_physical_cores:8,cpu_logical_threads:16,
  ram_total_gb:32,workspace_fs_free_gb:512,workspace_fs_total_gb:1024,
  detected_disks_count:2,cpu_virtualization:'available',slat:'available',
  iommu:'available',uefi:'available',
};
test('bridge compares ten hardware gates against eight reboot stages without authorizing installation',()=>{
  const a=evaluateEdenReadiness({
    snapshot:{platform:'win32',arch:'x64',ram_gib:32,cpus:16,node_suitable:true,free_disk_gib_approx:700},
    probeOverride:fixture,
    now:new Date('2026-11-04T12:00:00Z')
  });
  assert.equal(a.hardware_summary.gate_count,10);
  assert.equal(a.reboot_summary.stage_count,8);
  assert.equal(a.hardware_summary.overall_status,'REVIEW_REQUIRED');
  assert.equal(a.reboot_summary.result,'BLOCKED_INDEPENDENT_REVIEW_REQUIRED');
  assert.equal(a.status,'REVIEW_REQUIRED');
  assert.equal(a.installation_authorized,false);
  assert.equal(a.hardware_summary.independent_media_provenance_verified,false);
  assert.equal(a.hardware_summary.independent_backup_restore_verified,false);
  assert.equal(a.hardware_summary.independent_target_disk_verified,false);
  for(const state of Object.values(a.permissions))assert.equal(state,false);
});
test('missing physical CPU or IOMMU cannot be replaced by logical thread count',()=>{
  const a=evaluateEdenReadiness({probeOverride:{...fixture,cpu_physical_cores:null,cpu_logical_threads:16,iommu:'unknown'}});
  assert.notEqual(a.hardware_summary.overall_status,'READY_FOR_HUMAN_REVIEW');
  assert.equal(a.hardware_summary.gates.find(x=>x.id==='G5-03').status,'UNKNOWN');
  assert.equal(a.installation_authorized,false);
});
test('corrupt config is blocked and does not allow user to override safe bridge',()=>{
  const x=evaluateEdenReadiness({configObject:{schema_version:'0.1.0',policy:{read_only:false}}});
  assert.equal(x.hardware_summary.overall_status,'BLOCKED');
  assert.ok(x.hardware_summary.hardware_config_error);
  assert.equal(x.installation_authorized,false);
});
test('combined CLI normal read-only JSON succeeds but strict readiness never claims success',()=>{
  const r=spawnSync(process.execPath,['bin/eden.mjs','assess','--json'],{cwd:ROOT,encoding:'utf8',timeout:30000});
  assert.equal(r.status,0,r.stderr);
  const out=JSON.parse(r.stdout);
  assert.equal(out.installation_authorized,false);
  assert.equal(out.hardware_summary.gate_count,10);
  assert.equal(out.reboot_summary.stage_count,8);
  const strict=spawnSync(process.execPath,['bin/eden.mjs','assess','--json','--strict'],{cwd:ROOT,encoding:'utf8',timeout:30000});
  assert.equal(strict.status,1,strict.stderr);
  assert.equal(JSON.parse(strict.stdout).installation_authorized,false);
});
