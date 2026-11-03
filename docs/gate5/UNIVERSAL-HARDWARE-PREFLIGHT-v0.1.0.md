# EDEN LAPTOP-OS — Gate 5: Universal Hardware Preflight v0.1.0

**Version:** `0.1.0`  
**Status:** Isoliertes, strikt lesendes Vorprüfungsmodul (Draft PR #9)  
**Basis-Commit (`main`):** `61122b8cf9e4d0768a1376232efcf039496bfd75`  
**Konfigurationsdatei:** `config/gate5-preflight.v0.1.0.json`  
**Implementierung:** `lib/gate5-preflight.mjs`

---

## 1. Zweck und Sicherheitsarchitektur

Das Modul **Universal Hardware Preflight (Gate 5)** prüft vor jeder späteren Systemeinrichtung im **reinen Lesemodus (`read-only`)**, ob ein Windows- oder Linux-Laptop die technischen und sicherheitsrelevanten Voraussetzungen für das gewählte EDEN-Zielprofil erfüllt.

### Unveränderliche Sicherheitsgarantien

- **Keine destruktiven Systemeingriffe:** `destructive_actions_executed` ist technisch fest auf `false` verriegelt.
- **Keine Firmware- oder Bootloader-Eingriffe:** `firmware_modified: false`, `bootloader_modified: false`.
- **Keine automatische Installationsfreigabe:** `installation_authorized: false`. Gate `G5-10` bleibt im Vorprüfungsmodul dauerhaft `BLOCKED`.
- **Fail-Closed-Logik:** Unbekannte (`unknown`), fehlende (`unavailable`) oder fehlerhafte Konfigurationswerte führen niemals zu einer stillschweigenden Annahme, sondern sperren den Fortschritt (`BLOCKED` oder `REVIEW_REQUIRED`).

---

## 2. Dreistufiges Zustandsmodell (`available` / `unavailable` / `unknown`)

Jede Hardware- und Systemeigenschaft wird in genau einen von drei definierten Zuständen überführt:

| Technischer Wert (`state`) | Deutsche Bezeichnung (`label_de`) | Bedeutung & Auswirkung im Fail-Closed-Modus |
|:--|:--|:--|
| `available` | `verfügbar` | Voraussetzung wurde lesend geprüft und eindeutig als vorhanden/erfüllt nachgewiesen. |
| `unavailable` | `nicht verfügbar` | Voraussetzung wurde geprüft und ist nachweislich nicht erfüllt oder im BIOS/UEFI deaktiviert. Führt bei Pflichtmerkmalen zu `FAIL` und Gesamtstatus `BLOCKED`. |
| `unknown` | `unbekannt` | Voraussetzung konnte ohne erhöhte Rechte oder wegen fehlender Kernel-/ACPI-Schnittstellen nicht zweifelsfrei ermittelt werden. Führt bei Pflichtmerkmalen zu `UNKNOWN` und verhindert jede Freigabe (`REVIEW_REQUIRED` / Fail-Closed). |

---

## 3. Dokumentierte Virtualisierungs- und Kompatibilitätsanforderungen je Zielprofil

Die Schwellenwerte sind versioniert in `config/gate5-preflight.v0.1.0.json` hinterlegt:

| Profil-ID | Zielsystem | Min. RAM (Empf.) | Min. Frei-Speicher | CPU-Kerne | Architektur | VT-x / AMD-V | SLAT (EPT/RVI) | IOMMU (VT-d/AMD-Vi) | UEFI |
|:--|:--|:--|:--|:--|:--|:--|:--|:--|:--|
| `qubes-whonix` | Qubes OS 4.2 + Whonix | 16 GB (32 GB) | 128 GB | 4 | `x64` | Pflicht | Pflicht | **Pflicht** | Pflicht |
| `linux-kvm` | Linux Host + KVM/QEMU + EDEN-Term | 8 GB (16 GB) | 64 GB | 4 | `x64`, `arm64` | Pflicht | Pflicht | Optional | Pflicht |
| `windows-workbench` | Windows 11 + EDEN-Term Workbench | 8 GB (16 GB) | 20 GB | 2 | `x64`, `arm64` | Optional | Optional | Optional | Optional |
| `tails-live` | Tails OS Live-USB (Amnesisch) | 4 GB (8 GB) | 16 GB | 2 | `x64` | Optional | Optional | Optional | Pflicht |
| `kali-audit` | Kali Linux Isoliertes Audit-Profil | 8 GB (16 GB) | 40 GB | 2 | `x64`, `arm64` | Pflicht | Optional | Optional | Pflicht |

---

## 4. Die 10 verbindlichen Prüftore (`G5-01` bis `G5-10`)

| Gate-ID | Prüfpunkt | Zugeordneter Skill | Fail-Closed-Bedingung |
|:--|:--|:--|:--|
| `G5-01` | Lesende System- und Hardware-Inventur | `hardware.inventory.read` | Blockiert bei nicht unterstütztem OS, falscher CPU-Architektur oder unlesbaren Basiswerten |
| `G5-02` | CPU-Virtualisierung (`VT-x` / `AMD-V` / `SLAT`) | `hardware.virtualization.assess` | Blockiert für Virtualisierungsprofile, wenn `unavailable` oder `unknown` |
| `G5-03` | IOMMU / `VT-d` / `AMD-Vi` Isolationsfähigkeit | `qubes.compatibility.assess` | Zwingend für `qubes-whonix`; blockiert bei `unavailable` oder `unknown` |
| `G5-04` | Arbeitsspeicher-Schwellenwert | `hardware.inventory.read` | Blockiert, wenn `ram_total_gb < min_ram_gb` oder unlesbar |
| `G5-05` | Freier nicht-destruktiver Speicherplatz | `hardware.inventory.read` | Blockiert, wenn `disk_free_gb < min_free_disk_gb` oder unlesbar |
| `G5-06` | Eindeutige Datenträger- und Partitionsidentifikation | `hardware.inventory.read` | Blockiert, wenn kein eindeutiger Datenträger lesend erkannt wurde |
| `G5-07` | UEFI- / Secure-Boot- und TPM-2.0-Zustandserfassung | `hardware.virtualization.assess` | Blockiert bei UEFI-Pflichtprofilen, wenn UEFI `unavailable` oder `unknown` ist |
| `G5-08` | Backup- und Wiederherstellungsnachweis | `backup.restore.verify` | Blockiert ohne verifizierten Backup- und Restore-Nachweis |
| `G5-09` | Kryptografische Verifikation der Installationsmedien | `installation.media.verify` | Blockiert ohne gültige 64-stellige SHA-256-Prüfsumme des Zielmediums |
| `G5-10` | Menschliche Einzelfreigabe vor jedem Schreibschritt | `gate5.verify` | In v0.1.0 technisch fest auf `BLOCKED` (`installation_authorized: false`) |

---

## 5. Maschinenlesbarer JSON-Bericht (`schema_version: "0.1.0"`)

Aufruf über die Kommandozeile:

```bash
node bin/eden.mjs gate5 --json --profile=qubes-whonix
```

Beispielstruktur des erzeugten Berichts:

```json
{
  "schema_version": "0.1.0",
  "gate": "GATE-5",
  "timestamp": "2026-11-03T20:15:00.000Z",
  "mode": "read-only",
  "destructive_actions_executed": false,
  "firmware_modified": false,
  "bootloader_modified": false,
  "installation_authorized": false,
  "target_profile": "qubes-whonix",
  "overall_status": "REVIEW_REQUIRED",
  "fail_closed_triggered": true
}
```
