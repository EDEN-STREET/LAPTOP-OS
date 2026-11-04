# EDEN Reboot-to-Installer – versionierter Sicherheitsworkflow v0.1.0

**Umsetzungsstand:** Lesende Planung und UI-Darstellung. **KEINE** automatisierte Windows-Löschung, **KEIN** Neustart, **KEINE** Installation oder Netzwerkkonfiguration.

Der bestehende `npm start`-Befehl startet EDEN weiterhin lokal und verlangt nur die einmalige Freigabe für die EDEN-Browser-App. Er ist **keine** Zustimmung zum Austausch des Betriebssystems.

## 1. Zielarchitektur

```text
Gegenwärtiges Windows: unverändert
    ↓ EDEN npm; nur lokale App
G0  Lesende Grunddaten
G1  Unabhängiger Qubes-Hardware-/IOMMU-Nachweis
G2  Vertrauenswürdiger Qubes-ISO-/Signaturnachweis
G3  Unabhängiger Backup- und Restore-Nachweis
G4  Eindeutige Zielmedien-/Bestandsschutzprüfung
G5  Gesonderte ausdrückliche Installationsentscheidung
G6  Später: offizielle Boot-/Installationsumgebung
G7  Später: Qubes mit Whonix, Tor-Routing und Leakage-Verifikation

Tails: getrenntes Live-System, nicht die Basis von sys-whonix.
```

**Aktuelle Implementierung:** G0 gibt lesende Basisindikatoren aus; G1 bis G7 bleiben ohne unabhängigen Hardware- und Sicherheitsnachweis `NOT_VERIFIED` beziehungsweise `NOT_IMPLEMENTED`. **Kein Schritt löst in dieser Version einen Neustart aus.**

## 2. Verifizierte externe Architekturgrundlage

Die Qubes-Dokumentation bezeichnet ihre Hardwarekriterien ausdrücklich als **notwendig, nicht hinreichend**. Relevant sind insbesondere x86-64, Virtualisierung mit zweiter Adressübersetzung (EPT/RVI), IOMMU (VT-d/AMD-Vi), ausreichend RAM und ein geeigneter Datenträger. Die im Konfigurationsfile verwendeten Mindestindikatoren lauten 6 GiB RAM und 32 GiB frei; die Orientierung für eine empfohlene Konfiguration 16 GiB RAM und 128 GiB. Diese Zahlen dürfen in benutzerdefinierten Konfigurationen **nicht abgesenkt** werden. Eine Anzeige von 32 GiB RAM allein beweist keine Qubes-Kompatibilität.

- [Qubes System Requirements](https://www.qubes-os.org/doc/system-requirements/)
- [Qubes Installation Guide](https://www.qubes-os.org/doc/InstallationGuide/)
- [Qubes Hardware Compatibility List](https://www.qubes-os.org/hcl/)
- [Qubes Signature Verification](https://doc.qubes-os.org/en/r4.3/project-security/verifying-signatures.html)

Qubes wird regulär als eigenständiges Hostsystem betrieben. Die Tests dieser EDEN-Version verwenden isolierte Windows-/Linux-CI-Prozesse **anstelle** einer wirklichen Qubes-Installation.

## 3. Reproduzierbare Befehle (ausschließlich lesend)

Im Repository:

```bash
npm ci
npm run reboot:plan
node bin/eden.mjs reboot-plan --json
npm run test:reboot
```

Mit `--json` wird der Bericht maschinenlesbar ausgegeben, ohne Dateien anzulegen.

Optional: `node bin/eden.mjs reboot-plan --save-plan` erstellt **nur nach diesem gesondert angegebenen Flag** eine neue Plan-JSON-Datei im EDEN-Benutzerverzeichnis unter `state/reboot-plan-v0.1.0.json`. Der `wx`-Modus verhindert automatisches Überschreiben.

Mit `--strict` endet die reine Freigabeprüfung bewusst mit Exit-Code `3` = `BLOCKED_INDEPENDENT_REVIEW_REQUIRED`. Ohne `--strict` bedeutet Exit `0` lediglich, dass die **lesende Berichtserstellung erfolgreich war**; keinesfalls Installationsbereitschaft.

Die lokal gespeicherte einmalige App-Zustimmung ist dafür unzureichend und wird nicht als Installationsfreigabe verwendet.

## 4. Einstellbare und feste Parameter

Datei: `config/reboot-workflow.v0.1.0.json`.

- Hardware-Mindestwerte dürfen angehoben, aber nicht unterschritten werden.
- Offizielle Informationsquellen sind mit HTTPS angegeben.
- Die acht unabhängigen Pflichtgates dürfen nicht entfernt werden.
- `allow_disk_mutations`, `allow_firmware_mutations`, `allow_boot_changes`, `allow_automatic_reboot`, `allow_windows_removal` sind ausschließlich `false`.
- Der Installer und die Neustart-Engine bleiben ausdrücklich `NOT_IMPLEMENTED`.

Manipulierte Konfigurationen brechen mit Fehler ab.

## 5. Qualitätsprüfung, negative Tests und Recovery

`tests/reboot-plan.test.mjs` überprüft u.a.:
- ausreichenden und unzureichenden RAM sowie falsche CPU-Architektur;
- keine falschen Freigaben bei selbst behaupteten Backups, Signaturen und Datenträgern;
- unveränderte Sentinel-Datei im simulierten Windows-Benutzerordner;
- fehlende Schreibaktionen bei `--json`;
- nur einmaliges Plan-Speichern, kein Überschreiben;
- strikten Nichtfreigabe-Exit-Code und unveränderte Netzwerk-/Firmware-Sperren;
- lokalen HTTP-Aufruf der Gate-UI ohne Schreibendpunkt.

Weitere Schritte nur nach **echter Geräteeignung, erfolgreichem Backup-Restore, unabhängiger Prüfung offizieller Installationsmedien und gesonderter Zustimmung**. EDEN implementiert hier weder die entsprechenden Befehle noch deren Umgehung.

**Rollback:** Vor Merge den PR schließen. Nach Merge den Merge-Commit gezielt revertieren. Benutzerdateien werden nicht automatisiert entfernt.

## 6. Wichtige Begrenzung

Der Reboot-Plan kann nur die vorhandene Grundinventur lesen, nicht eine echte Qubes-Installation oder einen Tor-Kill-Switch validieren. Erst in einer späteren, separat freigegebenen Hardware-Testphase können Qubes-/Whonix- und Tor-Netzwerkeigenschaften geprüft werden. Eine Aussage wie „nur sichere Verbindung“ kann nicht pauschal garantiert werden.
