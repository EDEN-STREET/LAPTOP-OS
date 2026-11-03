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
