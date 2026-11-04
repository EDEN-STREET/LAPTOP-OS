/** EDEN single-consent safe quickstart.
 *
 * Prepares only the public browser UI and a versioned PLAN_ONLY file in a
 * per-user directory. No disk/bootloader/firmware/network changes are possible.
 * Consent must be explicitly supplied by the interactive CLI; it is never
 * inferred from npm, process flags, environment variables or past prompts.
 */
import fs from 'node:fs';
import { BUILD, buildPlan, installUserUI, installedWebRoot, safePlanPath, savePlanOnce, systemSnapshot } from './core.mjs';

export const QUICKSTART_TARGET_KEY = '3'; // Qubes OS planning, not installation.
export const QUICKSTART_CONSENT = 'JA';

export function quickstartPreview(snapshot = systemSnapshot()) {
  const plan = buildPlan(QUICKSTART_TARGET_KEY, snapshot);
  return {
    schema_version: '0.1.0',
    project: 'EDEN LAPTOP-OS',
    build: BUILD,
    mode: 'READ_ONLY_PREVIEW',
    node_compatible: Boolean(snapshot.node_suitable),
    ui_present: Boolean(snapshot.ui_present),
    target: 'qubes-with-whonix-plan',
    tails: 'SEPARATE_LIVE_SYSTEM_NOT_NESTED',
    tor: 'WHONIX_GATEWAY_PLANNED_NOT_CONFIGURED',
    gates: {
      source_verification_required: true,
      hardware_preflight_required: true,
      independently_verified_backup_required: true,
      boot_media_verification_required: true,
      disk_selection_required: true,
      os_install_authorized: false,
      windows_removal_authorized: false,
      network_kill_switch_verified: false,
    },
    plan,
    next_step: 'Lokale EDEN-UI nur mit ausdrücklicher Zustimmung anlegen; OS-Installation separat.',
  };
}

/** Only the local browser UI and a plan are persisted; existing data is never overwritten. */
export function prepareSafeQuickstart({ consent, snapshot = systemSnapshot() } = {}) {
  if (consent !== true) throw Object.assign(new Error('Keine ausdrückliche lokale Zustimmung.'), { code: 'CONSENT_REQUIRED' });
  if (!snapshot.node_suitable || !snapshot.ui_present) throw Object.assign(new Error('Node/EDEN-UI nicht bereit.'), { code: 'PREFLIGHT_FAILED' });

  let installed = 'already_present';
  const webRoot = installedWebRoot();
  if (!fs.existsSync(webRoot)) {
    installed = 'created';
    installUserUI();
  } else if (!fs.statSync(webRoot).isDirectory() || !fs.statSync(`${webRoot}/index.html`).isFile()) {
    throw Object.assign(new Error('Unvollständige EDEN-App-Version – kein Überschreiben.'), { code: 'INCOMPLETE_INSTALL' });
  }

  let planned = 'already_present';
  const planPath = safePlanPath();
  if (!fs.existsSync(planPath)) {
    const plan = buildPlan(QUICKSTART_TARGET_KEY, snapshot);
    savePlanOnce(plan);
    planned = 'created';
  }
  return {
    mode: 'LOCAL_UI_AND_PLAN_ONLY',
    version: BUILD,
    ui: installed,
    plan: planned,
    windows_removed: false,
    os_installed: false,
    qubes_installed: false,
    tails_installed: false,
    tor_connected: false,
    disk_changed: false,
    data_transmitted: false,
    next_step: 'EDEN-Term im Browser lokal starten; unabhängige Hardware-/Backupprüfung für Qubes erforderlich.',
  };
}
