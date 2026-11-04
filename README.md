# 🟢 EDEN LAPTOP-OS – EDEN Suite Projektbereich

**LAPTOP-OS ist ein Modul von EDEN Suite unter der Dachmarke EDEN STREET.** Die vorhandenen npm- und Browser-Demos bleiben erhalten. Der Universal-OS-Installer ist noch nicht implementiert.

[🌐 Live-Vorschau (GitHub Pages)](https://eden-street.github.io/.github/preview.html?surface=terminal) · [📘 Dokumentation](https://github.com/EDEN-STREET/.github/blob/main/docs/EDEN-STREET-MASTERDOKUMENTATION.md) · [📚 Wiki](https://github.com/EDEN-STREET/.github/blob/main/docs/WIKI.md) · [🖥️ UI-Vorschauen](docs/EDEN-SUITE-VORSCHAU.md) · [🔁 Workflows](docs/WORKFLOW-REFERENZEN.md) · [🤖 llms.txt](llms.txt) · [🛡️ Issues](https://github.com/EDEN-STREET/LAPTOP-OS/issues)

[![LAPTOP-OS Projektvorschau – schematisches SVG](https://raw.githubusercontent.com/EDEN-STREET/.github/main/docs/media/previews/laptop.svg)](https://eden-street.github.io/.github/preview.html?surface=terminal)

### Vorschauen und reproduzierbare Workflows

| EDEN-Term | Setup | Builder |
|---|---|---|
| [![EDEN-Term](https://raw.githubusercontent.com/EDEN-STREET/.github/main/docs/media/previews/terminal.svg)](https://eden-street.github.io/.github/preview.html?surface=terminal) | [![EDEN Setup](https://raw.githubusercontent.com/EDEN-STREET/.github/main/docs/media/previews/setup.svg)](https://eden-street.github.io/.github/preview.html?surface=setup) | [![EDEN Builder](https://raw.githubusercontent.com/EDEN-STREET/.github/main/docs/media/previews/builder.svg)](https://eden-street.github.io/.github/preview.html?surface=builder) |

| LAPTOP-OS Preflight | Universal Bootstrap |
|---|---|
| [![Preflight Workflow](https://raw.githubusercontent.com/EDEN-STREET/.github/main/docs/media/workflows/WF-09.svg)](https://eden-street.github.io/.github/workflow.html?id=09) | [![Bootstrap Workflow](https://raw.githubusercontent.com/EDEN-STREET/.github/main/docs/media/workflows/WF-12.svg)](https://eden-street.github.io/.github/workflow.html?id=12) |

**[Öffentliches EDEN Suite Portal](https://eden-street.github.io/.github/)** · **[Alle 17 Workflows und zugehörigen Agenten-Aufträge](https://github.com/EDEN-STREET/.github/blob/main/docs/prompts/README.md)**

> **Status der Bilder:** Skalierbare Illustrationen, keine realen Screenshots. Die interaktiven HTML-Vorschauen unter `https://eden-street.github.io/.github/` sind reine **DEMO-Simulationen** ohne Geräteverbindung. Keine echte OS-Installation und kein Router-/Firmwareeingriff.

---

## Gate 5 – integrierte, rein lesende Hardwareprüfung (v0.8.0-preview.7)

`npm run gate5` prüft CPU-Kerne, Virtualisierungsindikatoren, IOMMU, RAM, Datenträgerstatus und Nachweislücken. Mit `node bin/eden.mjs gate5 --json --strict` werden unbestätigte Voraussetzungen konsequent als Nichtfreigabe gewertet.

`node bin/eden.mjs assess --json` kombiniert **10 Hardware-Gates** mit den **8 Reboot-to-Installer-Stufen** zu einem Berichtsobjekt. Ein Exit-Code `0` ohne `--strict` bedeutet nur, dass der Bericht erfolgreich erstellt wurde.

**Unabhängige Quellen:** Ein vom selben Aufrufer erzeugtes Prüfmanifest, eine Restore-Datei oder ein Datenträgertext dürfen den Status `UNKNOWN` nicht auf `PASS` anheben. Es existiert kein echter Installations- oder Neustartbefehl. `EDEN_LAPTOP_OS` bleibt ein lokaler Nutzer-App-Starter.

[Gate-5-Anleitung](docs/gate5/BEDIENUNGSANLEITUNG-GATE5.md) · [Reboot-Plan](docs/REBOOT-TO-INSTALLER-WORKFLOW.md) · [Testmatrix](docs/VM-TESTMATRIX.md)

---

## Neuer Reboot-to-Installer-Plan (v0.8.0-preview.7)

**Lesende Planung für einen späteren Qubes-Neustart**: acht Sicherheitsgates G0–G7, unveränderliche Sperren für Laufwerk, Firmware und Windows, maschinenlesbarer JSON-Status und eine zusätzliche lokale Workflow-Vorschau.

```bash
npm run reboot:plan
node bin/eden.mjs reboot-plan --json
```

Ein explizites `--save-plan` speichert **nur einen neuen JSON-Bericht**, nie eine Installationsdatei und nie einen Bootauftrag. Die Installation wird **nicht** automatisch ausgeführt. Ein vorhandener Windows-Datenträger, Qubes-Hardwarekompatibilität, Backup-Restore und die Echtheit eines Installationsabbilds können von einem npm-Plan allein nicht belegt werden.

[Reboot-Workflow und Recovery](docs/REBOOT-TO-INSTALLER-WORKFLOW.md) · [Lokale UI-Vorschau](web/reboot-plan.html) · [VM-Testmatrix](docs/VM-TESTMATRIX.md).

---

## Neues sicheres Ein-Kommando-Setup (v0.8.0-preview.7)

**Aus einem lokalen Repo:** `npm start` (oder `npm run go`).

Bei der ersten Ausführung fragt EDEN **genau einmal** nach Zustimmung für die **lokale Browser-App**. Es kopiert die App in ein versionsgebundenes Benutzerverzeichnis, erzeugt bei Bedarf einen **rein dokumentarischen Qubes/Whonix-Plan** und öffnet die Weboberfläche automatisch. Spätere Starts derselben Version verwenden die vorhandene lokale Zustimmung.

**Dies löscht Windows nicht.** Die npm-App installiert weder Qubes noch Tails noch einen Tor-Kill-Switch. Tails ist ein getrennt gestartetes Live-System; Qubes verwendet für Tor üblicherweise Whonix mit `sys-whonix` und `anon-whonix`. Der reale Netzwerkschutz bleibt bis zu eigenen Tests **nicht verifiziert**.

[Ein-Kommando-Bedienungsanleitung](docs/EIN-KOMMANDO-START.md) · [Virtuelle Testmatrix](docs/VM-TESTMATRIX.md) · [Visualisierung der Netzwerkarchitektur](web/security-architecture.html)

---

## Bestehender LAPTOP-OS-Schnellstart

**V0.8.0-preview.7 · EDEN-Term UI · geführter, nicht-destruktiver Einstieg**

> Die npm-Version installiert eine **lokale EDEN-Browseranwendung und einen Einrichtungsassistenten**. Sie ersetzt **nicht** Windows, Kali, Tails oder Qubes OS und verändert weder Partitionen noch Firmware. Reale OS-Installation erfordert später separate Hardwareprüfung, Backup, offizielle Installationsmedien und Freigabe.

## Ein Befehl in der Windows-Eingabeaufforderung (CMD)

Nachdem **dieses Projekt** im GitHub-Repository `EDEN-STREET/LAPTOP-OS` veröffentlicht wurde:

```cmd
npm exec --yes --package=https://github.com/EDEN-STREET/LAPTOP-OS/archive/refs/heads/main.tar.gz -- eden
```

Dieser Befehl lädt den GitHub-Quellcode **direkt als Tarball über npm**. **Git muss dafür nicht installiert sein.** `npm exec` startet den EDEN-Assistenten aus dem heruntergeladenen Paket. Nach der **einmaligen** Zustimmung zur lokalen EDEN-App legt er die neue Version im Benutzerverzeichnis an, speichert bei Bedarf automatisch einen reinen Qubes/Whonix-Plan und öffnet die **lokale EDEN-Term-Workbench**. Bei erneuten Starts derselben Version ist keine weitere Zustimmung nötig.

**Voraussetzung:** Auf Windows 10/11 muss Node.js 22 oder neuer inklusive npm bereits installiert sein. Ohne npm lässt sich kein npm-Befehl ausführen. Node.js bitte von [nodejs.org](https://nodejs.org/) installieren und CMD neu öffnen.

**Veröffentlichungsstatus:** Der npm-Starter wurde mit PR #2 auf `main` übernommen. Das Wiki-/Handbuch-/Kanban-Update ist integriert. Der GitHub-Tarball-Start setzt weiterhin Node.js/npm und einen erreichbaren GitHub-Branch voraus.

### Zusätzliche Funktionen (weiterhin nur npm)

```cmd
npm exec --yes --package=https://github.com/EDEN-STREET/LAPTOP-OS/archive/refs/heads/main.tar.gz -- eden doctor
npm exec --yes --package=https://github.com/EDEN-STREET/LAPTOP-OS/archive/refs/heads/main.tar.gz -- eden launch
npm exec --yes --package=https://github.com/EDEN-STREET/LAPTOP-OS/archive/refs/heads/main.tar.gz -- eden status
```

`doctor`: nur lesen. `launch`: Browser starten ohne Dateien im Benutzerprofil zu schreiben. `status`: bestehenden Installationsplan anzeigen. `eden` ohne Argument: Ein-Kommando-Schnellstart mit einer lokalen Erstfreigabe; `eden setup` ist der ältere erweiterte Planassistent.

## Wohin wird die Anwendung installiert?

Nur nach Bestätigung:

- App: `%LOCALAPPDATA%\EDEN\LAPTOP-OS\app\0.8.0-preview.7\web\`
- Optionaler Plan: `%LOCALAPPDATA%\EDEN\LAPTOP-OS\state\setup-plan.json`
- Weboberfläche: <http://127.0.0.1:8765/setup.html> (nur auf dem eigenen Rechner erreichbar)
- Server stoppen: **Strg+C**

Keine Adminrechte, kein Autostart, keine Systemkonfiguration, kein Flashen, keine Partitionierung, kein heimliches Herunterladen von Betriebssystemimages. Vorhandene App-Versionen und Pläne werden **nicht überschrieben**.

## Was ist enthalten?

- Windows-kompatibles Node.js-CLI mit lesendem Preflight, geführter Freigabe und Benutzerprofil-Installation
- EDEN-Term Workbench im neongrünen Dreiturm-Layout
- Offline-fähiger Demo-Builder und Dokumentationsansichten für Einrichtung, Handbuch, Toolbox, Grimoire, Testlabor und Quellen
- lokaler Read-only-HTTP-Server, keine Netzwerk- oder Shell-Agenten
- sichere öffentliche Dokumentation, Sicherheitsvertrag, Roadmap und Regressionstests

**Nicht enthalten:** Die ungeprüften, sensiblen 31-MB-Quellarchive, persönliche Arbeitsdaten, Zugangsdaten, echte Linux-/Qubes-/Tails-Images und ein fertiges Boot- oder Partitionierungsprogramm. Die vollständige historische EDEN-V0.7.5/V0.8.0-Quellenbasis bleibt separat und wird durch dieses npm-Paket nicht ersetzt.

## Entwicklungs-/Release-Prüfung

```cmd
npm ci --ignore-scripts
npm test
npm pack --dry-run
```

Diese Befehle sind für einen lokalen Checkout bzw. die GitHub-CI gedacht. **Für den Windows-Nutzer ist nur der obere einzelne npm-Befehl erforderlich**, sobald GitHub den Code bereitstellt.

Weitere Details: [Windows-Anleitung](docs/WINDOWS_SETUP.md), [Sicherheitsvertrag](docs/SICHERHEITSVERTRAG.md), [Roadmap](docs/ROADMAP_NAECHSTE_SCHRITTE.md) und [GitHub-Veröffentlichung](docs/GITHUB_RELEASE_OHNE_GIT.md).

Lizenz: MIT. Status: **Vorschau**, noch nicht hardware- oder produktiv verifiziert.


## GitHub-Upload ueber nur einen npm-Befehl

Der lokale Nutzer hat gemaess dem vorhandenen Pruefbericht bereits eine authentifizierte GitHub CLI (`gh`). Der ChatGPT-GitHub-Connector selbst hat **keinen** Schreibzugriff. Daher kann der npm-Starter auf dem Laptop den Upload sicher ausloesen, ohne manuelle Git-Befehle.

```cmd
npm exec --yes --package="%USERPROFILE%\Downloads\eden-laptop-os-0.8.0-preview.7.tgz" -- eden publish-github
```

Der Befehl zeigt zuvor eine exakte Dateiliste, verlangt die Eingabe `PUBLISH EDEN-STREET/LAPTOP-OS`, erstellt nur einen neuen Branch und ein Draft PR. Kein ungepruefter Merge in `main`. Mehr dazu in [Playwright und Release](docs/PLAYWRIGHT_UND_RELEASE.md).

## EDEN Hauptbereiche: Wiki · Handbuch · Projekte/Kanban

Der npm-Starter öffnet die EDEN-Term-Workbench. Von dort sind die **drei Hauptbereiche** erreichbar:

- **Wiki:** `http://127.0.0.1:8765/wiki.html` – suchbarer lokaler Wissenshub, technische Zusammenfassungen mit Nachweisstatus.
- **Handbuch:** `http://127.0.0.1:8765/handbuch.html` – öffentliche, erweiterte Kapitel-/Versionsnavigation. Historische Originale verbleiben separat.
- **Projekte/Kanban:** `http://127.0.0.1:8765/projects.html` – getrennte lokale Projektspuren für Wiki, Handbuch, LAPTOP-OS sowie spätere ROUTER/PIXEL-Strecken; Backlog/In Arbeit/Prüfung/Erledigt, lokaler JSON-Export/Import.

**Achtung:** Das Kanban wird nur in diesem Browserprofil gespeichert, es wird nicht mit GitHub Projects synchronisiert. Keine Passwörter oder PRIVATE-Quellen eintragen. Siehe `docs/WIKI_UND_HANDBUCH.md` und `docs/PROJEKTE_KANBAN.md`.
