# EDEN LAPTOP-OS – Windows Setup mit npm (ohne Git, ohne externe Agenten)

## Vorbedingungen

1. Windows 10/11 mit einer unterstützten Node.js-Version, mindestens 22. Ein veraltetes Windows 7/8 ist für aktuelle Node-LTS-Ausgaben nicht regulär unterstützt.
2. `npm --version` in **CMD als normaler Benutzer** funktioniert. Ein npm-Installer kann npm nicht selbst zur Verfügung stellen, wenn es noch nicht installiert ist.
3. Internetzugang für den einmaligen Abruf des freigegebenen GitHub-Quellpakets.
4. GitHub `EDEN-STREET/LAPTOP-OS` muss die Dateien aus diesem Paket enthalten (aktuell noch nicht veröffentlicht).

## Ein npm-Befehl

```cmd
npm exec --yes --package=https://github.com/EDEN-STREET/LAPTOP-OS/archive/refs/heads/main.tar.gz -- eden
```

- npm lädt das Archiv als HTTPS-Tarball und startet `eden`.
- Der Assistent erklärt den Preflight und fragt ausdrücklich nach einer **neuen lokalen Anwendungskopie**.
- Danach kann ein reiner **PLAN_ONLY**-Einrichtungsplan erzeugt werden.
- Anschließend öffnet er das browserbasierte Setup unter <http://127.0.0.1:8765/setup.html>.
- Mit **Strg+C** wird der lokale HTTP-Server beendet.

Bei einem bereits belegten Port 8765 stoppt EDEN mit einer Fehlermeldung. Es beendet keine fremden Programme.

## Aufbewahrung, Updates und Rückkehr

Die kopierte App liegt pro Benutzer unter `%LOCALAPPDATA%\EDEN\LAPTOP-OS\app\0.8.0-preview.3\web`. Ein erneuter Start überschreibt diese Version nicht. Pläne liegen separat im `state`-Ordner und werden nur mit `wx` angelegt, nicht still ersetzt. Für eine spätere Version wird ein neuer Versionsordner verwendet.

EDEN konfiguriert kein Windows-Autostart und keine Administratorrechte. Eine spätere vollständige Betriebssysteminstallation ist **kein Teil dieses npm-Starters**.

## Fehlerdiagnose

| Meldung | Ursache / Korrektur |
|---|---|
| `npm wird nicht erkannt` | Node.js (mit npm) von der offiziellen Node-Webseite installieren; CMD neu öffnen. |
| Node-Version zu alt | Unterstützte Node-LTS-Version >=22 installieren. |
| GitHub-Tarball 404/404 oder enthält keine `package.json` | Starter noch nicht auf `main` veröffentlicht. GitHub-Freigabe/Upload erforderlich. |
| npm Download/Netzwerkfehler | HTTPS, Zertifikate, Proxy prüfen; niemals globale Zertifikatsprüfung ausschalten. |
| `EEXIST` beim lokalen Installieren | Version existiert bereits; nicht überschreiben, vorhandene Dateien prüfen. |
| Historische Offline-Quellen nicht vorhanden | Die öffentliche npm-Ausgabe enthält bewusst nur freigegebene Demo-/Dokumentationsinhalte. |
| Port 8765 belegt | Andere lokale Anwendung prüfen und schließen; keine fremden Prozesse automatisch beenden. |

## Nachvollziehbarkeit

EDEN v0.8.0-preview.3 ist ein lokaler sicherer Einstieg. Installationsfreigabe ist ausdrücklich **nur** die Zustimmung zu einer neuen App-Kopie im Benutzerprofil und, falls gewünscht, einer JSON-Plan-Datei. Sie ist **niemals** eine Zustimmung zu Formatierung, Firmware-Flash oder einer echten Linux-/Qubes-Installation.
