# EDEN LAPTOP-OS — Erstanschluss & Gate-5-Entwicklungsstatus (Stand: 03.11.2026)

## 1. Geprüfter Ausgangszustand

| Parameter | Geprüfter Wert |
|:--|:--|
| Repository | `EDEN-STREET/LAPTOP-OS` |
| Produktive Basis (`main`) | `61122b8cf9e4d0768a1376232efcf039496bfd75` (`V0.8.0-preview.4`) |
| Isolierter Entwicklungszweig | `feature/gate5-universal-preflight-v0.1.0` (Draft PR #9) |
| Ausführungsmodus | `READ_ONLY` (`destructive_actions_executed: false`) |
| Sicherheitsprinzip | **Fail-Closed** bei `unavailable` (`nicht verfügbar`), `unknown` (`unbekannt`) oder Konfigurationsfehlern |
| Produktive HTML-Oberflächen (`web/*.html`) | **100 % unverändert gegenüber `main`** (kein Überschreiben produktiver Oberflächen) |

---

## 2. Gelieferte Komponenten in Gate 5 v0.1.0

| Pfad | Funktion |
|:--|:--|
| `config/gate5-preflight.v0.1.0.json` | Versionierte (`schema_version: "0.1.0"`), streng validierte Konfigurationsdatei mit 5 Zielprofilen (`qubes-whonix`, `linux-kvm`, `windows-workbench`, `tails-live`, `kali-audit`), Hardware-Schwellenwerten und Policy-Sperren |
| `lib/gate5-preflight.mjs` | Strikt lesendes Universal-Hardware-Preflight-Modul für Windows (`win32`) und Linux (`linux`) inkl. 3-Zustands-Klassifikation (`verfügbar`, `nicht verfügbar`, `unbekannt`), Redaktion sensibler Kennungen, 10-stufiger Gate-Matrix (`G5-01` bis `G5-10`) und Fail-Closed-Auswertung |
| `bin/eden.mjs` | CLI-Anbindung über `eden gate5` bzw. `eden preflight` (`--json`, `--profile=<id>`, `--config=<path>`, `--save-report=<path>`, `--strict`) |
| `tests/gate5-preflight.test.mjs` | Automatisierte Unit- und Negativtests (Windows-/Linux-Inventur, 3-Zustands-Logik, Fail-Closed bei `unknown`/`unavailable`, Konfigurationsfehler, Redaktion von Seriennummern/MAC-Adressen, CLI-Ausführung) |
| `docs/gate5/UNIVERSAL-HARDWARE-PREFLIGHT-v0.1.0.md` | Technische Spezifikation, Kompatibilitätsanforderungen und JSON-Berichtsschema |
| `docs/gate5/BEDIENUNGSANLEITUNG-GATE5.md` | Einsteigerfreundliche Schritt-für-Schritt-Bedienungsanleitung |
| `docs/gate5/RECOVERY-UND-WIEDERHOLUNG.md` | Dokumentiertes Wiederholungs-, Abbruch- und Recovery-Verfahren |

---

## 3. Eiserne Sicherheitsgrenzen

1. **Keine automatische Partitionierung oder Formatierung:** Weder `diskpart`, `bcdedit`, `efibootmgr`, `dd`, `parted`, `fdisk`, `mkfs` noch `cryptsetup` werden ausgeführt.
2. **Keine Änderungen an Firmware oder Bootloader:** UEFI/BIOS, Secure Boot und TPM 2.0 werden ausschließlich lesend abgefragt.
3. **Dreistufige Merkmalsklassifikation:** Jedes geprüfte Merkmal wird eindeutig als `available` (`verfügbar`), `unavailable` (`nicht verfügbar`) oder `unknown` (`unbekannt`) ausgewiesen.
4. **Fail-Closed:** Sobald ein Pflichtmerkmal `unavailable` oder `unknown` ist oder die Konfigurationsdatei ungültig ist, bleibt `installation_authorized: false` und der Gesamtstatus wird auf `BLOCKED` bzw. `REVIEW_REQUIRED` gesetzt.
5. **Datensparsamkeit:** Seriennummern, Mainboard-UUIDs und MAC-Adressen werden weder abgefragt noch gespeichert; eventuell in Systemstrings enthaltene Muster werden automatisch durch `[REDACTED-*]` maskiert.
