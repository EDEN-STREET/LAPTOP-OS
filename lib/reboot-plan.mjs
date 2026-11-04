/**
 * EDEN reboot-to-installer readiness PLAN v0.1.0.
 *
 * Intentionally NO reboot, partition writes, bootloader edits, image flashing,
 * privilege elevation, or auto-authorization. The resulting JSON is a
 * diagnostic/checklist artifact, not an executable migration script.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { systemSnapshot, userDataRoot } from './core.mjs';

export const REBOOT_PLAN_VERSION = '0.1.0';
export const REBOOT_PLAN_STATUS = 'BLOCKED_INDEPENDENT_REVIEW_REQUIRED';

const CONFIG_PATH = fileURLToPath(new URL('../config/reboot-workflow.v0.1.0.json', import.meta.url));
const REQUIRED_GATES = Object.freeze([
  'hardware_compatibility',
  'virtualization_iommu',
  'verified_recovery_backup',
  'trusted_installer_signature',
  'unambiguous_target_disk',
  'boot_environment_recovery',
  'independent_preboot_review',
  'separate_os_change_consent',
]);
const MINIMUMS = Object.freeze({
  architecture: 'x64',
  minimum_ram_gib: 6,
  recommended_ram_gib: 16,
  minimum_target_storage_gib: 32,
  recommended_target_storage_gib: 128,
});

export function validateRebootConfig(config) {
  if (!config || Array.isArray(config) || typeof config !== 'object') {
    throw new Error('Reboot-Konfiguration muss ein JSON-Objekt sein.');
  }
  if (config.schema_version !== REBOOT_PLAN_VERSION ||
      config.target !== 'qubes-os-standalone' ||
      config.mode !== 'READ_ONLY_PLAN') {
    throw new Error('Unbekannte Reboot-Planversion oder nicht lesender Modus.');
  }
  if (config.installation_engine !== 'NOT_IMPLEMENTED' ||
      config.reboot_engine !== 'NOT_IMPLEMENTED') {
    throw new Error('Automatische Installations- oder Neustart-Engine ist nicht freigegeben.');
  }
  for (const name of [
    'allow_disk_mutations', 'allow_firmware_mutations', 'allow_boot_changes',
    'allow_automatic_reboot', 'allow_windows_removal',
  ]) {
    if (config[name] !== false) throw new Error('Sicherheitsregel verletzt: ' + name);
  }
  if (config.tails_role !== 'SEPARATE_LIVE_SYSTEM' ||
      config.tor_network_isolation !== 'POST_INSTALL_INDEPENDENT_REVIEW') {
    throw new Error('Qubes/Whonix und Tails muessen getrennt bleiben.');
  }
  const t = config.thresholds;
  if (!t || t.architecture !== MINIMUMS.architecture) {
    throw new Error('Nur x64-Zielprofil fuer diesen Qubes-Plan zulaessig.');
  }
  for (const key of ['minimum_ram_gib','recommended_ram_gib','minimum_target_storage_gib','recommended_target_storage_gib']) {
    if (typeof t[key] !== 'number' || !Number.isFinite(t[key]) || t[key] < MINIMUMS[key]) {
      throw new Error('Mindestwert in Konfiguration darf nicht abgeschwaecht werden: ' + key);
    }
  }
  const gates = config.mandatory_independent_gates;
  if (!Array.isArray(gates) || new Set(gates).size !== gates.length ||
      REQUIRED_GATES.some(g => !gates.includes(g))) {
    throw new Error('Verpflichtende unabhaengige Sicherheitsgates fehlen.');
  }
  const urls=config.official_docs;
  const trustedHosts={
    installation:'www.qubes-os.org', hardware:'www.qubes-os.org',
    verification:'doc.qubes-os.org', compatibility:'www.qubes-os.org',
  };
  if (!urls || Object.keys(urls).length !== 4 ||
      Object.entries(trustedHosts).some(([kind,host])=>{
        if(typeof urls[kind]!=='string') return true;
        try {
          const u=new URL(urls[kind]);
          return u.protocol!=='https:' || u.hostname!==host ||
            Boolean(u.username||u.password||u.port);
        } catch { return true; }
      })) {
    throw new Error('Offizielle Qubes-Dokumentationsquellen muessen HTTPS und feste vertrauenswuerdige Hosts verwenden.');
  }
  return true;
}

export function loadRebootConfig() {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  validateRebootConfig(config);
  return config;
}

export function rebootPlanPath() {
  return path.join(userDataRoot(), 'state', 'reboot-plan-v0.1.0.json');
}

function numericOrNull(v) {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null;
}

export function buildRebootPlan({ snapshot = systemSnapshot(), config = loadRebootConfig(), now = new Date() } = {}) {
  validateRebootConfig(config);
  if (!(now instanceof Date) || !Number.isFinite(now.valueOf())) throw new Error('Ungueltiger Zeitstempel.');
  const ram = numericOrNull(snapshot?.ram_gib);
  const workFree = numericOrNull(snapshot?.free_disk_gib_approx);
  const arch = typeof snapshot?.arch === 'string' ? snapshot.arch : 'unknown';
  const onWindows = snapshot?.platform === 'win32';
  const basic = {
    host_os: snapshot?.platform === 'win32' ? 'Windows' : snapshot?.platform === 'linux' ? 'Linux' : 'unknown',
    architecture: arch,
    ram_gib: ram,
    workspace_filesystem_free_gib: workFree,
    logical_cpu_count: numericOrNull(snapshot?.cpus),
    node_22_or_newer: snapshot?.node_suitable === true,
  };
  const constraints = {
    architecture: arch !== 'x64' ? 'NOT_COMPATIBLE_OR_UNKNOWN' : 'CPU_ARCH_ONLY_POSSIBLY_SUPPORTED',
    memory: ram === null ? 'UNKNOWN' : ram < config.thresholds.minimum_ram_gib ? 'BELOW_MINIMUM' :
      ram >= config.thresholds.recommended_ram_gib ? 'RECOMMENDED_CAPACITY_OBSERVED' : 'MINIMUM_CAPACITY_OBSERVED',
    target_storage: 'UNKNOWN_NOT_DERIVED_FROM_WORKSPACE',
    virtualization: 'UNKNOWN_NO_HARDWARE_IOMMU_PROOF',
    firmware: 'UNKNOWN',
    installation_media_signature: 'NOT_VERIFIED',
    recovery_backup_restore: 'NOT_VERIFIED',
    target_disk_mapping: 'NOT_VERIFIED',
    actual_boot_path: 'NOT_VERIFIED',
    network_enforcement: 'NOT_VERIFIED',
  };
  const stages = [
    ['G0','System und Grunddaten lesen','INVENTORY_ONLY'],
    ['G1','Qubes-Hardwarekompatibilitaet unabhaengig pruefen','NOT_VERIFIED'],
    ['G2','Original-Installationsabbild und Signatur pruefen','NOT_VERIFIED'],
    ['G3','Unabhaengigen Restore-/Recovery-Nachweis pruefen','NOT_VERIFIED'],
    ['G4','Eindeutiges Zielmedium und Installationspfad bestimmen','NOT_VERIFIED'],
    ['G5','Gesonderte Entscheidung zur Neuinstallation dokumentieren','NOT_APPROVED'],
    ['G6','In offizielle Installationsumgebung starten','NOT_IMPLEMENTED'],
    ['G7','Qubes, Whonix und Netzwerkisolation real verifizieren','NOT_IMPLEMENTED'],
  ].map(([id,label,status])=>({id,label,status}));
  return {
    schema_version: REBOOT_PLAN_VERSION,
    target: config.target,
    mode: 'READ_ONLY_PLAN',
    generated_at: now.toISOString(),
    current_platform: basic.host_os,
    host_inventory: basic,
    hardware_indicators: constraints,
    requirements: {
      source: config.official_docs,
      minimums: config.thresholds,
      independent_gates: [...config.mandatory_independent_gates],
    },
    stages,
    result: REBOOT_PLAN_STATUS,
    readiness: 'NOT_ESTABLISHED',
    execution: {
      reboot_triggered: false,
      installer_launched: false,
      disk_modified: false,
      windows_removed: false,
      usb_written: false,
      firmware_modified: false,
      tor_configured: false,
      kill_switch_verified: false,
      destructive_actions_authorized: false,
    },
    safe_next_step: onWindows
      ? 'Qubes-Hardware- und Backup-Eignung getrennt pruefen; Windows unveraendert lassen.'
      : 'Qubes-Hardware- und Backup-Eignung getrennt pruefen; vorhandenes System unveraendert lassen.',
    distinction: 'Die lokale npm-Freigabe gilt NUR fuer die EDEN-Browser-App, niemals fuer Neustart oder OS-Ersatz.',
  };
}

/** One new read-only evidence file, never overwrites; never accesses raw disks. */
export function saveRebootPlanOnce(plan) {
  const flags=[
    'reboot_triggered','installer_launched','disk_modified','windows_removed',
    'usb_written','firmware_modified','tor_configured','kill_switch_verified',
    'destructive_actions_authorized',
  ];
  if (!plan || plan.schema_version !== REBOOT_PLAN_VERSION ||
      plan.result !== REBOOT_PLAN_STATUS || plan.readiness !== 'NOT_ESTABLISHED' ||
      plan.mode !== 'READ_ONLY_PLAN' ||
      !plan.execution || flags.some(name=>plan.execution[name]!==false) ||
      !Array.isArray(plan.stages) || plan.stages.length!==8 ||
      plan.stages.some(stage=>stage.status==='PASS' || stage.status==='READY')) {
    throw new Error('Nur unveraenderliche lesende Reboot-Plaene duerfen gespeichert werden.');
  }
  const dest=rebootPlanPath();
  fs.mkdirSync(path.dirname(dest), {recursive:true,mode:0o700});
  fs.writeFileSync(dest, JSON.stringify(plan,null,2)+'\n',{encoding:'utf8',mode:0o600,flag:'wx'});
  return dest;
}
