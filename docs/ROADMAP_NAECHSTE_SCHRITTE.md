# EDEN LAPTOP-OS – Roadmap mit Abnahmegrenzen

| Phase | Umsetzung | Abnahmekriterium |
|---|---|---|
| P0 | npm-Tarball-Kommando ohne Git, Preflight, Benutzerprofil-App, lokale EDEN-UI | Auf Windows 10/11 verifizierter npm-Neustart, Paket-/HTTP-/UI-Tests, kein Adminbedarf |
| P0 | GitHub-Releasefreigabe für `EDEN-STREET/LAPTOP-OS` | Branch, PR, CI, Review, Merge, veröffentlichter TAR und unveränderliche Versionierung |
| P0 | Lokale Quellen-/Lizenz- und Prüfsummenabnahme | Nur freigegebene TECHNICAL-Dateien im öffentlichen Repo, PRIVATE separat |
| P0 | Command Registry und separater Policy Broker | Versionierte Sperren, negative Tests gegen unbegründete Rechte |
| P1 | Authentisierter Read-only-Geräteadapter in Test-VM | Keine Host-/Adminrechte, reproduzierbare Statusdaten |
| P1 | Zsh/Zellij/PTY, Superfile/fzf/Navi | Isolierte Test-VM, getrennte Rechte und Timeout-/Recoverytests |
| P1 | Reversibler erster Workflow | Preflight → Zustimmung → Snapshot → Test → unabhängig prüfen → Rollback |
| P2 | Echte Laptop-Betriebssysteminstallation | Unterstützte Hardware, offizielle signierte Images, erfolgreiche Wiederherstellung, Einzelfreigabe |
| P3 | ROUTER / PIXEL in separaten Repositories | Hardware-/Firmwareprofile, GrapheneOS-Regeln, unabhängige Freigaben |

**Aktueller Stand:** Nur die lokale npm-App-Preview ist implementiert. Kein produktives Betriebssystem und keine reale Geräteänderung.

## Zusätzliche Hauptbereiche (Wiki / Handbuch / Projekte)

| Track | Nächster Gate | Test / Evidence |
|---|---|---|
| Wiki | Redaktionspipeline mit Quellen-/Lizenzfreigabe | Einträge nach Herkunft und Status nachvollziehen |
| Handbuch | Historische 21/22 Kapitel mit öffentlichen Ergänzungen abgleichen | Diff/Hash, keine Originaldatei entfernt |
| Projekt-Kanban | GitHub-Issue-/Projects-Anbindung erst nach Schnittstellenfreigabe | Derzeit nur browserlokaler JSON-Export |
| Windows/npm | Realer Windows-E2E-Test und grünes CI | `npm test`, `npm exec`, Playwright, Statusbericht |


## Phase v0.8.0-preview.5 – Ein-Kommando-App (Review)
- [x] Einmaliger lokaler Zustimmungsnachweis pro App-Build; weitere `npm start`-Ausführungen ohne Folgefragen.
- [x] Versionierte EDEN-UI und separater `PLAN_ONLY`-Qubes-/Whonix-Plan.
- [x] Fail-closed-Negativtests gegen defekte Zustimmungsdatei und unvollständige Installation.
- [x] Qubes/Whonix-Zielbild und **getrennte** Tails-Live-Architektur visuell erklärt.
- [ ] Echtes Qubes-/Tails-System installiert (**nicht Teil von npm**).
- [ ] Echte Netzwerkisolierung/Kill-Switch im Betrieb verifiziert (**noch nicht implementiert**).
- [ ] Reale Windows-Datenträger-/Backup-Verifikation und explizit gesonderte OS-Installationsfreigabe (**nicht Teil dieses PRs**).

[Technische Anleitung](EIN-KOMMANDO-START.md) · [Virtuelle Tests](VM-TESTMATRIX.md)


## Neue Phase v0.8.0-preview.6 – Reboot-Gates / Planung

- [x] G0–G7 als versionierte, **nicht ausführbare** Qubes-Migrationskette dokumentiert.
- [x] Neuer npm-Befehl `eden reboot-plan` mit JSON und gesperrter Strict-Bewertung.
- [x] Neue Oberfläche `web/reboot-plan.html` und getrennte Architekturvisualisierung.
- [x] Prüflogik verwechselt freien Workspace-Speicher nicht mit einem verifizierten Zielmedium.
- [x] Negative Regressionstests für konfigurierbare Pflichtgates und fingierte Nachweise.
- [ ] Echte, unabhängige Hardwareeignungsprüfung / Recovery-Nachweis.
- [ ] Echter Reboot in offiziell signierte Installationsumgebung (nicht Teil dieses Releases).
- [ ] Tatsächliche Qubes-/Whonix-Installation und Live-Tor-Leak-Tests (nicht Teil dieses Releases).

[Dokumentierter Workflow](REBOOT-TO-INSTALLER-WORKFLOW.md)


## Gate 5 – aktualisierte Hauptzweig-Integration

- [x] Read-only Windows-/Linux-Preflight mit zehn versionierten Gates und drei Zuständen.
- [x] Fail-closed bei untrusted Medienmanifest, Restore-Datei und ungeprüften Zielmedienangaben.
- [x] Separates Maschinendatenformat und gemeinsamer 10+8-Bericht mit Reboot-Plan.
- [ ] Verlässliche externe Signatur-/Provenienzprüfung der offiziellen Qubes-Installationsmedien.
- [ ] Tatsächliche Backup-Restore-Abnahme und geräteseitig bestätigte Zielmedieninventur.
- [ ] Echte Installation/Reboot nur nach unabhängiger Hardware- und Freigabeprüfung.
