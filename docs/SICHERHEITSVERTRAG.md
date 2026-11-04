# Sicherheitsvertrag – EDEN LAPTOP-OS npm-only Preview

1. Die aktuelle Version ist ein **nicht-destruktiver Windows-App-Starter**, keine Betriebssystemdistribution.
2. Keine Partitionierung, kein Bootloader-/BIOS-Flash, kein Router-Setup, kein Root- oder Administratorzugang, keine Autostart-Einrichtung.
3. Die npm-Tarball-Quelle ist öffentliches GitHub; private EDEN-Quellen und historischer 31-MB-Bestand bleiben getrennt.
4. npm verwendet keine `preinstall`/`postinstall`-Hooks und keine Runtime-Abhängigkeiten. Der Assistent fragt vor dem lokalen Kopieren in das Benutzerprofil.
5. `doctor` liest nur Node-/OS-/CPU-/RAM-Status sowie einen groben freien Speicherwert. Kein Upload, keine IMEI/MAC/Seriennummer.
6. Die Browseransicht bindet an **127.0.0.1:8765**. Kein öffentliches Interface, keine Schreib-API, keine Shell-Ausführung durch Browser-/EDEN-/LLM-Eingaben.
7. Die Installation legt ausschließlich eine neue, versionsgebundene App-Kopie unter `LOCALAPPDATA` an. Vorhandene Versionen werden nicht überschrieben. Bestehende Pläne bleiben geschützt.
8. Statusinformationen in der UI sind **synthetisch** und belegen keine tatsächliche Sicherheitslage oder Hardwareprüfung.
9. Reale Aktionen brauchen nachweislich einen unabhängigen Policy Broker, Gerätefreigabe, Wiederherstellungsprüfung und externe Verifikation.
10. Änderungen an den GitHub-Quellen auf separaten Branches prüfen, Quellen/Lizenzen/Hashes kontrollieren und keine privaten Inhalte veröffentlichen.

11. `eden reboot-plan` erzeugt lediglich einen **lesenden Qubes-Migrationsprüfplan** und startet weder Installer noch Neustart; `--save-plan` speichert nur neue lokale JSON-Datei ohne Überschreiben.
12. Sämtliche Installationsfreigaben bleiben auf `BLOCKED_INDEPENDENT_REVIEW_REQUIRED`, bis Gerät, Backup, Signaturen, Zielmedium, Bootweg und gesonderte Entscheidung unabhängig verifiziert sind. Die App-Zustimmung kann dafür nicht verwendet werden.
13. Tails bleibt ein separates Live-System; Whonix in Qubes und Tor-/Leak-Isolation sind nicht durch npm implementiert oder verifiziert.
