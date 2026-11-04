import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  BUILD, ROOT, UI_BUNDLE_FILES, buildPlan, installUserUI, installedWebRoot,
  safePlanPath, savePlanOnce, systemSnapshot, userDataRoot,
} from './core.mjs';

export const CONSENT_SCOPE = 'LOCAL_EDEN_UI_ONLY';
export const QUICKSTART_SCHEMA = '1';

export function quickstartConsentPath() {
  return path.join(userDataRoot(), 'state', `quickstart-consent-${BUILD}.json`);
}

/**
 * Ensure EVERY installed page matches the exact, versioned npm source bundle.
 * Detects missing secondary pages and modified files without overwriting user data.
 * A mismatch is never repaired automatically.
 */
function uiComplete(root = installedWebRoot()) {
  try {
    if (!fs.lstatSync(root).isDirectory()) return false;
    for (const file of UI_BUNDLE_FILES) {
      const installed = path.join(root, file);
      const original = path.join(ROOT, 'web', file);
      if (!fs.lstatSync(installed).isFile() || !fs.lstatSync(original).isFile()) return false;
      const sha = name => crypto.createHash('sha256').update(fs.readFileSync(name)).digest('hex');
      if (sha(installed) !== sha(original)) return false;
    }
    return true;
  } catch { return false; }
}

function readExistingConsent() {
  const file = quickstartConsentPath();
  if (!fs.existsSync(file)) return null;
  let record;
  try { record = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { throw new Error('Vorhandener Zustimmungsnachweis ist nicht lesbar; sicher gestoppt.'); }
  if (record?.schema_version !== QUICKSTART_SCHEMA ||
      record?.scope !== CONSENT_SCOPE ||
      record?.app_build !== BUILD ||
      record?.approved !== true ||
      record?.disk_erase_authorized !== false ||
      record?.os_installation_authorized !== false ||
      record?.firmware_changes_authorized !== false ||
      record?.tor_enforcement_verified !== false) {
    throw new Error('Zustimmungsnachweis stimmt nicht mit dieser App-Version ueberein; sicher gestoppt.');
  }
  return record;
}

/** Read-only inventory. Never grants authority for OS, disk, Tor or firmware changes. */
export function quickstartState() {
  const snap = systemSnapshot();
  if (!snap.node_suitable || !snap.ui_present) {
    throw new Error('Node.js >=22 oder EDEN-Oberflaeche fehlt; Start ohne Aenderung abgebrochen.');
  }
  return {
    version: BUILD,
    consent_scope: CONSENT_SCOPE,
    consent_recorded: Boolean(readExistingConsent()),
    local_ui_present: uiComplete(),
    ui_directory_exists: fs.existsSync(installedWebRoot()),
    plan_present: fs.existsSync(safePlanPath()),
    os_installation_authorized: false,
    disk_erase_authorized: false,
    firmware_changes_authorized: false,
    tor_enforcement_verified: false,
  };
}

/** One explicit approval is scoped to the bundled local UI only.
 * No destructive operations, privilege elevation, device enumeration or network writes.
 * If anything is partially installed or modified outside this exact build, fail closed.
 */
export function prepareQuickstart({ confirmed = false } = {}) {
  const before = quickstartState();
  if (before.consent_recorded) {
    if (!before.local_ui_present) throw new Error('EDEN-Installationsdateien fehlen trotz frueherer Freigabe; kein automatisches Ueberschreiben.');
    return { ...before, status: 'READY', reused_consent: true };
  }
  if (!confirmed) return { ...before, status: 'NEEDS_LOCAL_UI_CONSENT' };
  if (before.ui_directory_exists && !before.local_ui_present) {
    throw new Error('Unvollstaendige EDEN-Version gefunden; manuelle Reparatur statt Ueberschreiben.');
  }

  if (!before.local_ui_present) installUserUI();
  if (!fs.existsSync(safePlanPath())) {
    // A PLAN_ONLY document, not a boot image, partitioner or real Qubes installer.
    savePlanOnce(buildPlan('3', systemSnapshot()));
  }

  const file = quickstartConsentPath();
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const record = {
    schema_version: QUICKSTART_SCHEMA, app_build: BUILD,
    scope: CONSENT_SCOPE, approved: true, created_at: new Date().toISOString(),
    disk_erase_authorized: false, os_installation_authorized: false,
    firmware_changes_authorized: false, tor_enforcement_verified: false,
  };
  fs.writeFileSync(file, JSON.stringify(record, null, 2) + '\n', {
    encoding: 'utf8', flag: 'wx', mode: 0o600,
  });
  return { ...quickstartState(), status: 'READY', reused_consent: false };
}
