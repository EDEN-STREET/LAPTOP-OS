import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DEFAULT_GATE5_CONFIG_PATH = path.resolve(
  __dirname,
  '..',
  'config',
  'gate5-preflight.v0.1.0.json',
);

export const CAPABILITY_LABELS_DE = Object.freeze({
  available: 'verfügbar',
  unavailable: 'nicht verfügbar',
  unknown: 'unbekannt',
});

const MAC_REGEX = /\b(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b/g;
const UUID_REGEX = /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g;
const SERIAL_KV_REGEX = /\b(serial(?:number)?|seriennummer|asset_tag|uuid)\s*[:=]\s*([^\s,;]+)/gi;

/**
 * Normalizes any capability indicator into the strict 3-state model:
 * 'available' ('verfügbar'), 'unavailable' ('nicht verfügbar'), 'unknown' ('unbekannt').
 * Any ambiguous, null, undefined, NaN, or unexpected input becomes 'unknown' (fail-closed).
 */
export function normalizeCapabilityState(rawValue) {
  let state = 'unknown';
  if (rawValue === true || rawValue === 'available' || rawValue === 'verfügbar') {
    state = 'available';
  } else if (rawValue === false || rawValue === 'unavailable' || rawValue === 'nicht verfügbar') {
    state = 'unavailable';
  } else if (
    rawValue &&
    typeof rawValue === 'object' &&
    typeof rawValue.state === 'string'
  ) {
    return normalizeCapabilityState(rawValue.state);
  }
  return {
    state,
    label_de: CAPABILITY_LABELS_DE[state],
  };
}

/**
 * Redacts potential serial numbers, UUIDs, and MAC addresses from free-form text.
 */
export function redactSensitiveText(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(MAC_REGEX, '[REDACTED-MAC]')
    .replace(UUID_REGEX, '[REDACTED-UUID]')
    .replace(SERIAL_KV_REGEX, '$1=[REDACTED]');
}

/**
 * Loads and validates the versioned Gate-5 configuration file.
 * Throws a descriptive error if invalid so the caller can fail closed.
 */
export function loadGate5Config(configPath = DEFAULT_GATE5_CONFIG_PATH) {
  const resolved = path.resolve(configPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Gate-5-Konfigurationsdatei nicht gefunden: ${resolved}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  } catch (err) {
    throw new Error(`Gate-5-Konfigurationsdatei ist kein gültiges JSON: ${err.message}`);
  }

  validateGate5ConfigObject(parsed);
  return parsed;
}

export function validateGate5ConfigObject(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('Gate-5-Konfiguration muss ein JSON-Objekt sein.');
  }
  if (config.schema_version !== '0.1.0') {
    throw new Error(`Ungültige Gate-5 schema_version: "${String(config.schema_version)}" (erwartet: "0.1.0").`);
  }
  if (config.gate_id !== 'GATE-5') {
    throw new Error(`Ungültige gate_id: "${String(config.gate_id)}" (erwartet: "GATE-5").`);
  }
  const policy = config.policy;
  if (!policy || typeof policy !== 'object') {
    throw new Error('Gate-5-Konfiguration enthält keinen gültigen policy-Block.');
  }
  if (
    policy.read_only !== true ||
    policy.fail_closed !== true ||
    policy.allow_destructive_actions !== false ||
    policy.allow_partitioning !== false ||
    policy.allow_firmware_changes !== false ||
    policy.allow_bootloader_changes !== false
  ) {
    throw new Error(
      'Sicherheitsverstoß in Gate-5-Policy: read_only=true, fail_closed=true und alle destruktiven Flags=false sind zwingend erforderlich.',
    );
  }
  if (!config.profiles || typeof config.profiles !== 'object' || Object.keys(config.profiles).length === 0) {
    throw new Error('Gate-5-Konfiguration enthält keine Zielprofile (profiles).');
  }
  for (const [profileKey, profile] of Object.entries(config.profiles)) {
    if (
      typeof profile.min_ram_gb !== 'number' ||
      !Number.isFinite(profile.min_ram_gb) ||
      profile.min_ram_gb <= 0 ||
      typeof profile.min_free_disk_gb !== 'number' ||
      !Number.isFinite(profile.min_free_disk_gb) ||
      profile.min_free_disk_gb <= 0 ||
      typeof profile.min_cpu_cores !== 'number' ||
      !Number.isFinite(profile.min_cpu_cores) ||
      profile.min_cpu_cores <= 0 ||
      !Array.isArray(profile.required_arch) ||
      profile.required_arch.length === 0 ||
      !profile.required_capabilities ||
      typeof profile.required_capabilities !== 'object'
    ) {
      throw new Error(`Ungültige Schwellenwerte im Gate-5-Profil "${profileKey}".`);
    }
  }
  if (!Array.isArray(config.gates) || config.gates.length !== 10) {
    throw new Error('Gate-5-Konfiguration muss exakt die 10 Pflicht-Gates (G5-01 bis G5-10) definieren.');
  }
  return true;
}

function readDiskStatsSafe(targetPath) {
  try {
    const stat = fs.statfsSync(targetPath);
    const totalBytes = Number(stat.blocks) * Number(stat.bsize);
    const freeBytes = Number(stat.bavail) * Number(stat.bsize);
    if (!Number.isFinite(totalBytes) || !Number.isFinite(freeBytes) || totalBytes <= 0) {
      return { totalGb: null, freeGb: null };
    }
    return {
      totalGb: Math.round((totalBytes / 1024 ** 3) * 10) / 10,
      freeGb: Math.round((freeBytes / 1024 ** 3) * 10) / 10,
    };
  } catch {
    return { totalGb: null, freeGb: null };
  }
}

