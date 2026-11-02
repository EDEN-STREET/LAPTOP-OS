# EDEN Projekte / Kanban – lokales Planungsmodul

`web/projects.html` und `web/projects.js` bilden den **lokalen** Projektraum mit Kanban ab. Projekte: Wiki/Wissenshub, Handbuch, LAPTOP-OS, ROUTER (Folgeprojekt) und PIXEL (Folgeprojekt). Jeder Track hat ein eigenes Backlog.

Spalten: **Backlog → In Arbeit → Prüfung → Erledigt**. Aufgaben und Projekte können angelegt und Aufgaben verschoben werden. Speichern im lokalen Browserprofil (`localStorage`, Schlüssel `eden.kanban.v1`), JSON Export/Import (Schema `eden.kanban/1`). Änderungen im Kanban sind **keine** automatische GitHub-Änderung, keine CI-Prüfung und kein Nachweis, dass ein Gerät sicher ist.

Sicherheit: keine Cloud-Anbindung, keine Systemaktionen, kein automatisches Schreiben an GitHub; Eingaben werden per `textContent` ausgegeben. JSON-Import mit Schema-, Typ-, Größen- und Statusprüfung. Keine Geheimnisse, persönlichen Falldaten, privaten Quellennamen oder Hardware-IDs eintragen. Browserdaten können verloren gehen – Export als Backup verwenden.

Abnahmekriterien: npm-Testlauf, HTTP-200 für Wiki und Projekte, Navigationslinks, Suche, Speichern, Projektwechsel, Statuswechsel, Export/Import/Reset (Browserprüfung) und unveränderter vorhandener Setup-Workflow. Für ein **echtes GitHub Projects v2 Board** fehlen diesem Connector Projekt-Erstellen/-Ändern-Aktionen; stattdessen können nach Freigabe öffentliche Issues als Entwicklungsaufgaben verwendet werden.
