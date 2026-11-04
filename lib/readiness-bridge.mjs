/** Read-only bridge between Gate 5 and reboot-to-installer design.
 * No caller-supplied attestation can authorize Windows replacement.
 */
import { buildRebootPlan, REBOOT_PLAN_STATUS } from './reboot-plan.mjs';
import { evaluateGate5Preflight } from './gate5-preflight.mjs';

export const READINESS_BRIDGE_SCHEMA='0.1.0';

export function evaluateEdenReadiness(options={}) {
  const reboot=buildRebootPlan({
    ...(options.snapshot ? {snapshot:options.snapshot}:{}),
    ...(options.now ? {now:options.now}:{}),
  });
  const hardware=evaluateGate5Preflight({
    profileId:'qubes-whonix',
    ...(options.probeOverride ? {probeOverride:options.probeOverride}:{}),
    ...(options.configObject ? {configObject:options.configObject}:{}),
  });
  const reviewNeeded=hardware.overall_status!=='READY_FOR_HUMAN_REVIEW' ||
    hardware.fail_closed_triggered===true ||
    reboot.result!==REBOOT_PLAN_STATUS;
  return {
    schema_version:READINESS_BRIDGE_SCHEMA,
    mode:'READ_ONLY_DIAGNOSTICS',
    target:'qubes-whonix',
    status:reviewNeeded?'REVIEW_REQUIRED':'INDEPENDENT_INSTALLATION_REVIEW_REQUIRED',
    hardware_summary:{
      overall_status:hardware.overall_status,
      gate_count:hardware.gates.length,
      gates:hardware.gates.map(g=>({id:g.id,status:g.status,required:g.required,detail:g.detail})),
      probe_source:hardware.host_summary?.probe_source??'unknown',
      hardware_config_error:hardware.config_error??null,
      independent_media_provenance_verified:false,
      independent_backup_restore_verified:false,
      independent_target_disk_verified:false,
    },
    reboot_summary:{
      result:reboot.result,
      stage_count:reboot.stages.length,
      stages:reboot.stages.map(x=>({id:x.id,status:x.status})),
      hardware_requirements:reboot.requirements.minimums,
    },
    permissions:{
      system_writes:false,
      firmware_writes:false,
      disk_writes:false,
      automatic_reboot:false,
      windows_removal:false,
      installer_launch:false,
      tor_kill_switch_verified:false,
    },
    installation_authorized:false,
    note:'Erfolgreiche Berichterstellung ist keine Freigabe zur Installation; alle echten Eingriffe bleiben gesperrt.',
  };
}