function detectNetworkPresenceSafe() {
  try {
    const interfaces = os.networkInterfaces();
    const names = Object.keys(interfaces || {}).filter(
      (name) => !name.toLowerCase().includes('loopback') && name !== 'lo',
    );
    return {
      adapterCount: names.length,
      state: names.length > 0 ? 'available' : 'unavailable',
    };
  } catch {
    return {
      adapterCount: 0,
      state: 'unknown',
    };
  }
}

/**
 * Strictly read-only Windows hardware/virtualization probe via PowerShell CIM queries.
 * Never requests serial numbers, UUIDs, or MAC addresses.
 */
export function probeWindowsReadOnly() {
  const script = [
    '$ErrorActionPreference = "SilentlyContinue"',
    '$proc = Get-CimInstance -ClassName Win32_Processor | Select-Object -First 1 Name,NumberOfCores,NumberOfLogicalProcessors,VirtualizationFirmwareEnabled,SecondLevelAddressTranslationExtensions,VMMonitorModeExtensions',
    '$cs = Get-CimInstance -ClassName Win32_ComputerSystem | Select-Object -First 1 HypervisorPresent,TotalPhysicalMemory',
    '$disks = @(Get-CimInstance -ClassName Win32_DiskDrive | Select-Object Index,MediaType,InterfaceType,Size)',
    '[PSCustomObject]@{ Processor = $proc; ComputerSystem = $cs; DiskCount = $disks.Count } | ConvertTo-Json -Compress -Depth 4',
  ].join('; ');

  const res = spawnSync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-Command', script],
    {
      encoding: 'utf8',
      timeout: 5000,
      windowsHide: true,
    },
  );

  if (res.status !== 0 || !res.stdout) {
    return {
      cpu_virtualization: 'unknown',
      slat: 'unknown',
      iommu: 'unknown',
      uefi: 'unknown',
      secure_boot: 'unknown',
      tpm2: 'unknown',
      target_disk_identified: 'unknown',
      detected_disks_count: null,
      probe_source: 'win32-fallback-unknown',
    };
  }

  try {
    const parsed = JSON.parse(res.stdout.trim());
    const proc = parsed?.Processor || {};
    const cs = parsed?.ComputerSystem || {};
    const hypervisorPresent = cs.HypervisorPresent === true;
    const vtx =
      proc.VirtualizationFirmwareEnabled === true ||
      proc.VMMonitorModeExtensions === true ||
      hypervisorPresent
        ? 'available'
        : proc.VirtualizationFirmwareEnabled === false
          ? 'unavailable'
          : 'unknown';
    const slat =
      proc.SecondLevelAddressTranslationExtensions === true || hypervisorPresent
        ? 'available'
        : proc.SecondLevelAddressTranslationExtensions === false
          ? 'unavailable'
          : 'unknown';
    const diskCount = typeof parsed?.DiskCount === 'number' ? parsed.DiskCount : null;

    return {
      cpu_virtualization: vtx,
      slat,
      // Under non-elevated Windows user context, DMAR/IVRS ACPI table presence cannot be guaranteed without admin rights; fail-closed as 'unknown'.
      iommu: 'unknown',
      uefi: 'unknown',
      secure_boot: 'unknown',
      tpm2: 'unknown',
      target_disk_identified: diskCount !== null && diskCount >= 1 ? 'available' : 'unknown',
      detected_disks_count: diskCount,
      probe_source: 'win32-cim-readonly',
    };
  } catch {
    return {
      cpu_virtualization: 'unknown',
      slat: 'unknown',
      iommu: 'unknown',
      uefi: 'unknown',
      secure_boot: 'unknown',
      tpm2: 'unknown',
      target_disk_identified: 'unknown',
      detected_disks_count: null,
      probe_source: 'win32-parse-fallback-unknown',
    };
  }
}

/**
 * Strictly read-only Linux hardware/virtualization probe via /proc and /sys.
 */
export function probeLinuxReadOnly(fsImpl = fs) {
  let cpuVirt = 'unknown';
  let slat = 'unknown';
  try {
    if (fsImpl.existsSync('/proc/cpuinfo')) {
      const cpuinfo = fsImpl.readFileSync('/proc/cpuinfo', 'utf8');
      const hasVmxOrSvm = /\b(vmx|svm)\b/.test(cpuinfo);
      const hasSlat = /\b(ept|npt)\b/.test(cpuinfo);
      cpuVirt = hasVmxOrSvm ? 'available' : 'unavailable';
      slat = hasSlat ? 'available' : hasVmxOrSvm ? 'unknown' : 'unavailable';
    }
  } catch {
    cpuVirt = 'unknown';
    slat = 'unknown';
  }

  let iommu = 'unknown';
  try {
    if (fsImpl.existsSync('/sys/class/iommu')) {
      const entries = fsImpl.readdirSync('/sys/class/iommu');
      iommu = Array.isArray(entries) && entries.length > 0 ? 'available' : 'unavailable';
    } else if (fsImpl.existsSync('/sys/kernel/iommu_groups')) {
      const groups = fsImpl.readdirSync('/sys/kernel/iommu_groups');
      iommu = Array.isArray(groups) && groups.length > 0 ? 'available' : 'unavailable';
    }
  } catch {
    iommu = 'unknown';
  }

  let uefi = 'unknown';
  try {
    uefi = fsImpl.existsSync('/sys/firmware/efi') ? 'available' : 'unavailable';
  } catch {
    uefi = 'unknown';
  }

  let tpm2 = 'unknown';
  try {
    if (fsImpl.existsSync('/sys/class/tpm/tpm0/tpm_version_major')) {
      const ver = fsImpl.readFileSync('/sys/class/tpm/tpm0/tpm_version_major', 'utf8').trim();
      tpm2 = ver === '2' ? 'available' : 'unavailable';
    } else if (fsImpl.existsSync('/sys/class/tpm')) {
      const entries = fsImpl.readdirSync('/sys/class/tpm');
      tpm2 = entries.length === 0 ? 'unavailable' : 'unknown';
    }
  } catch {
    tpm2 = 'unknown';
  }

  let targetDiskIdentified = 'unknown';
  let detectedDisksCount = null;
  try {
    if (fsImpl.existsSync('/sys/block')) {
      const blocks = fsImpl
        .readdirSync('/sys/block')
        .filter((name) => !name.startsWith('loop') && !name.startsWith('ram'));
      detectedDisksCount = blocks.length;
      targetDiskIdentified = blocks.length > 0 ? 'available' : 'unavailable';
    }
  } catch {
    targetDiskIdentified = 'unknown';
  }

  return {
    cpu_virtualization: cpuVirt,
    slat,
    iommu,
    uefi,
    secure_boot: 'unknown',
    tpm2,
    target_disk_identified: targetDiskIdentified,
    detected_disks_count: detectedDisksCount,
    probe_source: 'linux-sysfs-readonly',
  };
}

