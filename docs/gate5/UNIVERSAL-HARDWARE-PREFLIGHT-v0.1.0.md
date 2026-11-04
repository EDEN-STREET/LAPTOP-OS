# EDEN LAPTOP-OS — Gate 5: Universal Hardware Preflight v0.1.0

**Version:** `0.1.0`  
**Status:** Isoliertes, strikt lesendes Diagnose- und Vorprüfungsmodul (Draft PR #9)  
**Basis-Commit (`main`):** `61122b8cf9e4d0768a1376232efcf039496bfd75`  
**Konfigurationsdatei:** `config/gate5-preflight.v0.1.0.json`  
**Implementierung:** `lib/gate5-preflight.mjs`

---

## 1. Zweck und Sicherheitsarchitektur

Das Modul **Universal Hardware Preflight (Gate 5)** untersucht im **reinen Lesemodus (`read-only`)**, inwieweit ein Windows- oder Linux-System die technischen Voraussetzungen für ein gewähltes EDEN-Zielprofil erfüllt.

### Unveränderliche Sicherheitsgarantien

- **Keine destruktiven Systemeingriffe:** `destructive_actions_executed` ist technisch fest auf `false` verriegelt.
- **Keine Firmware- oder Bootloader-Eingriffe:** `firmware_modified: false`, `bootloader_modified: false`.
- **Keine automatische Installationsfreigabe:** `installation_authorized: false`. Gate `G5-10` bleibt im Vorprüfungsmodul dauerhaft `BLOCKED`.
- **Unveränderliche Sicherheitsuntergrenzen (`IMMUTABLE_PROFILE_MINIMUMS`):** Benutzerdefinierte Konfigurationen können verpflichtende Sicherheitsmerkmale (wie `iommu: true` bei `qubes-whonix`) oder Mindestschwellenwerte für RAM, Speicherplatz und physische CPU-Kerne nicht abschwächen.
- **Keine Akzeptanz ungeprüfter Selbstauskünfte:** Bloße Flags wie `{ verified: true }` ohne reale, per Streaming-SHA-256 geprüfte Datei und Provenienz-Manifest werden stets als `unknown` (`unbekannt`) bewertet.
- **Strikter CLI-Modus (`--strict`):** Gibt für jeden nicht vollständig abgeschlossenen Prüfstatus (`BLOCKED`, `REVIEW_REQUIRED` / `UNKNOWN`) einen Exit-Code `!= 0` zurück.

---

## 2. Dreistufiges Zustandsmodell (`available` / `unavailable` / `unknown`)

| Technischer Wert (`state`) | Deutsche Bezeichnung (`label_de`) | Bedeutung & Auswirkung im Fail-Closed-Modus |
|:--|:--|:--|
| `available` | `verfügbar` | Der Indikator oder Schwellenwert wurde durch lesende Betriebssystemabfrage bzw. Streaming-Hash-/Manifest-Abgleich bestätigt. |
| `unavailable` | `nicht verfügbar` | Voraussetzung ist unterschritten, fehlt oder ist deaktiviert. Führt bei Pflichtmerkmalen zu `FAIL` und Gesamtstatus `BLOCKED`. |
| `unknown` | `unbekannt` | Voraussetzung konnte ohne erhöhte Rechte nicht zweifelsfrei ermittelt werden oder liegt nur als ungeprüfte Selbstauskunft vor. Führt bei Pflichtmerkmalen zu `UNKNOWN` (`REVIEW_REQUIRED` / Fail-Closed). |

---

## 3. Dokumentierte Virtualisierungs- und Kompatibilitätsanforderungen je Zielprofil

| Profil-ID | Zielsystem | Min. RAM (Empf.) | Min. Frei-Speicher | Min. physische CPU-Kerne | Architektur | VT-x / AMD-V | SLAT (EPT/RVI) | IOMMU (VT-d/AMD-Vi) | UEFI |
|:--|:--|:--|:--|:--|:--|:--|:--|:--|:--|
| `qubes-whonix` | Qubes OS 4.2 + Whonix | 16 GB (32 GB) | 128 GB (Zieldisk) | 4 | `x64` | Pflicht | Pflicht | **Pflicht** | Pflicht |
| `linux-kvm` | Linux Host + KVM/QEMU + EDEN-Term | 8 GB (16 GB) | 64 GB (Zieldisk) | 4 | `x64`, `arm64` | Pflicht | Pflicht | Optional | Pflicht |
| `windows-workbench` | Windows 11 + EDEN-Term Workbench | 8 GB (16 GB) | 20 GB (Workspace) | 2 | `x64`, `arm64` | Optional | Optional | Optional | Optional |
| `tails-live` | Tails OS Live-USB (Amnesisch) | 4 GB (8 GB) | 16 GB (Zielmedium) | 2 | `x64` | Optional | Optional | Optional | Pflicht |
| `kali-audit` | Kali Linux Isoliertes Audit-Profil | 8 GB (16 GB) | 40 GB (Zieldisk) | 2 | `x64`, `arm64` | Pflicht | Optional | Optional | Pflicht |

---

## 4. Die 10 verbindlichen Prüftore (`G5-01` bis `G5-10`) & Technische Prüfgrenzen

| Gate-ID | Prüfpunkt | Technische Umsetzung & bekannte Grenzen des Read-Only-Scans |
|:--|:--|:--|
| `G5-01` | Lesende System- und Hardware-Inventur | Trennt **physische CPU-Kerne** (`cpu_physical_cores` via CIM `NumberOfCores` bzw. `/proc/cpuinfo` `core id`) strikt von logischen SMT-Threads (`os.cpus().length`). Ist die physische Kernanzahl nicht ermittelbar, bleibt `G5-01` `UNKNOWN`. |
| `G5-02` | CPU-Virtualisierung (`VT-x` / `AMD-V` / `SLAT`) | Prüft `Win32_Processor` bzw. `/proc/cpuinfo` (`vmx`/`svm`, `ept`/`npt`). |
| `G5-03` | IOMMU / `VT-d` / `AMD-Vi` Isolationsfähigkeit | Prüft `/sys/class/iommu` bzw. `/sys/kernel/iommu_groups` unter Linux. Unter Windows im normalen Benutzerkontext ohne Admin-Zugriff auf ACPI-`DMAR`/`IVRS`-Tabellen grundsätzlich `unknown` (`Fail-Closed`). |
| `G5-04` | Arbeitsspeicher-Schwellenwert | Prüft `os.totalmem()` gegen `min_ram_gb`. |
| `G5-05` | Freier nicht-destruktiver Speicherplatz | Trennt freien Speicher im Arbeitsverzeichnis-Dateisystem (`workspace_fs_free_gb` via `fs.statfsSync`) vom freien Speicher auf einem dedizierten Zieldatenträger (`target_disk_free_gb`). Für OS-Profile ohne verifiziertes Zielmedium bleibt `G5-05` `UNKNOWN`. |
| `G5-06` | Eindeutige Datenträger- und Partitionsidentifikation | Bloße Erkennung von Host-Laufwerken (`DiskCount >= 1` oder `/sys/block`) setzt `G5-06` **nicht** auf `PASS`, sondern belässt den Status auf `UNKNOWN`, solange kein dediziertes Nicht-System-Zielmedium samt Partitionslayout verifiziert ist. |
| `G5-07` | UEFI- / Secure-Boot- und TPM-2.0-Zustandserfassung | Prüft `/sys/firmware/efi` und `/sys/class/tpm/tpm0/tpm_version_major` unter Linux; unter nicht-privilegiertem Windows `unknown`. |
| `G5-08` | Backup- und Wiederherstellungsnachweis | Akzeptiert keine ungeprüfte Selbstauskunft (`{ verified: true }`); verlangt einen per Streaming-SHA-256 prüfbaren Nachweis oder bleibt `UNKNOWN`. |
| `G5-09` | Kryptografische Verifikation der Installationsmedien | Nutzt **64-KiB-Streaming-SHA-256** (`computeFileSha256Chunked`, kein `readFileSync` kompletter ISO-Dateien) und trennt Dateihash-Abgleich (`hash_match`) von der Manifest-Provenienz (`provenance_verified`). Selbstauskünfte ohne Datei bleiben `UNKNOWN`. |
| `G5-10` | Menschliche Einzelfreigabe vor jedem Schreibschritt | In Gate 5 v0.1.0 dauerhaft `BLOCKED` (`installation_authorized: false`). |


## Präzisierung der Nachweisgrenzen (EDEN Integration)

- Ein lokaler SHA-256-Abgleich beweist nur Gleichheit mit einem Vergleichswert. Wenn Prüfmanifest und Referenzhash vom selben Aufrufer stammen, ist **keine unabhängige Herausgeber- oder Signaturprüfung** erfolgt. Der Status bleibt `UNKNOWN`.
- Eine selbst erzeugte Restore-Nachweisdatei mit passendem Hash beweist **keinen realen Restore-Test**. Der Status bleibt `UNKNOWN`.
- Durch Eingaben behauptete Geräte-ID, Partitionsübersicht und freie Kapazität beweisen **keine OS-seitig bestätigte Zieldatenträgerzuordnung**. Der Status bleibt `UNKNOWN`.
- `--strict` ist eine **Readiness-Sperre** und darf keinen Erfolg für eine nicht unabhängig überprüfte Installation melden. Der normale Exit-Code 0 bedeutet nur, dass der Bericht erzeugt wurde.
- Qubes/Whonix und Tails bleiben getrennte Zielumgebungen. Die Qubes-Dokumentation: https://www.qubes-os.org/doc/system-requirements/ und https://www.qubes-os.org/doc/InstallationGuide/.
