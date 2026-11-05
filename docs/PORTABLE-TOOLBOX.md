# EDEN Portable Toolbox

## Ziel

Eine gemeinsame Toolbox-Codebasis wird in mehreren sicheren Profilen verwendet. Es gibt **keine getrennten Forks** für Qubes, Whonix oder Tails.

## Profile

### Portable

Das Bundle kann als normaler Ordner auf einem USB-Stick oder in einem Benutzerverzeichnis liegen. Kernwerkzeuge sind browserbasiert und benötigen für ihre lokale Funktion keine Cloud-Verbindung.

### Qubes OS

Die Toolbox gehört in einen dedizierten **EDEN App Qube** oder in eine dafür vorgesehene Template-Kette. Sie wird nicht in `dom0` installiert.

Qubes empfiehlt normale Anwendungssoftware in Templates zu installieren und in App Qubes auszuführen. Drittsoftware sollte nach Möglichkeit in einem eigenen Template getrennt werden.

### Qubes-Whonix

Die Toolbox gehört in die **Whonix-Workstation** bzw. einen davon abgeleiteten App Qube. `sys-whonix` bleibt Gateway und wird nicht zum allgemeinen Werkzeugcontainer.

### Tails

Die Toolbox bleibt portabel. Für eine dauerhaft sichtbare Integration wird sie im **Persistent Storage** oder auf einem getrennten Datenträger abgelegt. Das Tails-Basisimage wird nicht verändert.

Das erfüllt den Bedienwunsch „immer vorhanden“, ohne die Update- und Sicherheitsannahmen des Live-Systems zu verändern.

## Gemeinsame Komponenten

- EDEN Image Studio
- Local Utility Lab
- Markdown Studio
- Diff Studio
- Academy
- Support Center
- Wiki / Handbuch
- Tool Registry

## Nicht Bestandteil der Portable-Basis

Werkzeuge, die freie Shell-Ausführung, privilegierte Gerätezugriffe oder automatische Systemänderungen benötigen, bleiben getrennte Adapter und benötigen eigene Freigabe-/Berechtigungsmodelle.

## Reproduzierbarkeit

Die Datei `config/toolbox-profiles.json` ist die maschinenlesbare Quelle für die Integrationsprofile. UI und Tests müssen mit dieser Datei konsistent bleiben.
