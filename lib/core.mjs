import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PACKAGE_NAME = 'EDEN LAPTOP-OS';
export const BUILD = '0.8.0-preview.10';
export const MIN_NODE_MAJOR = 22;

// The only authoritative manifest of the complete bundled UI. The installer and
// health-check must use the SAME list: missing secondary pages must fail closed.
export const UI_BUNDLE_FILES = Object.freeze([
  'index.html','setup.html','builder.html','handbuch.html','toolbox.html',
  'grimoire.html','testlab.html','quellen.html','wiki.html','projects.html',
  'projects.js','eden-hub.css','security-architecture.html','reboot-plan.html',
  'hardware-readiness.html','ultimate-hub.html','tool-registry.js',
  'image-studio.html','local-tools.html','academy.html','support.html',
  'markdown-studio.html','diff-studio.html','portable-toolbox.html',
]);

// User-owned location, independent of an ephemeral npm cache directory.
// Never uploads or transmits this path or its contents.
export function userDataRoot() {
  if (process.env.EDEN_DATA_HOME) return path.resolve(process.env.EDEN_DATA_HOME);
  if (process.platform === 'win32') return path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'EDEN', 'LAPTOP-OS');
  return path.join(os.homedir(), '.local', 'share', 'eden', 'laptop-os');
}
export function installedWebRoot() { return path.join(userDataRoot(), 'app', BUILD, 'web'); }
export function safePlanPath() { return path.join(userDataRoot(), 'state', 'setup-plan.json'); }

export function systemSnapshot() {
  let disk = null;
  try {
    if (typeof fs.statfsSync === 'function') {
      const st = fs.statfsSync(userDataRoot() && fs.existsSync(userDataRoot()) ? userDataRoot() : os.homedir());
      disk = Math.round(Number(st.bavail) * Number(st.bsize) / 1024 ** 3 * 10) / 10;
    }
  } catch { /* Free-space metric optional; never run shell commands. */ }
  const major = Number(process.versions.node.split('.')[0]);
  return {
    platform: process.platform, arch: process.arch, release: os.release(),
    node: process.versions.node, node_suitable: major >= MIN_NODE_MAJOR,
    cpus: os.cpus()?.length ?? null,
    ram_gib: Math.round(os.totalmem() / 1024 ** 3 * 10) / 10,
    free_disk_gib_approx: disk,
    offline_bundle_present: fs.existsSync(path.join(ROOT, 'offline', 'EDEN_Handbuch_v0.8.0', 'START-EDEN.html')),
    ui_present: fs.existsSync(path.join(ROOT, 'web', 'index.html')),
    user_install_present: fs.existsSync(path.join(installedWebRoot(), 'index.html')),
  };
}

export const TARGETS = Object.freeze({
  '1': { id: 'windows-ui', label: 'Windows – lokale EDEN-Oberfläche', note: 'Keine Betriebssystem- oder Sicherheitsänderungen; nur lokale Anwendung.' },
  '2': { id: 'kali-plan', label: 'Kali Linux – Installationsplanung', note: 'Nur Prüfliste. Keine Linux-Installation, keine Partitionierung.' },
  '3': { id: 'qubes-plan', label: 'Qubes OS – Hardware- und Recovery-Plan', note: 'Bare-Metal-Voraussetzungen separat prüfen; kein automatischer Installer.' },
  '4': { id: 'tails-plan', label: 'Tails – separates Live-System planen', note: 'Keine Änderungen am Tails-Bootmodell und keine EDEN-Agenteninstallation.' },
  '5': { id: 'graphene-plan', label: 'GrapheneOS – unabhängiges Android-Profil', note: 'Nur Planung; keine Bootloader- oder Gerätemodifikation.' },
});

