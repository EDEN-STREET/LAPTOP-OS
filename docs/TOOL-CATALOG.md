# EDEN Tool Catalog

Stand: Feature-Branch `feature/ultimate-hub-tool-suite`

## Statusregeln

| Status | Bedeutung |
|---|---|
| active | Im aktuellen Web-Bundle tatsächlich nutzbar |
| read-only | Nutzt ausschließlich lesende / erklärende Funktionen |
| preview | Funktionsprototyp; kein Produktivnachweis |
| planned | Architektur-/Integrationsziel, noch nicht implementiert |

## Core / Operations

- **EDEN Ultimate Hub** — active, local
- **EDEN-Term** — preview, local
- **Setup Assistant** — active, read-only
- **Workflow Builder** — preview, simulation
- **Projekte / Kanban** — active, local
- **Testlab / Evidence** — active, read-only
- **Hardware Gate 5** — preview, read-only
- **Reboot Plan** — preview, read-only

## Wissen / Lernen / Support

- **EDEN Wiki** — active
- **EDEN Handbuch** — active, öffentliche Navigationsfassung
- **Quellenregister** — active, read-only
- **Security Architecture** — active, read-only
- **EDEN Academy** — active, local
- **EDEN Support Center** — active, read-only

## Lokale Werkzeuge

### EDEN Image Studio

Neuentwicklung innerhalb dieses Feature-Branches. Es wurde im vorhandenen Projektbestand kein belastbarer bereits implementierter „Photoshop-Klon“ gefunden; deshalb wird kein historischer Clone behauptet.

Funktionen:

- PNG/JPEG/WebP lokal öffnen
- Helligkeit, Kontrast, Sättigung, Graustufe, Blur
- Drehen und Spiegeln
- Undo / Redo
- Text-Layer mit Sichtbarkeit, Reihenfolge und Löschung
- PNG/JPEG/WebP lokal exportieren

Nicht enthalten:

- PSD-Kompatibilität
- Masken
- komplexe Auswahlwerkzeuge
- Smart Objects
- Ebenenstile / Blend Modes
- professionelles Farbmanagement
- RAW-Entwicklung

### Local Utility Lab

- SHA-256
- JSON-Validierung und Formatierung
- Textstatistik
- sichere Dateinamen-Normalisierung

### Markdown Studio

- lokaler Editor
- sichere DOM-Vorschau ohne ungeprüfte HTML-Injektion
- lokaler Import / Export

### Diff Studio

- lokaler positionsbasierter Zeilenvergleich
- bewusst kein vollständiger Git-Diff-Algorithmus

## Geplante Adapter aus dem vorhandenen EDEN-Konzept

Diese Bestandteile bleiben sichtbar, aber werden nicht fälschlich als fertig ausgegeben:

- **Superfile Adapter** — planned
- **Zellij / Zsh Session Adapter** — planned
- **fzf / Navi Search Adapter** — planned

Vor einer Statusaufwertung brauchen diese Komponenten ein Berechtigungsmodell, definierte Vertrauensgrenzen, Recovery, Tests und Review.

## Sicherheitsgrenze

Keine Seite in diesem Ausbau führt Firmware-, Bootloader-, Partitions-, Router- oder Betriebssystemänderungen aus. Kein Browser-Tool besitzt freie Shell-/PTY-Ausführung. Lokale Dateifunktionen übertragen ihre Eingaben nicht an einen Server.

## Reproduzierbarer Ausbauprozess

1. Bestand und Herkunft prüfen.
2. Lücke als `planned` erfassen.
3. Implementierung auf Feature-Branch.
4. In `UI_BUNDLE_FILES` und Tool-Registry registrieren.
5. Node-Tests.
6. Desktop-/Mobile-Browser-QA.
7. CodeQL.
8. Review.
9. Erst danach Status / Merge ändern.
