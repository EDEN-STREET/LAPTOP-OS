# EDEN LAPTOP-OS – Ein-Kommando-Start v0.8.0-preview.9

**Ziel:** EDEN als lokale Browser-App mit **einer einmaligen Zustimmung** installieren und bei weiteren Starts automatisch öffnen. Keine Partitionen, kein Windows- oder Linux-System werden verändert.

## Voraussetzungen

- Node.js **22 oder neuer** einschließlich npm ist installiert.
- Offizielle GitHub-Paketquelle ist erreichbar. Ein npm-Befehl kann npm selbst nicht nachinstallieren.
- Normales Benutzerkonto, keine Administratorrechte erforderlich.
- Die angezeigte Erstzustimmung betrifft **nur die lokale EDEN-App**, nicht ein Betriebssystem oder Netzwerk-Hardening.

## Ein Befehl

Aus dem ausgecheckten EDEN-LAPTOP-OS-Projekt:

```bash
npm start
```

Alternativ:

```bash
npm run go
```

Nach dem ersten `ja` erledigt EDEN selbständig:
1. Lesenden Node-/UI-Check.
2. Kopiert die freigegebene, versionierte HTML-App ins Benutzerprofil, **ohne bestehende Versionen zu überschreiben**.
3. Legt bei noch fehlendem Plan einen Qubes/Whonix-Plan mit `mode: PLAN_ONLY` an.
4. Speichert einen auf diese App-Version und ausschließlich lokale UI beschränkten Zustimmungsnachweis.
5. Startet die EDEN-Workbench unter `http://127.0.0.1:8765/setup.html` und öffnet den lokalen Browser.

Erneutes `npm start` verwendet dieselbe Versionsfreigabe ohne Rückfrage. Mit **Strg+C** wird der lokale Webserver beendet. Es gibt keinen Autostart.

Aus GitHub direkt (nach Merge dieser Version nach `main`):

```bash
npm exec --yes --package=https://github.com/EDEN-STREET/LAPTOP-OS/archive/refs/heads/main.tar.gz -- eden
```

Der Befehl startet ebenfalls den lokalen EDEN-Einstieg. Solange der PR noch nicht gemergt ist, führt `main` noch die vorherige Version aus.

## Versions- und Datensicherheit

- Windows: `%LOCALAPPDATA%\EDEN\LAPTOP-OS\app\0.8.0-preview.9\web`
- Linux: `~/.local/share/eden/laptop-os/app/0.8.0-preview.9/web`
- Zustimmungsnachweis: `state/quickstart-consent-0.8.0-preview.9.json`
- Geplanter Zielzustand: `state/setup-plan.json`, mit `PLAN_ONLY`.
- Unvollständige Installationen und ungültige Einwilligungsdateien stoppen den Start; keine automatische Reparatur durch Überschreiben.
- Ein bereits existierender Plan wird nicht überschrieben.

Die Zustimmung ermächtigt **keine** Löschung von Windows, keine Neuinstallation eines Betriebssystems und keine anderen Geräte-/Firmware-/Netzwerkänderungen.

## Zielarchitektur

```text
Laptop (heute Windows; unverändert)
└── EDEN Browser-Workbench + Read-only-Plan
    └── Zukunft: Qubes OS als eigenständiges Hostsystem
        ├── sys-net / sys-firewall (Qubes-Netzwerkschicht)
        ├── sys-whonix (Tor-Gateway, unabhängig nachzuprüfen)
        └── anon-whonix (geplante Arbeits-Qube über sys-whonix)

Tails: separater startbarer Live-Datenträger, kein Unterbau von Qubes.
```

Die Schaltfläche in [Sicherheitsarchitektur](../web/security-architecture.html) zeigt nur eine **Simulation**. Ein tatsächlicher Kill-Switch, die Überwachung von Tor-Verbindungen und die Installationsfreigabe sind nicht Teil dieses npm-Pakets und werden deshalb als `NOT_VERIFIED` angezeigt.

## Wiederholen und Fehlerbehebung

```bash
npm run doctor
npm test
npm pack --dry-run
```

Wenn Port 8765 belegt ist, bricht der lokale Server ab, ohne andere Prozesse zu beenden.

## Reproduzierbare Testumgebung

[VM-Testmatrix](VM-TESTMATRIX.md) · [Sicherheitsvertrag](SICHERHEITSVERTRAG.md) · [Workflow-Registry](WORKFLOW-REFERENZEN.md).

Die GitHub-Actions-Runner sind isolierte Windows-/Linux-Umgebungen. Die Tests prüfen eine virtuelle Datenablage mit einer unveränderlichen Windows-Sentinel-Datei und die lokale npm-App. Sie ersetzen **keinen echten Qubes- oder Tails-Boot**, keine echte Datenträgerprüfung und keine auf einem Laptop ausgeführte Installation.


## Reboot-to-Installer: separater, rein lesender Freigabeplan

`npm run reboot:plan` zeigt die acht Freigabestufen. `node bin/eden.mjs reboot-plan --json` gibt JSON aus. Beide Befehle führen **keinen Neustart und keine Installation** aus. `--save-plan` legt nur nach separater Angabe eine neue JSON-Datei an.

[Ausführlicher Workflow](REBOOT-TO-INSTALLER-WORKFLOW.md) · [Workflow-Vorschau](../web/reboot-plan.html)


## Kombinierte Gate-5- und Reboot-Prüfung

- `npm run gate5`: hardwarebezogener **Read-only**-Bericht; `--strict` meldet ungeklärte Pflichtnachweise als Fehler.
- `node bin/eden.mjs assess --json`: gemeinsamer Bericht aus 10 Hardware-Gates und 8 Neustart-Stufen. Keine Systemänderung.
- Kein Prüfbericht berechtigt zum Überschreiben oder Löschen von Windows. Für Qubes OS bleiben echte Hardwareeignung, Signaturprüfung und Wiederherstellungsprüfung erforderlich.
