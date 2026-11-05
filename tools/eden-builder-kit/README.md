# EDEN Builder Kit (read-only) – v0.1.0

Eigenständiges Tool-Untermodul für **EDEN STREET / EDEN Suite**, kompatibel mit dem bestehenden EDEN Builder unter `web/builder.html`. Dieses Toolkit ergänzt die **Prüfung und Dokumentation**; es ersetzt keine früheren Quellstände.

## Nutzung

```sh
cd tools/eden-builder-kit
npm test
npm run validate
npm run status
npm run goal
```

Das Tool **führt keine Workflows, Shellbefehle oder Geräteänderungen aus**. Skills werden ausschließlich über die lokale Registry freigegeben; unbekannte IDs/Argumente blockieren. Zentrale Parameter: `config/tool.json`.

## Verifizierter Stand – 2026-11-05

- Das laufende Mutterprojekt `EDEN-STREET/LAPTOP-OS` meldet `0.8.0-preview.9`.
- Die hochgeladene `.lnk` aus v0.3.1 zeigt nur auf eine PNG-Vorschau und enthält keinen rekonstruierbaren Quellcode.
- Im Repository existiert eine **nicht ausführende** Builder-Demo mit Validierung und JSON-Import/-Export.
- Der historische 0.3.1-Quellcode, echte Geräteintegration und ein vollständiger Restore bleiben **nicht nachgewiesen**.
- Keine privaten Dokumente, Screenshots oder Handbuch-Originale werden durch diesen PR publiziert.

## /GOAL
Siehe `docs/GOAL.md`. Release nur nach Tests, Review und gesonderten produktiven Freigabegates.

Für ein späteres eigenes Repository `EDEN-STREET/TOOLS` kann dieses Untermodul unverändert ausgelagert werden.