/**
 * Collects a strictly read-only host inventory for Windows or Linux.
 * Accepts optional `probeOverride` for deterministic unit and negative testing.
 */
export function collectReadOnlyInventory(options = {}) {
  const { probeOverride = null, rootPath = process.cwd() } = options;

  if (probeOverride && typeof probeOverride === 'object') {
    const platform = typeof probeOverride.platform === 'string' ? probeOverride.platform : os.platform();
    const arch = typeof probeOverride.arch === 'string' ? probeOverride.arch : os.arch();
    const cpuCores =
      typeof probeOverride.cpu_cores === 'number' && Number.isFinite(probeOverride.cpu_cores)
        ? probeOverride.cpu_cores
        : null;
    const ramTotalGb =
      typeof probeOverride.ram_total_gb === 'number' && Number.isFinite(probeOverride.ram_total_gb)
        ? probeOverride.ram_total_gb
        : null;
    const diskFreeGb =
      typeof probeOverride.disk_free_gb === 'number' && Number.isFinite(probeOverride.disk_free_gb)
        ? probeOverride.disk_free_gb
        : null;
    const diskTotalGb =
      typeof probeOverride.disk_total_gb === 'number' && Number.isFinite(probeOverride.disk_total_gb)
        ? probeOverride.disk_total_gb
        : null;

    return {
      platform,
      os_release: redactSensitiveText(String(probeOverride.os_release || os.release())),
      arch,
      cpu_model_redacted: redactSensitiveText(String(probeOverride.cpu_model || 'Generic CPU')),
      cpu_cores: cpuCores,
      ram_total_gb: ramTotalGb,
      disk_free_gb: diskFreeGb,
      disk_total_gb: diskTotalGb,
      detected_disks_count:
        typeof probeOverride.detected_disks_count === 'number' ? probeOverride.detected_disks_count : null,
      probe_source: String(probeOverride.probe_source || 'injected-fixture-readonly'),
      capabilities: {
        cpu_virtualization: normalizeCapabilityState(probeOverride.cpu_virtualization),
        slat: normalizeCapabilityState(probeOverride.slat),
        iommu: normalizeCapabilityState(probeOverride.iommu),
        uefi: normalizeCapabilityState(probeOverride.uefi),
        secure_boot: normalizeCapabilityState(probeOverride.secure_boot),
        tpm2: normalizeCapabilityState(probeOverride.tpm2),
        network_adapter: normalizeCapabilityState(
          probeOverride.network_adapter !== undefined ? probeOverride.network_adapter : 'available',
        ),
        target_disk_identified: normalizeCapabilityState(probeOverride.target_disk_identified),
      },
    };
  }

  const platform = os.platform();
  const arch = os.arch();
  const cpus = os.cpus() || [];
  const cpuCores = cpus.length > 0 ? cpus.length : null;
  const cpuModel = cpus[0]?.model ? redactSensitiveText(cpus[0].model.trim()) : 'Unbekanntes CPU-Modell';
  const totalMemBytes = os.totalmem();
  const ramTotalGb =
    Number.isFinite(totalMemBytes) && totalMemBytes > 0
      ? Math.round((totalMemBytes / 1024 ** 3) * 10) / 10
      : null;
  const diskStats = readDiskStatsSafe(rootPath);
  const netInfo = detectNetworkPresenceSafe();

  let osSpecific;
  if (platform === 'win32') {
    osSpecific = probeWindowsReadOnly();
  } else if (platform === 'linux') {
    osSpecific = probeLinuxReadOnly();
  } else {
    osSpecific = {
      cpu_virtualization: 'unknown',
      slat: 'unknown',
      iommu: 'unknown',
      uefi: 'unknown',
      secure_boot: 'unknown',
      tpm2: 'unknown',
      target_disk_identified: 'unknown',
      detected_disks_count: null,
      probe_source: 'unsupported-os-readonly',
    };
  }

  return {
    platform,
    os_release: redactSensitiveText(os.release()),
    arch,
    cpu_model_redacted: cpuModel,
    cpu_cores: cpuCores,
    ram_total_gb: ramTotalGb,
    disk_free_gb: diskStats.freeGb,
    disk_total_gb: diskStats.totalGb,
    detected_disks_count: osSpecific.detected_disks_count,
    probe_source: osSpecific.probe_source,
    capabilities: {
      cpu_virtualization: normalizeCapabilityState(osSpecific.cpu_virtualization),
      slat: normalizeCapabilityState(osSpecific.slat),
      iommu: normalizeCapabilityState(osSpecific.iommu),
      uefi: normalizeCapabilityState(osSpecific.uefi),
      secure_boot: normalizeCapabilityState(osSpecific.secure_boot),
      tpm2: normalizeCapabilityState(osSpecific.tpm2),
      network_adapter: normalizeCapabilityState(netInfo.state),
      target_disk_identified: normalizeCapabilityState(osSpecific.target_disk_identified),
    },
  };
}