export function buildPlan(targetKey, snapshot, now = new Date()) {
  const target = TARGETS[String(targetKey)];
  if (!target) throw new Error('Unbekanntes Ziel. Keine Aktion durchgeführt.');
  return {
    schema_version: '1', project: PACKAGE_NAME, build: BUILD,
    created_at: now.toISOString(), mode: 'PLAN_ONLY',
    selected_target: target.id, target_label: target.label,
    environment: { platform: snapshot.platform, arch: snapshot.arch, node: snapshot.node },
    gates: { read_only_preflight: true, source_verification_required: true,
      user_approval_for_writes: true, backup_restore_proof_required: true,
      independent_verification_required: true, system_writes_enabled: false,
      disk_changes_enabled: false, firmware_changes_enabled: false,
      router_changes_enabled: false, remote_execution_enabled: false },
    steps: [
      'Hardware-/Versionsinformationen nur lesen',
      'Offizielle Quellen und Kompatibilität prüfen',
      'Bedrohungsmodell und Zielprofil auswählen',
      'Backup und Test der Wiederherstellung dokumentieren',
      'Änderungen separat zur Freigabe vorlegen; nicht automatisch ausführen',
      'Später auf freigegebener Testhardware unabhängig verifizieren',
    ],
    verification: 'NICHT VERIFIZIERT: lediglich vorbereiteter Installationsplan',
  };
}

export function savePlanOnce(plan) {
  const dest = safePlanPath();
  fs.mkdirSync(path.dirname(dest), { recursive: true, mode: 0o700 });
  fs.writeFileSync(dest, JSON.stringify(plan, null, 2) + '\n', { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  return dest;
}

/** Copy only the bundled public UI into a NEW per-user version directory.
 * Does not overwrite other releases, read private files, add autostart, or request admin rights.
 * Called ONLY after an explicit interactive confirmation.
 */
export function installUserUI() {
  const source = path.join(ROOT, 'web');
  const dest = installedWebRoot();
  const expected = UI_BUNDLE_FILES;
  for (const f of expected) if (!fs.statSync(path.join(source, f)).isFile()) throw new Error(`Fehlende geprüfte UI-Datei: ${f}`);
  fs.mkdirSync(path.dirname(dest), { recursive: true, mode: 0o700 });
  fs.mkdirSync(dest, { recursive: false, mode: 0o700 }); // throws EEXIST: no overwrites
  try {
    for (const f of expected) fs.copyFileSync(path.join(source,f), path.join(dest,f), fs.constants.COPYFILE_EXCL);
  } catch (e) {
    // Do not remove any user-created file; partial copy remains for manual diagnosis.
    throw e;
  }
  return dest;
}

export function publicRoot() {
  const verifiedLocal = path.join(ROOT, 'offline', 'EDEN_Handbuch_v0.8.0');
  if (fs.existsSync(path.join(verifiedLocal, 'START-EDEN.html'))) return verifiedLocal;
  if (fs.existsSync(path.join(installedWebRoot(),'index.html'))) return installedWebRoot();
  return path.join(ROOT, 'web');
}

export function resolvePublicFile(rawPath, directory) {
  if (typeof rawPath !== 'string' || rawPath.includes('\0') || /%2f|%5c/i.test(rawPath)) return null;
  let decoded;
  try { decoded = decodeURIComponent(rawPath.split('?')[0]); } catch { return null; }
  if (!decoded.startsWith('/') || decoded.includes('\\')) return null;
  const segments = decoded.split('/').filter(Boolean);
  if (segments.some(s => s === '.' || s === '..' || s.startsWith('.'))) return null;
  if (segments.length === 0) segments.push(fs.existsSync(path.join(directory,'START-EDEN.html')) ? 'START-EDEN.html' : 'index.html');
  const resolved = path.resolve(directory, ...segments);
  if (!resolved.startsWith(path.resolve(directory) + path.sep)) return null;
  if (!/\.(html|css|js|mjs|json|md|txt|png|jpe?g|svg|webp|ico|pdf|woff2?)$/i.test(resolved)) return null;
  return resolved;
}
