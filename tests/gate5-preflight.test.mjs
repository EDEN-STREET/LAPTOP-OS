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
  computeFileSha256Chunked,
  parseLinuxPhysicalCoresFromCpuinfo,
  loadGate5Config,
  validateGate5ConfigObject,
  probeLinuxReadOnly,
  verifyInstallationMediaReadOnly,
  verifyBackupAttestationReadOnly,
  verifyTargetDiskIdentificationReadOnly,
  computeGate5ExitCode,
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

test('Review-Befund #1 (Medienintegrität): Selbstauskunft ohne Datei oder ohne Manifest wird NIEMALS als PASS akzeptiert', () => {
  // 1a. Willkürlicher Hash-String / Selbstauskunft ohne Datei -> UNKNOWN (self_assertion_rejected)
  const selfAssertion = verifyInstallationMediaReadOnly({
    verified: true,
    sha256: 'a'.repeat(64),
  });
  assert.equal(selfAssertion.state, 'unknown');
  assert.equal(selfAssertion.label_de, 'unbekannt');
  assert.equal(selfAssertion.hash_match, false);
  assert.equal(selfAssertion.provenance_verified, false);
  assert.equal(selfAssertion.verification_level, 'self_assertion_rejected');

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eden-gate5-media-'));
  try {
    const isoFile = path.join(tmpDir, 'eden-test-image.iso');
    const content = 'EDEN-STREAMING-HASH-TEST-PAYLOAD-'.repeat(512);
    fs.writeFileSync(isoFile, content, 'utf8');
    const expectedSha = crypto.createHash('sha256').update(content).digest('hex');

    // Chunked Streaming-Hash mit kleinem 64-Byte-Puffer prüfen
    const streamedSha = computeFileSha256Chunked(isoFile, fs, 64);
    assert.equal(streamedSha, expectedSha);

    // 1b. Datei existiert und Hash stimmt, aber KEIN unabhängiges Prüfmanifest -> bleibt UNKNOWN!
    const hashOnlyResult = verifyInstallationMediaReadOnly({
      filePath: isoFile,
      expectedSha256: expectedSha,
    });
    assert.equal(hashOnlyResult.state, 'unknown');
    assert.equal(hashOnlyResult.hash_match, true);
    assert.equal(hashOnlyResult.provenance_verified, false);
    assert.equal(hashOnlyResult.verification_level, 'hash_matched_provenance_unverified');

    // 1c. Abweichender Hash -> UNAVAILABLE (FAIL)
    const mismatchResult = verifyInstallationMediaReadOnly({
      filePath: isoFile,
      expectedSha256: '0'.repeat(64),
    });
    assert.equal(mismatchResult.state, 'unavailable');
    assert.equal(mismatchResult.hash_match, false);
    assert.equal(mismatchResult.verification_level, 'hash_mismatch');

    // 1d. Echte Mediendatei + verifiziertes Prüfmanifest -> AVAILABLE (PASS)
    const manifestFile = path.join(tmpDir, 'SHA256SUMS');
    const manifestText = `${expectedSha}  ${path.basename(isoFile)}\n`;
    fs.writeFileSync(manifestFile, manifestText, 'utf8');
    const manifestSha = crypto.createHash('sha256').update(manifestText).digest('hex');

    const fullVerifiedResult = verifyInstallationMediaReadOnly({
      filePath: isoFile,
      expectedSha256: expectedSha,
      checksumsFilePath: manifestFile,
      trustedManifestSha256: manifestSha,
    });
    assert.equal(fullVerifiedResult.state, 'unknown');
    assert.equal(fullVerifiedResult.hash_match, true);
    assert.equal(fullVerifiedResult.provenance_verified, false);
    assert.equal(fullVerifiedResult.verification_level, 'local_manifest_consistent_untrusted');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Review-Befund #2 (Datenträger & Speicherplatz): Vorhandene Host-Disks allein setzen G5-06/G5-05 nicht auf PASS', () => {
  const reportWithoutTargetDisk = evaluateGate5Preflight({
    profileId: 'qubes-whonix',
    probeOverride: {
      platform: 'linux',
      arch: 'x64',
      cpu_physical_cores: 8,
      cpu_logical_threads: 16,
      ram_total_gb: 32,
      workspace_fs_free_gb: 500,
      workspace_fs_total_gb: 1000,
      detected_disks_count: 2,
      cpu_virtualization: 'available',
      slat: 'available',
      iommu: 'available',
      uefi: 'available',
    },
  });

  const g505 = reportWithoutTargetDisk.gates.find((g) => g.id === 'G5-05');
  const g506 = reportWithoutTargetDisk.gates.find((g) => g.id === 'G5-06');
  assert.equal(g506.status, 'UNKNOWN');
  assert.equal(g506.capability_label_de, 'unbekannt');
  assert.equal(g505.status, 'UNKNOWN');
  assert.equal(g505.capability_label_de, 'unbekannt');
  assert.equal(reportWithoutTargetDisk.overall_status, 'REVIEW_REQUIRED');
  assert.equal(reportWithoutTargetDisk.fail_closed_triggered, true);

  // Negativtest: Systemlaufwerk als Zielmedium angegeben -> FAIL / BLOCKED
  const reportSystemDiskRejected = evaluateGate5Preflight({
    profileId: 'qubes-whonix',
    probeOverride: {
      platform: 'linux',
      arch: 'x64',
      cpu_physical_cores: 8,
      cpu_logical_threads: 16,
      ram_total_gb: 32,
      workspace_fs_free_gb: 500,
      workspace_fs_total_gb: 1000,
      detected_disks_count: 1,
      cpu_virtualization: 'available',
      slat: 'available',
      iommu: 'available',
      uefi: 'available',
    },
    targetDiskAttestation: {
      deviceId: '/dev/nvme0n1',
      isSystemDisk: true,
      verifiedNonSystemDisk: false,
    },
  });
  const g506Rejected = reportSystemDiskRejected.gates.find((g) => g.id === 'G5-06');
  assert.equal(g506Rejected.status, 'FAIL');
  assert.equal(reportSystemDiskRejected.overall_status, 'BLOCKED');
});

test('Review-Befund #3 (--strict Exit-Code): UNKNOWN / REVIEW_REQUIRED liefert im strikten Modus Exit-Code != 0', () => {
  const reviewRequiredReport = evaluateGate5Preflight({
    profileId: 'windows-workbench',
    probeOverride: {
      platform: 'win32',
      arch: 'x64',
      cpu_physical_cores: 6,
      cpu_logical_threads: 12,
      ram_total_gb: 32,
      workspace_fs_free_gb: 80,
      workspace_fs_total_gb: 500,
      cpu_virtualization: 'available',
      slat: 'available',
      iommu: 'unknown',
      uefi: 'unknown',
    },
  });

  assert.equal(reviewRequiredReport.overall_status, 'REVIEW_REQUIRED');
  assert.equal(reviewRequiredReport.fail_closed_triggered, true);
  assert.equal(computeGate5ExitCode(reviewRequiredReport, { strict: false }), 0);
  assert.equal(computeGate5ExitCode(reviewRequiredReport, { strict: true }), 1);

  // Echter CLI-Subprozess-Test mit --strict bei UNKNOWN-Voraussetzungen
  const strictCliRun = spawnSync(
    process.execPath,
    ['bin/eden.mjs', 'gate5', '--strict', '--json', '--profile=windows-workbench'],
    { encoding: 'utf8', timeout: 15000 },
  );
  assert.notEqual(strictCliRun.status, 0);
  assert.equal(strictCliRun.status, 1);
  const parsedCli = JSON.parse(strictCliRun.stdout);
  assert.equal(parsedCli.fail_closed_triggered, true);
});

test('Review-Befund #4 (Backup-Nachweis): Ungeprüfte Selbstauskunft bleibt UNKNOWN; nur echter Dateinachweis wird verifiziert', () => {
  assert.equal(verifyBackupAttestationReadOnly(null).state, 'unknown');
  assert.equal(verifyBackupAttestationReadOnly({ verified: true, restoreTested: false }).state, 'unavailable');

  // Bloße Selbstauskunft { verified: true, restoreTested: true } ohne Nachweisdatei -> UNKNOWN!
  const selfAssertedBackup = verifyBackupAttestationReadOnly({
    verified: true,
    restoreTested: true,
  });
  assert.equal(selfAssertedBackup.state, 'unknown');
  assert.equal(selfAssertedBackup.label_de, 'unbekannt');
  assert.equal(selfAssertedBackup.attestation_kind, 'caller_self_assertion_unverified');

  // Echter Dateinachweis mit SHA-256-Prüfung
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eden-gate5-backup-'));
  try {
    const proofFile = path.join(tmpDir, 'restore-verification.txt');
    const proofText = 'RESTORE-TEST-VERIFIED-2026-11-03';
    fs.writeFileSync(proofFile, proofText, 'utf8');
    const proofSha = crypto.createHash('sha256').update(proofText).digest('hex');

    const verifiedBackup = verifyBackupAttestationReadOnly({
      restoreProofFilePath: proofFile,
      expectedProofSha256: proofSha,
    });
    assert.equal(verifiedBackup.state, 'unknown');
    assert.equal(verifiedBackup.attestation_kind, 'proof_hash_consistent_restore_unverified');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Review-Befund #5a (CPU-Messgenauigkeit): Physische Kerne vs. logische SMT-Threads werden strikt getrennt', () => {
  const cpuinfo2Cores4Threads = [
    'processor\t: 0\nphysical id\t: 0\ncore id\t\t: 0\ncpu cores\t: 2\nflags\t\t: vmx ept',
    'processor\t: 1\nphysical id\t: 0\ncore id\t\t: 0\ncpu cores\t: 2\nflags\t\t: vmx ept',
    'processor\t: 2\nphysical id\t: 0\ncore id\t\t: 1\ncpu cores\t: 2\nflags\t\t: vmx ept',
    'processor\t: 3\nphysical id\t: 0\ncore id\t\t: 1\ncpu cores\t: 2\nflags\t\t: vmx ept',
  ].join('\n\n');

  assert.equal(parseLinuxPhysicalCoresFromCpuinfo(cpuinfo2Cores4Threads), 2);

  // 2 physische Kerne bei 4 logischen Threads müssen bei qubes-whonix (min_cpu_cores: 4) als FAIL/BLOCKED scheitern!
  const smtReport = evaluateGate5Preflight({
    profileId: 'qubes-whonix',
    probeOverride: {
      platform: 'linux',
      arch: 'x64',
      cpu_physical_cores: 2,
      cpu_logical_threads: 4,
      ram_total_gb: 32,
      workspace_fs_free_gb: 256,
      workspace_fs_total_gb: 512,
      cpu_virtualization: 'available',
      slat: 'available',
      iommu: 'available',
      uefi: 'available',
    },
  });
  const g501 = smtReport.gates.find((g) => g.id === 'G5-01');
  assert.equal(g501.status, 'FAIL');
  assert.equal(smtReport.overall_status, 'BLOCKED');

  // Unbekannte physische Kernanzahl trotz 8 logischen Threads -> UNKNOWN (Fail-Closed)
  const unknownPhysReport = evaluateGate5Preflight({
    profileId: 'linux-kvm',
    probeOverride: {
      platform: 'linux',
      arch: 'x64',
      cpu_physical_cores: null,
      cpu_logical_threads: 8,
      ram_total_gb: 16,
      workspace_fs_free_gb: 128,
      workspace_fs_total_gb: 256,
      cpu_virtualization: 'available',
      slat: 'available',
      uefi: 'available',
    },
  });
  const g501Unknown = unknownPhysReport.gates.find((g) => g.id === 'G5-01');
  assert.equal(g501Unknown.status, 'UNKNOWN');
  assert.equal(unknownPhysReport.fail_closed_triggered, true);
});

test('Review-Befund #5b (Konfigurationshärtung): Abschwächen von Pflicht-Gates (z. B. IOMMU=false) wird blockiert', () => {
  const baseCfg = loadGate5Config(DEFAULT_GATE5_CONFIG_PATH);

  // Versuch 1: IOMMU für qubes-whonix in der Konfiguration deaktivieren
  const weakenedIommuCfg = structuredClone(baseCfg);
  weakenedIommuCfg.profiles['qubes-whonix'].required_capabilities.iommu = false;
  assert.throws(() => validateGate5ConfigObject(weakenedIommuCfg), /Sicherheitsverstoß.*iommu/);
  const blockedIommu = evaluateGate5Preflight({ configObject: weakenedIommuCfg });
  assert.equal(blockedIommu.overall_status, 'BLOCKED');
  assert.equal(blockedIommu.fail_closed_triggered, true);

  // Versuch 2: Mindest-RAM für qubes-whonix unter 16 GB senken
  const weakenedRamCfg = structuredClone(baseCfg);
  weakenedRamCfg.profiles['qubes-whonix'].min_ram_gb = 4;
  assert.throws(() => validateGate5ConfigObject(weakenedRamCfg), /Mindestschwellenwerte/);

  // Versuch 3: Backup-Pflicht deaktivieren
  const weakenedBackupCfg = structuredClone(baseCfg);
  weakenedBackupCfg.profiles['linux-kvm'].requires_backup_attestation = false;
  assert.throws(() => validateGate5ConfigObject(weakenedBackupCfg), /Backup-, Medien- und Zieldatenträgerpflicht/);
});

test('Gate 5: Alle vom selben Aufrufer hergestellten Datei- und Datenträgernachweise bleiben REVIEW_REQUIRED (G5-10 BLOCKED)', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eden-gate5-full-'));
  try {
    const isoFile = path.join(tmpDir, 'qubes-r4.2.iso');
    const isoData = 'QUBES-ISO-VERIFIED-CONTENT-2026';
    fs.writeFileSync(isoFile, isoData, 'utf8');
    const isoSha = crypto.createHash('sha256').update(isoData).digest('hex');

    const manifestFile = path.join(tmpDir, 'qubes-r4.2.iso.DIGESTS');
    const manifestData = `${isoSha}  ${path.basename(isoFile)}\n`;
    fs.writeFileSync(manifestFile, manifestData, 'utf8');
    const manifestSha = crypto.createHash('sha256').update(manifestData).digest('hex');

    const backupProofFile = path.join(tmpDir, 'backup-restore-proof.json');
    const backupData = '{"restore_verified":true}';
    fs.writeFileSync(backupProofFile, backupData, 'utf8');
    const backupSha = crypto.createHash('sha256').update(backupData).digest('hex');

    const report = evaluateGate5Preflight({
      profileId: 'qubes-whonix',
      probeOverride: {
        platform: 'linux',
        os_release: '6.8.0-generic',
        arch: 'x64',
        cpu_model: 'AMD Ryzen PRO 7840U',
        cpu_physical_cores: 8,
        cpu_logical_threads: 16,
        ram_total_gb: 32,
        workspace_fs_free_gb: 512,
        workspace_fs_total_gb: 1024,
        detected_disks_count: 2,
        cpu_virtualization: 'available',
        slat: 'available',
        iommu: 'available',
        uefi: 'available',
        secure_boot: 'available',
        tpm2: 'available',
        network_adapter: 'available',
      },
      targetDiskAttestation: {
        deviceId: 'nvme1n1',
        isSystemDisk: false,
        verifiedNonSystemDisk: true,
        partitionLayoutInspected: true,
        unallocatedOrDedicatedFreeGb: 256,
      },
      backupAttestation: {
        restoreProofFilePath: backupProofFile,
        expectedProofSha256: backupSha,
      },
      mediaAttestation: {
        filePath: isoFile,
        expectedSha256: isoSha,
        checksumsFilePath: manifestFile,
        trustedManifestSha256: manifestSha,
      },
    });

    assert.equal(report.overall_status, 'REVIEW_REQUIRED');
    assert.equal(report.fail_closed_triggered, true);
    assert.equal(report.installation_authorized, false);
    assert.equal(report.independent_media_provenance_verified, false);
    assert.equal(report.independent_backup_restore_verified, false);
    assert.equal(report.independent_target_disk_verified, false);
    for (const id of ['G5-05','G5-06','G5-08','G5-09']) {
      assert.equal(report.gates.find(g=>g.id===id).status, 'UNKNOWN', id);
    }
    assert.equal(report.host_summary.target_disk_free_gb, null);
    assert.equal(report.gates[9].id, 'G5-10');
    assert.equal(report.gates[9].status, 'BLOCKED');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Gate 5: Redaktion sensibler Hardwarekennungen, Linux-Sysfs-Probe (target_disk_identified=unknown) und Berichtsexport', () => {
  const raw = 'CPU SerialNumber=SN-99887766 MAC aa:bb:cc:dd:ee:ff UUID 123e4567-e89b-12d3-a456-426614174000';
  const cleaned = redactSensitiveText(raw);
  assert.ok(!cleaned.includes('SN-99887766'));
  assert.ok(!cleaned.includes('aa:bb:cc:dd:ee:ff'));
  assert.ok(!cleaned.includes('123e4567-e89b-12d3-a456-426614174000'));

  const mockFs = {
    existsSync: (p) =>
      ['/proc/cpuinfo', '/sys/class/iommu', '/sys/firmware/efi', '/sys/class/tpm/tpm0/tpm_version_major', '/sys/block'].includes(p),
    readFileSync: (p) => {
      if (p === '/proc/cpuinfo') {
        return 'processor\t: 0\nphysical id\t: 0\ncore id\t\t: 0\ncpu cores\t: 4\nflags\t\t: fpu vmx ept\n';
      }
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
  assert.equal(linuxProbe.cpu_physical_cores, 4);
  assert.equal(linuxProbe.cpu_virtualization, 'available');
  assert.equal(linuxProbe.slat, 'available');
  assert.equal(linuxProbe.iommu, 'available');
  assert.equal(linuxProbe.uefi, 'available');
  assert.equal(linuxProbe.tpm2, 'available');
  // Wichtig: /sys/block allein setzt target_disk_identified NICHT auf 'available', sondern belässt es auf 'unknown'!
  assert.equal(linuxProbe.target_disk_identified, 'unknown');
  assert.equal(linuxProbe.detected_disks_count, 1);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eden-gate5-save-'));
  try {
    const outPath = path.join(tmpDir, 'gate5-report.json');
    const report = evaluateGate5Preflight({ profileId: 'windows-workbench' });
    const text = formatGate5ReportText(report);
    assert.ok(text.includes('Physische CPU-Kerne:'));

    saveGate5Report(report, outPath);
    assert.ok(fs.existsSync(outPath));
    assert.throws(() => saveGate5Report(report, outPath), /EEXIST/);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Caller cannot promote fabricated device, restore proof or matching manifest to independent evidence',()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'eden-untrusted-evidence-'));
  try {
    const iso=path.join(temp,'fabricated.iso');
    fs.writeFileSync(iso,'synthetic-medium');
    const expected=crypto.createHash('sha256').update('synthetic-medium').digest('hex');
    const manifest=path.join(temp,'SHA256SUMS');
    const text=expected+'  fabricated.iso\\n';
    fs.writeFileSync(manifest,text);
    const manifestSha=crypto.createHash('sha256').update(text).digest('hex');
    const file=path.join(temp,'restore.json');
    fs.writeFileSync(file,'{"restoreTested":true}');
    const fileSha=crypto.createHash('sha256').update('{"restoreTested":true}').digest('hex');
    const media=verifyInstallationMediaReadOnly({filePath:iso,expectedSha256:expected,checksumsFilePath:manifest,trustedManifestSha256:manifestSha});
    assert.equal(media.state,'unknown');
    assert.equal(media.provenance_verified,false);
    assert.equal(media.manifest_hash_match,true);
    const backup=verifyBackupAttestationReadOnly({restoreProofFilePath:file,expectedProofSha256:fileSha});
    assert.equal(backup.state,'unknown');
    assert.equal(backup.restore_test_verified,false);
    const report=evaluateGate5Preflight({
      profileId:'qubes-whonix',
      probeOverride:{platform:'linux',arch:'x64',cpu_physical_cores:8,ram_total_gb:32,
        workspace_fs_free_gb:512,target_disk_free_gb:512,
        cpu_virtualization:'available',slat:'available',iommu:'available',uefi:'available'},
      targetDiskAttestation:{deviceId:'/dev/fake',isSystemDisk:false,verifiedNonSystemDisk:true,
        partitionLayoutInspected:true,unallocatedOrDedicatedFreeGb:512},
      backupAttestation:{restoreProofFilePath:file,expectedProofSha256:fileSha},
      mediaAttestation:{filePath:iso,expectedSha256:expected,checksumsFilePath:manifest,trustedManifestSha256:manifestSha}
    });
    assert.equal(report.overall_status,'REVIEW_REQUIRED');
    assert.equal(report.installation_authorized,false);
    assert.equal(report.host_summary.target_disk_free_gb,null);
    for(const id of ['G5-05','G5-06','G5-08','G5-09'])
      assert.equal(report.gates.find(g=>g.id===id).status,'UNKNOWN',id);
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