/**
 * Verifies an installation medium in strictly read-only mode using SHA-256.
 */
export function verifyInstallationMediaReadOnly(mediaAttestation) {
  if (!mediaAttestation || typeof mediaAttestation !== 'object') {
    return {
      ...normalizeCapabilityState('unknown'),
      detail: 'Kein Installationsmedium zur kryptografischen Prüfung angegeben (Status: unbekannt).',
    };
  }

  if (mediaAttestation.verified === true && typeof mediaAttestation.sha256 === 'string' && /^[a-fA-F0-9]{64}$/.test(mediaAttestation.sha256)) {
    return {
      ...normalizeCapabilityState('available'),
      detail: `Installationsmedium kryptografisch bestätigt (SHA-256: ${mediaAttestation.sha256.toLowerCase().slice(0, 16)}…).`,
    };
  }

  if (mediaAttestation.verified === false) {
    return {
      ...normalizeCapabilityState('unavailable'),
      detail: 'Prüfsumme oder Signatur des Installationsmediums als ungültig gemeldet.',
    };
  }

  if (mediaAttestation.filePath && mediaAttestation.expectedSha256) {
    const expected = String(mediaAttestation.expectedSha256).trim().toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(expected)) {
      return {
        ...normalizeCapabilityState('unavailable'),
        detail: 'Erwartete SHA-256-Prüfsumme hat kein gültiges 64-Zeichen-Hex-Format.',
      };
    }
    const resolved = path.resolve(String(mediaAttestation.filePath));
    if (!fs.existsSync(resolved)) {
      return {
        ...normalizeCapabilityState('unavailable'),
        detail: `Angegebene Mediendatei existiert nicht: ${path.basename(resolved)}.`,
      };
    }
    try {
      const digest = crypto.createHash('sha256').update(fs.readFileSync(resolved)).digest('hex');
      if (digest === expected) {
        return {
          ...normalizeCapabilityState('available'),
          detail: `SHA-256-Prüfsumme von ${path.basename(resolved)} stimmt exakt überein (${digest.slice(0, 16)}…).`,
        };
      }
      return {
        ...normalizeCapabilityState('unavailable'),
        detail: `SHA-256-Abweichung bei ${path.basename(resolved)}: erwartet ${expected.slice(0, 12)}…, berechnet ${digest.slice(0, 12)}….`,
      };
    } catch {
      return {
        ...normalizeCapabilityState('unknown'),
        detail: 'Mediendatei konnte nicht lesend geprüft werden.',
      };
    }
  }

  return {
    ...normalizeCapabilityState('unknown'),
    detail: 'Unvollständige Angaben zur Medienverifikation (Fail-Closed: unbekannt).',
  };
}

/**
 * Evaluates backup and recovery attestation in fail-closed mode.
 */
export function verifyBackupAttestationReadOnly(backupAttestation) {
  if (!backupAttestation || typeof backupAttestation !== 'object') {
    return {
      ...normalizeCapabilityState('unknown'),
      detail: 'Kein externer Backup- und Wiederherstellungsnachweis hinterlegt (Status: unbekannt).',
    };
  }
  if (backupAttestation.verified === true && backupAttestation.restoreTested === true) {
    return {
      ...normalizeCapabilityState('available'),
      detail: 'Externes Backup und erfolgreicher Wiederherstellungstest sind bestätigt.',
    };
  }
  if (backupAttestation.verified === false || backupAttestation.restoreTested === false) {
    return {
      ...normalizeCapabilityState('unavailable'),
      detail: 'Backup oder Wiederherstellungstest ausdrücklich als noch nicht abgeschlossen gemeldet.',
    };
  }
  return {
    ...normalizeCapabilityState('unknown'),
    detail: 'Backup-Nachweis unvollständig (Fail-Closed: unbekannt).',
  };
}

/**
 * Main Gate-5 Preflight evaluation engine.
 * Strictly read-only and fail-closed on any 'unavailable', 'unknown', or invalid parameter.
 */
