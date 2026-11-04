# EDEN Ultimate Hub + Tool Suite

**Branch:** `feature/ultimate-hub-tool-suite`

## Ziel

Der Ultimate Hub verbindet bestätigte EDEN-Oberflächen über eine gemeinsame, lokale Registry. Bestehende Module werden nicht ersetzt. Neue Werkzeuge werden als eigene, isolierte Browserprogramme ergänzt.

## Neu

- `web/ultimate-hub.html` – Dashboard, Modulfilter, Ereignisse und Next-Step-Pipeline.
- `web/tool-registry.js` – maschinenlesbare Registry mit Status, Modus und Herkunft.
- `web/image-studio.html` – lokaler Bildeditor mit Filtern, Transformation, Undo/Redo und Export.
- `web/local-tools.html` – SHA-256, JSON-Validator/Formatter, Textstatistik und Dateinamen-Normalisierung.
- `tests/ultimate-hub.test.mjs` – statische Integritäts- und Sicherheitsgrenzen.

## Statusmodell

- **active:** lokal tatsächlich nutzbare Seite.
- **read-only:** Information/Analyse ohne Schreibwirkung.
- **preview:** vorhandener Funktionsprototyp, nicht als Produktionsnachweis zu behandeln.
- **planned:** sichtbar, aber nicht implementiert oder absichtlich blockiert.

## Sicherheitsgrenzen

Die neuen Werkzeuge führen keine Betriebssystem-, Firmware-, Router-, Bootloader- oder Partitionsänderungen aus. Der Image Studio verarbeitet ausgewählte Bilder ausschließlich lokal im Browser. Das Utility Lab lädt keine Dateien hoch.

Ein Datei-Hash belegt nur Byte-Gleichheit, nicht Herkunft oder Authentizität. Bildbearbeitung ersetzt keine Metadaten- oder inhaltliche Quellenschutzprüfung.

## Weiterer Ausbau

Reale Integrationen dürfen erst nach Preflight, Berechtigungsmodell, Recovery, Tests und Review vom Status `planned` oder `preview` auf einen produktiven Status wechseln.
