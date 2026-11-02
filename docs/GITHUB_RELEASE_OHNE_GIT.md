# Statusupdate nach PR #2: Der Windows-npm-Starter liegt bereits in `main`. Die folgende historische Anleitung dokumentiert den früheren 403-Blocker und ist für diesen Stand nicht mehr aktuell.

# EDEN LAPTOP-OS – Veröffentlichung in GitHub, ohne Git oder Antigravity

**Aktueller Blocker:** Für `EDEN-STREET/LAPTOP-OS` ist die GitHub-App-Schreibberechtigung noch nicht aktiv (403 beim Branch-Anlegen). Die sichere lokale Starterversion ist fertig, aber noch nicht in GitHub veröffentlicht. Keine gegenteiligen Aussagen machen.

## Variante A – GitHub-App freigeben (bevorzugt)

1. Als Organisationseigentümer die GitHub-App-Installationen für `EDEN-STREET` öffnen:
   <https://github.com/organizations/EDEN-STREET/settings/installations>
2. ChatGPT-GitHub-App für **EDEN-STREET** installieren und `LAPTOP-OS` als Repository auswählen (nicht automatisch alle Repositories).
3. Die von der App angeforderte Schreibberechtigung für Repository-Inhalte bestätigen.
4. Danach den Upload auf einem neuen Branch mit Pull Request durchführen. `main` und `LICENSE` bleiben bis zur Prüfung unangetastet.

## Variante B – manuell über GitHub-Weboberfläche

1. Übergabe-ZIP lokal entpacken. **Nicht das ZIP als einzige Datei ins Repository hochladen**, denn npm findet darin keine `package.json`.
2. Öffne <https://github.com/EDEN-STREET/LAPTOP-OS/upload/main> (GitHub: Add file → Upload files).
3. Lade die **Dateien und Unterordner des GitHub-fertigen Verzeichnisses** ins Repository-Root hoch. Bestehende `LICENSE` unverändert lassen. README darf nach Sichtprüfung aktualisiert werden.
4. GitHub-Upload bestätigen; danach die neuen Dateien auf GitHub prüfen, insbesondere `package.json`, `bin/eden.mjs`, `lib/core.mjs`, `lib/server.mjs`, `web/index.html`, `web/setup.html`.
5. Erst anschließend funktioniert auf dem Laptop der dokumentierte einzelne `npm exec --yes --package=... -- eden`-Befehl.

**Veröffentlichungsregel:** Keine historischen ungeprüften Archive, privaten Quellen, Zugangsdaten, API-Keys oder Gerätekennungen auf GitHub laden. Das bereitgestellte npm-Repo enthält nur die oben beschriebenen freigegebenen Demo- und Setup-Dateien.

## Nach der Veröffentlichung

Unabhängige Prüfung auf Windows 10/11, Node 22/24, mit sauberem npm-Cache und abweichendem Benutzerprofil; Test von Start, Neuinstallation, Wiederholung ohne Überschreiben, Portkonflikt, fehlender Netzwerkverbindung und Abbruch mit Strg+C. Ergebnisse als nachvollziehbares Release-Protokoll dokumentieren.