export function evaluateGate5Preflight(options = {}) {
  const timestamp = new Date().toISOString();
  const configPath = options.configPath || DEFAULT_GATE5_CONFIG_PATH;

  let config;
  try {
    config = options.configObject ? options.configObject : loadGate5Config(configPath);
    if (options.configObject) {
      validateGate5ConfigObject(config);
    }
  } catch (configErr) {
    return {
      schema_version: '0.1.0',
      gate: 'GATE-5',
      timestamp,
      mode: 'read-only',
      destructive_actions_executed: false,
      firmware_modified: false,
      bootloader_modified: false,
      installation_authorized: false,
      target_profile: String(options.profileId || 'unknown'),
      overall_status: 'BLOCKED',
      fail_closed_triggered: true,
      config_error: configErr.message,
      host_summary: null,
      capabilities: {},
      gates: [],
      blockers: [`Konfigurationsfehler (Fail-Closed): ${configErr.message}`],
      warnings: [],
      next_steps_de: [
        'Prüfe die Konfigurationsdatei config/gate5-preflight.v0.1.0.json auf gültiges JSON und schema_version "0.1.0".',
        'Es wurden keinerlei Änderungen am System vorgenommen.',
      ],
    };
  }

  const profileId = options.profileId || config.default_profile || 'qubes-whonix';
  const profile = config.profiles[profileId];

  if (!profile) {
    return {
      schema_version: '0.1.0',
      gate: 'GATE-5',
      timestamp,
      mode: 'read-only',
      destructive_actions_executed: false,
      firmware_modified: false,
      bootloader_modified: false,
      installation_authorized: false,
      target_profile: String(profileId),
      overall_status: 'BLOCKED',
      fail_closed_triggered: true,
      config_error: `Unbekanntes Zielprofil "${String(profileId)}". Erlaubt: ${Object.keys(config.profiles).join(', ')}.`,
      host_summary: null,
      capabilities: {},
      gates: [],
      blockers: [
        `Unbekanntes Zielprofil "${String(profileId)}" (Fail-Closed). Erlaubte Profile: ${Object.keys(config.profiles).join(', ')}.`,
      ],
      warnings: [],
      next_steps_de: [
        `Wähle eines der unterstützten Profile: ${Object.keys(config.profiles).join(', ')}.`,
        'Es wurden keinerlei Änderungen am System vorgenommen.',
      ],
    };
  }

  const inventory = collectReadOnlyInventory({
    probeOverride: options.probeOverride,
    rootPath: options.rootPath,
  });

  const backupStatus = verifyBackupAttestationReadOnly(options.backupAttestation);
  const mediaStatus = verifyInstallationMediaReadOnly(options.mediaAttestation);

  const supportedOs = inventory.platform === 'win32' || inventory.platform === 'linux';
  const archSupported = profile.required_arch.includes(inventory.arch);
  const coresValid =
    typeof inventory.cpu_cores === 'number' &&
    Number.isFinite(inventory.cpu_cores) &&
    inventory.cpu_cores >= profile.min_cpu_cores;
  const ramKnown = typeof inventory.ram_total_gb === 'number' && Number.isFinite(inventory.ram_total_gb) && inventory.ram_total_gb > 0;
  const diskKnown = typeof inventory.disk_free_gb === 'number' && Number.isFinite(inventory.disk_free_gb) && inventory.disk_free_gb >= 0;

  const capabilities = {
    os_support: normalizeCapabilityState(supportedOs ? 'available' : 'unavailable'),
    cpu_architecture: normalizeCapabilityState(archSupported ? 'available' : 'unavailable'),
    cpu_cores_minimum: normalizeCapabilityState(
      inventory.cpu_cores === null ? 'unknown' : coresValid ? 'available' : 'unavailable',
    ),
    cpu_virtualization: inventory.capabilities.cpu_virtualization,
    slat: inventory.capabilities.slat,
    iommu: inventory.capabilities.iommu,
    ram_minimum: normalizeCapabilityState(
      !ramKnown ? 'unknown' : inventory.ram_total_gb >= profile.min_ram_gb ? 'available' : 'unavailable',
    ),
    disk_minimum: normalizeCapabilityState(
      !diskKnown ? 'unknown' : inventory.disk_free_gb >= profile.min_free_disk_gb ? 'available' : 'unavailable',
    ),
    target_disk_identified: inventory.capabilities.target_disk_identified,
    uefi: inventory.capabilities.uefi,
    secure_boot: inventory.capabilities.secure_boot,
    tpm2: inventory.capabilities.tpm2,
    network_adapter: inventory.capabilities.network_adapter,
    backup_verified: {
      state: backupStatus.state,
      label_de: backupStatus.label_de,
    },
    media_verified: {
      state: mediaStatus.state,
      label_de: mediaStatus.label_de,
    },
    human_single_step_release: normalizeCapabilityState('unavailable'),
  };

  const gates = [];
  const blockers = [];
  const warnings = [];

  // G5-01: Lesende System- und Hardware-Inventur
  let g501State = 'PASS';
  let g501Cap = 'available';
  let g501Detail = `OS=${inventory.platform} (${inventory.arch}), CPU-Kerne=${inventory.cpu_cores ?? 'unbekannt'}, Quelle=${inventory.probe_source}.`;
  if (!supportedOs || !archSupported || (inventory.cpu_cores !== null && !coresValid)) {
    g501State = 'FAIL';
    g501Cap = 'unavailable';
    blockers.push(
      `G5-01: Betriebssystem (${inventory.platform}), Architektur (${inventory.arch}) oder Kernanzahl (${inventory.cpu_cores}) erfüllt nicht die Mindestanforderungen für ${profile.id}.`,
    );
  } else if (inventory.cpu_cores === null || !ramKnown || !diskKnown) {
    g501State = 'UNKNOWN';
    g501Cap = 'unknown';
    blockers.push('G5-01: Basis-Hardwareinventur unvollständig (Kerne, RAM oder Speicherplatz unbekannt -> Fail-Closed).');
  }
  gates.push({
    id: 'G5-01',
    title: 'Lesende System- und Hardware-Inventur',
    skill: 'hardware.inventory.read',
    required: true,
    capability_state: g501Cap,
    capability_label_de: CAPABILITY_LABELS_DE[g501Cap],
    status: g501State,
    detail: g501Detail,
  });

  // G5-02: CPU-Virtualisierung (VT-x / AMD-V / SLAT)
  const reqVirt = profile.required_capabilities.cpu_virtualization === true;
  const reqSlat = profile.required_capabilities.slat === true;
  const virtState = capabilities.cpu_virtualization.state;
  const slatState = capabilities.slat.state;
  let g502Cap = 'available';
  let g502Status = 'PASS';
  if (virtState === 'unavailable' || (reqSlat && slatState === 'unavailable')) {
    g502Cap = 'unavailable';
    g502Status = reqVirt || reqSlat ? 'FAIL' : 'PASS';
    if (g502Status === 'FAIL') {
      blockers.push(
        `G5-02: CPU-Virtualisierung (${capabilities.cpu_virtualization.label_de}) oder SLAT (${capabilities.slat.label_de}) ist für Profil "${profile.id}" erforderlich, aber nicht verfügbar.`,
      );
    } else {
      warnings.push('G5-02: CPU-Virtualisierung ist deaktiviert; für das gewählte Profil jedoch optional.');
    }
  } else if (virtState === 'unknown' || (reqSlat && slatState === 'unknown')) {
    g502Cap = 'unknown';
    g502Status = reqVirt || reqSlat ? 'UNKNOWN' : 'PASS';
    if (g502Status === 'UNKNOWN') {
      blockers.push(
        `G5-02: CPU-Virtualisierung (${capabilities.cpu_virtualization.label_de}) oder SLAT (${capabilities.slat.label_de}) konnte nicht eindeutig bestimmt werden (Fail-Closed).`,
      );
    }
  }
  gates.push({
    id: 'G5-02',
    title: 'CPU-Virtualisierung (VT-x / AMD-V / SLAT)',
    skill: 'hardware.virtualization.assess',
    required: reqVirt || reqSlat,
    capability_state: g502Cap,
    capability_label_de: CAPABILITY_LABELS_DE[g502Cap],
    status: g502Status,
    detail: `VT-x/AMD-V: ${capabilities.cpu_virtualization.label_de}, SLAT (EPT/RVI): ${capabilities.slat.label_de}.`,
  });

  // G5-03: IOMMU / VT-d / AMD-Vi Isolationsfaehigkeit
  const reqIommu = profile.required_capabilities.iommu === true;
  const iommuState = capabilities.iommu.state;
  let g503Status = 'PASS';
  if (iommuState === 'unavailable') {
    g503Status = reqIommu ? 'FAIL' : 'PASS';
    if (reqIommu) {
      blockers.push(
        `G5-03: IOMMU (VT-d / AMD-Vi) ist für "${profile.id}" zwingend erforderlich, aber nicht verfügbar.`,
      );
    } else {
      warnings.push('G5-03: IOMMU ist nicht verfügbar (für dieses Zielprofil nicht zwingend erforderlich).');
    }
  } else if (iommuState === 'unknown') {
    g503Status = reqIommu ? 'UNKNOWN' : 'PASS';
    if (reqIommu) {
      blockers.push(
        `G5-03: IOMMU-Status (VT-d / AMD-Vi) ist unbekannt. Für "${profile.id}" gilt Fail-Closed bis zur Verifikation im UEFI/BIOS oder Linux-Kernel.`,
      );
    } else {
      warnings.push('G5-03: IOMMU-Status unter aktuellem Benutzerkontext unbekannt (für dieses Profil optional).');
    }
  }
  gates.push({
    id: 'G5-03',
    title: 'IOMMU / VT-d / AMD-Vi Isolationsfähigkeit',
    skill: 'qubes.compatibility.assess',
    required: reqIommu,
    capability_state: iommuState,
    capability_label_de: capabilities.iommu.label_de,
    status: g503Status,
    detail: `IOMMU: ${capabilities.iommu.label_de} (Pflicht für Profil ${profile.id}: ${reqIommu ? 'Ja' : 'Nein'}).`,
  });

  // G5-04: Arbeitsspeicher-Schwellenwert
  const ramCap = capabilities.ram_minimum.state;
  const g504Status = ramCap === 'available' ? 'PASS' : ramCap === 'unavailable' ? 'FAIL' : 'UNKNOWN';
  if (g504Status !== 'PASS') {
    blockers.push(
      `G5-04: Arbeitsspeicher (${inventory.ram_total_gb ?? 'unbekannt'} GB) unterschreitet das Minimum von ${profile.min_ram_gb} GB für "${profile.id}" (${capabilities.ram_minimum.label_de}).`,
    );
  } else if (inventory.ram_total_gb < profile.recommended_ram_gb) {
    warnings.push(
      `G5-04: Arbeitsspeicher (${inventory.ram_total_gb} GB) erfüllt das Minimum (${profile.min_ram_gb} GB), liegt aber unter der Empfehlung (${profile.recommended_ram_gb} GB).`,
    );
  }
  gates.push({
    id: 'G5-04',
    title: 'Arbeitsspeicher-Schwellenwert für Zielprofil',
    skill: 'hardware.inventory.read',
    required: true,
    capability_state: ramCap,
    capability_label_de: capabilities.ram_minimum.label_de,
    status: g504Status,
    detail: `Erkannt: ${inventory.ram_total_gb ?? 'unbekannt'} GB (Minimum: ${profile.min_ram_gb} GB, Empfohlen: ${profile.recommended_ram_gb} GB).`,
  });

  // G5-05: Freier nicht-destruktiver Speicherplatz
  const diskCap = capabilities.disk_minimum.state;
  const g505Status = diskCap === 'available' ? 'PASS' : diskCap === 'unavailable' ? 'FAIL' : 'UNKNOWN';
  if (g505Status !== 'PASS') {
    blockers.push(
      `G5-05: Freier Speicherplatz (${inventory.disk_free_gb ?? 'unbekannt'} GB) unterschreitet das Minimum von ${profile.min_free_disk_gb} GB für "${profile.id}" (${capabilities.disk_minimum.label_de}).`,
    );
  }
  gates.push({
    id: 'G5-05',
    title: 'Freier nicht-destruktiver Speicherplatz',
    skill: 'hardware.inventory.read',
    required: true,
    capability_state: diskCap,
    capability_label_de: capabilities.disk_minimum.label_de,
    status: g505Status,
    detail: `Frei: ${inventory.disk_free_gb ?? 'unbekannt'} GB von ${inventory.disk_total_gb ?? 'unbekannt'} GB (Minimum: ${profile.min_free_disk_gb} GB).`,
  });

  // G5-06: Eindeutige Datentraeger- und Partitionsidentifikation
  const diskIdCap = capabilities.target_disk_identified.state;
  const g506Status = diskIdCap === 'available' ? 'PASS' : diskIdCap === 'unavailable' ? 'FAIL' : 'UNKNOWN';
  if (g506Status !== 'PASS') {
    blockers.push(
      `G5-06: Eindeutige Datenträgeridentifikation ist ${capabilities.target_disk_identified.label_de} (Fail-Closed).`,
    );
  }
  gates.push({
    id: 'G5-06',
    title: 'Eindeutige Datenträger- und Partitionsidentifikation',
    skill: 'hardware.inventory.read',
    required: true,
    capability_state: diskIdCap,
    capability_label_de: capabilities.target_disk_identified.label_de,
    status: g506Status,
    detail: `Erkannte physische Datenträger (lesend): ${inventory.detected_disks_count ?? 'unbekannt'} (${capabilities.target_disk_identified.label_de}).`,
  });

  // G5-07: UEFI- / Secure-Boot- und TPM-2.0-Zustandserfassung
  const reqUefi = profile.required_capabilities.uefi === true;
  const uefiCap = capabilities.uefi.state;
  let g507Status = 'PASS';
  if (uefiCap === 'unavailable' && reqUefi) {
    g507Status = 'FAIL';
    blockers.push(`G5-07: UEFI-Bootmodus ist für "${profile.id}" erforderlich, aber nicht verfügbar.`);
  } else if (uefiCap === 'unknown' && reqUefi) {
    g507Status = 'UNKNOWN';
    blockers.push(
      `G5-07: UEFI-/Secure-Boot-Status konnte im nicht-privilegierten Lesemodus nicht eindeutig verifiziert werden (Status: unbekannt -> Fail-Closed).`,
    );
  }
  gates.push({
    id: 'G5-07',
    title: 'UEFI- / Secure-Boot- und TPM-2.0-Zustandserfassung',
    skill: 'hardware.virtualization.assess',
    required: reqUefi,
    capability_state: uefiCap,
    capability_label_de: capabilities.uefi.label_de,
    status: g507Status,
    detail: `UEFI: ${capabilities.uefi.label_de}, Secure Boot: ${capabilities.secure_boot.label_de}, TPM 2.0: ${capabilities.tpm2.label_de}.`,
  });

  // G5-08: Backup- und Wiederherstellungsnachweis
  const g508Status =
    backupStatus.state === 'available' ? 'PASS' : backupStatus.state === 'unavailable' ? 'FAIL' : 'UNKNOWN';
  if (g508Status !== 'PASS') {
    blockers.push(`G5-08: ${backupStatus.detail}`);
  }
  gates.push({
    id: 'G5-08',
    title: 'Backup- und Wiederherstellungsnachweis',
    skill: 'backup.restore.verify',
    required: true,
    capability_state: backupStatus.state,
    capability_label_de: backupStatus.label_de,
    status: g508Status,
    detail: backupStatus.detail,
  });

  // G5-09: Kryptografische Verifikation der Installationsmedien
  const g509Status =
    mediaStatus.state === 'available' ? 'PASS' : mediaStatus.state === 'unavailable' ? 'FAIL' : 'UNKNOWN';
  if (g509Status !== 'PASS') {
    blockers.push(`G5-09: ${mediaStatus.detail}`);
  }
  gates.push({
    id: 'G5-09',
    title: 'Kryptografische Verifikation der Installationsmedien',
    skill: 'installation.media.verify',
    required: true,
    capability_state: mediaStatus.state,
    capability_label_de: mediaStatus.label_de,
    status: g509Status,
    detail: mediaStatus.detail,
  });

  // G5-10: Menschliche Einzelfreigabe vor jedem Schreibschritt (Im Read-Only-Preflight immer BLOCKED)
  gates.push({
    id: 'G5-10',
    title: 'Menschliche Einzelfreigabe vor jedem Schreibschritt',
    skill: 'gate5.verify',
    required: true,
    capability_state: 'unavailable',
    capability_label_de: CAPABILITY_LABELS_DE.unavailable,
    status: 'BLOCKED',
    detail:
      'Gate 5 v0.1.0 arbeitet ausschließlich im Nur-Lese-Modus (Read-Only). Automatische Partitionierung, Formatierung oder Firmware-/Bootloader-Änderungen sind technisch gesperrt.',
  });

  const priorGates = gates.slice(0, 9);
  const hasFail = priorGates.some((g) => g.status === 'FAIL');
  const hasUnknown = priorGates.some((g) => g.status === 'UNKNOWN');

  let overallStatus = 'READY_FOR_HUMAN_REVIEW';
  if (hasFail) {
    overallStatus = 'BLOCKED';
  } else if (hasUnknown) {
    overallStatus = 'REVIEW_REQUIRED';
  }

  const nextStepsDe = [];
  if (hasFail) {
    nextStepsDe.push(
      'Mindestens eine zwingende Hardware- oder Sicherheitsvoraussetzung ist "nicht verfügbar" (FAIL). Behebe die gemeldeten Blocker oder wähle ein passendes Zielprofil.',
    );
  }
  if (hasUnknown) {
    nextStepsDe.push(
      'Mindestens ein Prüfpunkt hat den Status "unbekannt" (UNKNOWN). Nach dem Fail-Closed-Prinzip bleibt jede Systemänderung gesperrt, bis alle offenen Punkte verifiziert sind.',
    );
  }
  if (!hasFail && !hasUnknown) {
    nextStepsDe.push(
      'Alle technischen Vorprüfungen G5-01 bis G5-09 sind erfüllt ("verfügbar"). Gate G5-10 hält das System weiterhin sicher im Nur-Lese-Modus bis zur manuellen Einzelfreigabe.',
    );
  }
  nextStepsDe.push(
    'Siehe docs/gate5/BEDIENUNGSANLEITUNG-GATE5.md und docs/gate5/RECOVERY-UND-WIEDERHOLUNG.md für die nächsten Schritte.',
  );

  return {
    schema_version: '0.1.0',
    gate: 'GATE-5',
    timestamp,
    mode: 'read-only',
    destructive_actions_executed: false,
    firmware_modified: false,
    bootloader_modified: false,
    installation_authorized: false,
    target_profile: profile.id,
    target_profile_label: profile.label,
    overall_status: overallStatus,
    fail_closed_triggered: hasFail || hasUnknown,
    host_summary: {
      os_platform: inventory.platform,
      os_release: inventory.os_release,
      cpu_arch: inventory.arch,
      cpu_model_redacted: inventory.cpu_model_redacted,
      cpu_cores: inventory.cpu_cores,
      ram_total_gb: inventory.ram_total_gb,
      disk_free_gb: inventory.disk_free_gb,
      disk_total_gb: inventory.disk_total_gb,
      detected_disks_count: inventory.detected_disks_count,
      probe_source: inventory.probe_source,
      serial_numbers_collected: false,
      mac_addresses_collected: false,
    },
    capabilities,
    gates,
    blockers,
    warnings,
    next_steps_de: nextStepsDe,
  };
}

