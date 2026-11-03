# 🟢 EDEN LAPTOP-OS · npm-only Windows Setup

**V0.8.0-preview.4 · EDEN-Term UI · geführter, nicht-destruktiver Einstieg**

> Die npm-Version installiert eine **lokale EDEN-Browseranwendung und einen Einrichtungsassistenten**. Sie ersetzt **nicht** Windows, Kali, Tails oder Qubes OS und verändert weder Partitionen noch Firmware. Reale OS-Installation erfordert später separate Hardwareprüfung, Backup, offizielle Installationsmedien und Freigabe.

## Ein Befehl in der Windows-Eingabeaufforderung (CMD)

Nachdem **dieses Projekt** im GitHub-Repository `EDEN-STREET/LAPTOP-OS` veröffentlicht wurde:

```cmd
npm exec --yes --package=https://github.com/EDEN-STREET/LAPTOP-OS/archive/refs/heads/main.tar.gz -- eden
```

Dieser Befehl lädt den GitHub-Quellcode **direkt als Tarball über npm**. **Git muss dafür nicht installiert sein.** `npm exec` startet den EDEN-Assistenten aus dem heruntergeladenen Paket. Nach Zustimmung legt er ausschließlich eine neue EDEN-Version im Benutzerverzeichnis an, fragt nach einem optionalen Installationsplan und öffnet die **lokale EDEN-Workbench**.

**Voraussetzung:** Auf Windows 10/11 muss Node.js 22 oder neuer inklusive npm bereits installiert sein. Ohne npm lässt sich kein npm-Befehl ausführen. Node.js bitte von [nodejs.org](https://nodejs.org/) installieren und CMD neu öffnen.

**Veröffentlichungsstatus:** Der npm-Starter wurde mit PR #2 auf `main` übernommen. Das Wiki-/Handbuch-/Kanban-Update wird als eigener Integrationszweig geprüft. Der GitHub-Tarball-Start setzt weiterhin Node.js/npm und einen erreichbaren GitHub-Branch voraus.

### Zusätzliche Funktionen (weiterhin nur npm)

```cmd
npm exec --yes --package=https://github.com/EDEN-STREET/LAPTOP-OS/archive/refs/heads/main.tar.gz -- eden doctor
npm exec --yes --package=https://github.com/EDEN-STREET/LAPTOP-OS/archive/refs/heads/main.tar.gz -- eden launch
npm exec --yes --package=https://github.com/EDEN-STREET/LAPTOP-OS/archive/refs/heads/main.tar.gz -- eden status
```

`doctor`: nur lesen. `launch`: Browser starten ohne Dateien im Benutzerprofil zu schreiben. `status`: bestehenden Installationsplan anzeigen. `eden` ohne Argument: geführtes Setup mit ausdrücklicher lokaler Freigabe.

## Wohin wird die Anwendung installiert?

Nur nach Bestätigung:

- App: `%LOCALAPPDATA%\EDEN\LAPTOP-OS\app\0.8.0-preview.4\web\`
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
npm exec --yes --package="%USERPROFILE%\Downloads\eden-laptop-os-0.8.0-preview.4.tgz" -- eden publish-github
```

Der Befehl zeigt zuvor eine exakte Dateiliste, verlangt die Eingabe `PUBLISH EDEN-STREET/LAPTOP-OS`, erstellt nur einen neuen Branch und ein Draft PR. Kein ungepruefter Merge in `main`. Mehr dazu in [Playwright und Release](docs/PLAYWRIGHT_UND_RELEASE.md).

## EDEN Hauptbereiche: Wiki · Handbuch · Projekte/Kanban

Der npm-Starter öffnet die EDEN-Workbench. Von dort sind die **drei Hauptbereiche** erreichbar:

- **Wiki:** `http://127.0.0.1:8765/wiki.html` – suchbarer lokaler Wissenshub, technische Zusammenfassungen mit Nachweisstatus.
- **Handbuch:** `http://127.0.0.1:8765/handbuch.html` – öffentliche, erweiterte Kapitel-/Versionsnavigation. Historische Originale verbleiben separat.
- **Projekte/Kanban:** `http://127.0.0.1:8765/projects.html` – getrennte lokale Projektspuren für Wiki, Handbuch, LAPTOP-OS sowie spätere ROUTER/PIXEL-Strecken; Backlog/In Arbeit/Prüfung/Erledigt, lokaler JSON-Export/Import.

**Achtung:** Das Kanban wird nur in diesem Browserprofil gespeichert, es wird nicht mit GitHub Projects synchronisiert. Keine Passwörter oder PRIVATE-Quellen eintragen. Siehe `docs/WIKI_UND_HANDBUCH.md` und `docs/PROJEKTE_KANBAN.md`.
