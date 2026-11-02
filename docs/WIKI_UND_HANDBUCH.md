# EDEN Wiki und Handbuch – Hauptbereiche (V0.8.0-Preview)

## Ziel und Stand

- `web/wiki.html`: öffentliche, lokal durchsuchbare Wissensoberfläche mit zehn **redaktionell zusammengefassten technischen** Beiträgen.
- `web/handbuch.html`: öffentlicher Handbuch-Hauptbereich, inklusive Ergänzung mit sechs Kapitelnavigationen.
- `web/index.html`: Hauptnavigation WIKI / HANDBUCH / PROJEKTE-KANBAN zusätzlich zu allen vorhandenen Modulen.
- **Keine Live-Synchronisation** zu GitHub Wiki, GitHub Projects, Nextcloud oder privaten Archiven.

## Verbindliche Herkunft und Schutzklassen

Grundlagen sind der bestehende öffentliche npm-Starter, EDEN-Handbuch V0.7.5 Offline (historischer Entwurf mit 21 Teilen), der V0.8.0 Integrationskandidat (ergänzter Teil XXII) und die NOUZ-Term-Benutzerreferenz. Nicht alle historischen Quellen wurden als öffentliche Publikation freigegeben. Daher enthält das Repo ausschließlich eigenständig formulierte, allgemein gehaltene TECHNICAL-Zusammenfassungen. Originale werden nicht verändert und nicht ins öffentliche Repository kopiert.

Die Rubriken unterscheiden `DOKUMENTIERT`, `UI-DEMO`, `PLAN / NICHT VERIFIZIERT`, `TESTBEDARF`. Keine Oberflächenaussage ersetzt VM-/Hardwaretests. Vor künftiger Veröffentlichung jedes Dokuments sind Datenklasse (TECHNICAL/PRIVATE/UNTRUSTED/EVIDENCE), Urheberrecht/Lizenz, Quelle, SHA-256, Versionsstand, Review und ausdrückliche Freigabe zu prüfen.

## Freigabekriterien für Ergänzungen

1. Neue Inhalte als zusätzliche versionierte Seite/Datei, historische Fassungen behalten.
2. Quelle und Nachweisgrad benennen, keine unechten Live-Dienst-Indikatoren.
3. Navigation und Barrierefreiheit testen, Links lokal auflösbar.
4. Prüfsummen und Änderungen protokollieren, bei Bedarf Rollback über Git-Commit.
5. Keine privaten Dateien/Agentenprotokolle in einem öffentlichen Repository.