/**
 * Formats a human-readable German CLI summary of the Gate-5 report.
 */
export function formatGate5ReportText(report) {
  const lines = [
    '======================================================================',
    '  EDEN LAPTOP-OS · GATE 5 UNIVERSAL HARDWARE PREFLIGHT (v0.1.0)',
    '  Modus: STRIKT LESEND (Read-Only) · Prinzip: FAIL-CLOSED',
    '======================================================================',
    `  Zeitstempel:              ${report.timestamp}`,
    `  Zielprofil:               ${report.target_profile_label || report.target_profile}`,
    `  Gesamtstatus:             ${report.overall_status}`,
    `  Installationsfreigabe:    ${report.installation_authorized ? 'JA' : 'NEIN (gesperrt)'}`,
    `  Destruktive Eingriffe:    ${report.destructive_actions_executed ? 'JA' : 'NEIN (0 Eingriffe)'}`,
    '',
  ];

  if (report.host_summary) {
    lines.push(
      '--- Host-Inventur (bereinigt, ohne Seriennummern/MAC-Adressen) ---',
      `  Betriebssystem:           ${report.host_summary.os_platform} (${report.host_summary.os_release})`,
      `  CPU-Architektur / Kerne:  ${report.host_summary.cpu_arch} / ${report.host_summary.cpu_cores ?? 'unbekannt'} Kerne`,
      `  Arbeitsspeicher (RAM):    ${report.host_summary.ram_total_gb ?? 'unbekannt'} GB`,
      `  Freier Speicherplatz:     ${report.host_summary.disk_free_gb ?? 'unbekannt'} GB (von ${report.host_summary.disk_total_gb ?? 'unbekannt'} GB)`,
      '',
    );
  }

  if (Array.isArray(report.gates) && report.gates.length > 0) {
    lines.push('--- Gate-5 Prüfmatrix (G5-01 bis G5-10) ---');
    for (const g of report.gates) {
      lines.push(
        `  [${g.id}] ${g.status.padEnd(7, ' ')} | ${g.capability_label_de.padEnd(15, ' ')} | ${g.title}`,
        `          -> ${g.detail}`,
      );
    }
    lines.push('');
  }

  if (Array.isArray(report.blockers) && report.blockers.length > 0) {
    lines.push('--- Aktive Blocker / Fail-Closed-Sperren ---');
    for (const b of report.blockers) {
      lines.push(`  [!] ${b}`);
    }
    lines.push('');
  }

  if (Array.isArray(report.next_steps_de) && report.next_steps_de.length > 0) {
    lines.push('--- Empfohlene nächste Schritte ---');
    for (const step of report.next_steps_de) {
      lines.push(`  * ${step}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Writes the Gate-5 JSON report without ever overwriting an existing file (`flag: 'wx'`).
 */
export function saveGate5Report(report, targetPath) {
  const resolved = path.resolve(targetPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, JSON.stringify(report, null, 2) + '\n', {
    encoding: 'utf8',
    flag: 'wx',
  });
  return resolved;
}
