import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  DEFAULT_GATE5_CONFIG_PATH,
  normalizeCapabilityState,
  redactSensitiveText,
  loadGate5Config,
  validateGate5ConfigObject,
  probeLinuxReadOnly,
  verifyInstallationMediaReadOnly,
  verifyBackupAttestationReadOnly,
  evaluateGate5Preflight,
  formatGate5ReportText,
  saveGate5Report,
} from '../lib/gate5-preflight.mjs';

test('Gate 5: versionierte Konfigurationsdatei v0.1.0 ist gültig und erzwingt Read-Only/Fail-Closed', () => {
  const cfg = loadGate5Config(DEFAULT_GATE5_CONFIG_PATH);
  assert.equal(cfg.schema_version, '0.1.0');
  assert.equal(cfg.gate_id, 'GATE-5');
  assert.equal(cfg.policy.read_only, true);
  assert.equal(cfg.policy.fail_closed, true);
  assert.equal(cfg.policy.allow_destructive_actions, false);
  assert.equal(cfg.policy.allow_partitioning, false);
  assert.equal(cfg.policy.allow_firmware_changes, false);
  assert.equal(cfg.policy.allow_bootloader_changes, false);
  assert.equal(cfg.gates.length, 10);
  assert.ok(cfg.profiles['qubes-whonix']);
  assert.ok(cfg.profiles['linux-kvm']);
  assert.ok(cfg.profiles['windows-workbench']);
  assert.ok(cfg.profiles['tails-live']);
  assert.ok(cfg.profiles['kali-audit']);
});

test('Gate 5: Dreistufiges Zustandsmodell (verfügbar / nicht verfügbar / unbekannt) arbeitet fail-closed', () => {
  assert.deepEqual(normalizeCapabilityState(true), { state: 'available', label_de: 'verfügbar' });
  assert.deepEqual(normalizeCapabilityState('available'), { state: 'available', label_de: 'verfügbar' });
  assert.deepEqual(normalizeCapabilityState('verfügbar'), { state: 'available', label_de: 'verfügbar' });

  assert.deepEqual(normalizeCapabilityState(false), { state: 'unavailable', label_de: 'nicht verfügbar' });
  assert.deepEqual(normalizeCapabilityState('unavailable'), { state: 'unavailable', label_de: 'nicht verfügbar' });
  assert.deepEqual(normalizeCapabilityState('nicht verfügbar'), { state: 'unavailable', label_de: 'nicht verfügbar' });

  for (const ambiguous of [null, undefined, 'unknown', 'unbekannt', '', 'maybe', 123, NaN, {}]) {
    assert.deepEqual(normalizeCapabilityState(ambiguous), { state: 'unknown', label_de: 'unbekannt' });
  }
});

test('Gate 5: Vollständig verifiziertes Qubes-Whonix-Profil erreicht READY_FOR_HUMAN_REVIEW, hält aber G5-10 gesperrt', () => {
  const validSha = 'a'.repeat(64);
  const report = evaluateGate5Preflight({
    profileId: 'qubes-whonix',
    probeOverride: {
      platform: 'linux',
      os_release: '6.8.0-generic',
      arch: 'x64',
      cpu_model: 'AMD Ryzen PRO 7840U',
      cpu_cores: 8,
      ram_total_gb: 32,
      disk_free_gb: 512,
      disk_total_gb: 1024,
      detected_disks_count: 2,
      cpu_virtualization: 'available',
      slat: 'available',
      iommu: 'available',
      uefi: 'available',
      secure_boot: 'available',
      tpm2: 'available',
      network_adapter: 'available',
      target_disk_identified: 'available',
    },
    backupAttestation: { verified: true, restoreTested: true },
    mediaAttestation: { verified: true, sha256: validSha },
  });

  assert.equal(report.schema_version, '0.1.0');
  assert.equal(report.mode, 'read-only');
  assert.equal(report.destructive_actions_executed, false);
  assert.equal(report.firmware_modified, false);
  assert.equal(report.bootloader_modified, false);
  assert.equal(report.installation_authorized, false);
  assert.equal(report.overall_status, 'READY_FOR_HUMAN_REVIEW');
  assert.equal(report.fail_closed_triggered, false);

  const g501To09 = report.gates.slice(0, 9);
  for (const g of g501To09) {
    assert.equal(g.status, 'PASS', `Gate ${g.id} sollte PASS sein`);
    assert.equal(g.capability_label_de, 'verfügbar');
  }
  const g510 = report.gates[9];
  assert.equal(g510.id, 'G5-10');
  assert.equal(g510.status, 'BLOCKED');
  assert.equal(g510.capability_label_de, 'nicht verfügbar');
});

test('Gate 5 Negativtest: Unbekanntes IOMMU bei qubes-whonix löst Fail-Closed (REVIEW_REQUIRED) aus', () => {
  const report = evaluateGate5Preflight({
    profileId: 'qubes-whonix',
    probeOverride: {
      platform: 'win32',
      os_release: '10.0.26100',
      arch: 'x64',
      cpu_cores: 8,
      ram_total_gb: 32,
      disk_free_gb: 300,
      disk_total_gb: 512,
      detected_disks_count: 1,
      cpu_virtualization: 'available',
      slat: 'available',
      iommu: 'unknown',
      uefi: 'available',
      secure_boot: 'available',
      tpm2: 'available',
      target_disk_identified: 'available',
    },
    backupAttestation: { verified: true, restoreTested: true },
    mediaAttestation: { verified: true, sha256: 'b'.repeat(64) },
  });

  assert.equal(report.overall_status, 'REVIEW_REQUIRED');
  assert.equal(report.fail_closed_triggered, true);
  assert.equal(report.installation_authorized, false);
  const g503 = report.gates.find((g) => g.id === 'G5-03');
  assert.equal(g503.status, 'UNKNOWN');
  assert.equal(g503.capability_label_de, 'unbekannt');
});

test('Gate 5 Negativtest: Deaktivierte Virtualisierung oder zu wenig RAM führt zu BLOCKED', () => {
  const report = evaluateGate5Preflight({
    profileId: 'linux-kvm',
    probeOverride: {
      platform: 'linux',
      arch: 'x64',
      cpu_cores: 4,
      ram_total_gb: 4, // Minimum ist 8 GB
      disk_free_gb: 20, // Minimum ist 64 GB
      disk_total_gb: 64,
      cpu_virtualization: 'unavailable',
      slat: 'unavailable',
      iommu: 'unavailable',
      uefi: 'available',
      target_disk_identified: 'available',
    },
  });

  assert.equal(report.overall_status, 'BLOCKED');
  assert.equal(report.fail_closed_triggered, true);
  assert.equal(report.installation_authorized, false);

  const g502 = report.gates.find((g) => g.id === 'G5-02');
  const g504 = report.gates.find((g) => g.id === 'G5-04');
  const g505 = report.gates.find((g) => g.id === 'G5-05');
  assert.equal(g502.status, 'FAIL');
  assert.equal(g504.status, 'FAIL');
  assert.equal(g505.status, 'FAIL');
});

test('Gate 5 Negativtest: Manipulierte Policy (read_only=false) oder unbekanntes Profil blockiert sofort', () => {
  const badConfig = structuredClone(loadGate5Config(DEFAULT_GATE5_CONFIG_PATH));
  badConfig.policy.read_only = false;

  assert.throws(() => validateGate5ConfigObject(badConfig), /Sicherheitsverstoß/);

  const blockedByConfig = evaluateGate5Preflight({ configObject: badConfig });
  assert.equal(blockedByConfig.overall_status, 'BLOCKED');
  assert.equal(blockedByConfig.fail_closed_triggered, true);
  assert.equal(blockedByConfig.installation_authorized, false);
  assert.match(blockedByConfig.config_error, /Sicherheitsverstoß/);

  const blockedByProfile = evaluateGate5Preflight({ profileId: 'nicht-existentes-profil' });
  assert.equal(blockedByProfile.overall_status, 'BLOCKED');
  assert.equal(blockedByProfile.fail_closed_triggered, true);
  assert.match(blockedByProfile.config_error, /Unbekanntes Zielprofil/);
});

test('Gate 5: Kryptografische Medienverifikation erkennt gültige und manipulierte SHA-256-Dateien', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eden-gate5-media-'));
  try {
    const isoFile = path.join(tmpDir, 'mock-image.iso');
    fs.writeFileSync(isoFile, 'EDEN-TEST-ISO-CONTENT-2026', 'utf8');
    const actualSha = crypto.createHash('sha256').update('EDEN-TEST-ISO-CONTENT-2026').digest('hex');

    const okResult = verifyInstallationMediaReadOnly({
      filePath: isoFile,
      expectedSha256: actualSha,
    });
    assert.equal(okResult.state, 'available');
    assert.equal(okResult.label_de, 'verfügbar');

    const mismatchResult = verifyInstallationMediaReadOnly({
      filePath: isoFile,
      expectedSha256: '0'.repeat(64),
    });
    assert.equal(mismatchResult.state, 'unavailable');
    assert.equal(mismatchResult.label_de, 'nicht verfügbar');

    const unknownResult = verifyInstallationMediaReadOnly(null);
    assert.equal(unknownResult.state, 'unknown');
    assert.equal(unknownResult.label_de, 'unbekannt');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Gate 5: Backup-Verifikation und Redaktion sensibler Hardwarekennungen (MAC, UUID, Seriennummer)', () => {
  assert.equal(verifyBackupAttestationReadOnly(null).state, 'unknown');
  assert.equal(verifyBackupAttestationReadOnly({ verified: true, restoreTested: false }).state, 'unavailable');
  assert.equal(verifyBackupAttestationReadOnly({ verified: true, restoreTested: true }).state, 'available');

  const raw = 'CPU SerialNumber=SN-99887766 MAC aa:bb:cc:dd:ee:ff UUID 123e4567-e89b-12d3-a456-426614174000';
  const cleaned = redactSensitiveText(raw);
  assert.ok(!cleaned.includes('SN-99887766'));
  assert.ok(!cleaned.includes('aa:bb:cc:dd:ee:ff'));
  assert.ok(!cleaned.includes('123e4567-e89b-12d3-a456-426614174000'));
  assert.ok(cleaned.includes('[REDACTED-MAC]'));
  assert.ok(cleaned.includes('[REDACTED-UUID]'));
});

test('Gate 5: Linux-Sysfs-Probe (Mock) und nicht-überschreibender JSON-Berichtsexport', () => {
  const mockFs = {
    existsSync: (p) =>
      ['/proc/cpuinfo', '/sys/class/iommu', '/sys/firmware/efi', '/sys/class/tpm/tpm0/tpm_version_major', '/sys/block'].includes(p),
    readFileSync: (p) => {
      if (p === '/proc/cpuinfo') return 'flags : fpu vme de pse tsc msr pae mce cx8 apic sep mtrr pge mca cmov vmx ept';
      if (p === '/sys/class/tpm/tpm0/tpm_version_major') return '2\n';
      return '';
    },
    readdirSync: (p) => {
      if (p === '/sys/class/iommu') return ['dmar0', 'dmar1'];
      if (p === '/sys/block') return ['nvme0n1', 'loop0'];
      return [];
    },
  };

  const linuxProbe = probeLinuxReadOnly(mockFs);
  assert.equal(linuxProbe.cpu_virtualization, 'available');
  assert.equal(linuxProbe.slat, 'available');
  assert.equal(linuxProbe.iommu, 'available');
  assert.equal(linuxProbe.uefi, 'available');
  assert.equal(linuxProbe.tpm2, 'available');
  assert.equal(linuxProbe.target_disk_identified, 'available');
  assert.equal(linuxProbe.detected_disks_count, 1);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eden-gate5-save-'));
  try {
    const outPath = path.join(tmpDir, 'gate5-report.json');
    const report = evaluateGate5Preflight({ profileId: 'windows-workbench' });
    const text = formatGate5ReportText(report);
    assert.ok(text.includes('GATE 5 UNIVERSAL HARDWARE PREFLIGHT'));

    saveGate5Report(report, outPath);
    assert.ok(fs.existsSync(outPath));
    assert.throws(() => saveGate5Report(report, outPath), /EEXIST/);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Gate 5 CLI: "node bin/eden.mjs gate5 --json" liefert validen Bericht auf aktuellem Host', () => {
  const okRun = spawnSync(
    process.execPath,
    ['bin/eden.mjs', 'gate5', '--json', '--profile=windows-workbench'],
    { encoding: 'utf8', timeout: 15000 },
  );
  assert.equal(okRun.status, 0);
  const parsed = JSON.parse(okRun.stdout);
  assert.equal(parsed.schema_version, '0.1.0');
  assert.equal(parsed.gate, 'GATE-5');
  assert.equal(parsed.mode, 'read-only');
  assert.equal(parsed.destructive_actions_executed, false);
  assert.equal(parsed.installation_authorized, false);
  assert.equal(parsed.gates.length, 10);

  const invalidRun = spawnSync(
    process.execPath,
    ['bin/eden.mjs', 'gate5', '--json', '--profile=ungueltiges-profil'],
    { encoding: 'utf8', timeout: 15000 },
  );
  assert.equal(invalidRun.status, 2);
  const invalidParsed = JSON.parse(invalidRun.stdout);
  assert.equal(invalidParsed.overall_status, 'BLOCKED');
  assert.equal(invalidParsed.fail_closed_triggered, true);
});
