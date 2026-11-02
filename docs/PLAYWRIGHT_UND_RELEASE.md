# EDEN: Playwright CLI und npm-Release

## Ziel
Der lokale Windows-Nutzer startet EDEN ausschliesslich via npm. Der GitHub-Publisher kann nach ausdruecklicher Zustimmung einen **separaten Branch** und einen **Draft Pull Request** erstellen. Keine Befehle werden mit Administratorrechten ausgefuehrt. Kein Windows-, Router- oder Datentraegereingriff.

## Release ohne Git-Kommando (lokal mit gh CLI)
Nur nachdem die `.tgz`-Datei heruntergeladen wurde und `gh auth status` lokal erfolgreich ist:

```cmd
npm exec --yes --package="%USERPROFILE%\Downloads\eden-laptop-os-0.8.0-preview.4.tgz" -- eden publish-github --dry-run
npm exec --yes --package="%USERPROFILE%\Downloads\eden-laptop-os-0.8.0-preview.4.tgz" -- eden publish-github
```

Beim zweiten Aufruf muss `PUBLISH EDEN-STREET/LAPTOP-OS` eingegeben werden. Es werden ausschliesslich versionierte, freigegebene Quelltexte in einen NEUEN Branch geschrieben; `main` bleibt unangetastet. Der entstehende Pull Request ist ein Entwurf. Nach Review und manuellem Merge ist der GitHub-npm-Aufruf bereit.

## Playwright CLI – auf deinem lokalen Rechner
Das Microsoft-Werkzeug dient der Browserautomatisierung. `/goal` und `/yolo` sind keine standardisierten Playwright-CLI-Kommandos und erteilen keine Windows-Administratorrechte.

```cmd
npm install -g @playwright/cli@latest
playwright-cli --help
```

EDEN in einem CMD-Fenster starten:

```cmd
npm exec --yes --package="%USERPROFILE%\Downloads\eden-laptop-os-0.8.0-preview.4.tgz" -- eden launch
```

Die nachfolgenden Befehle in einem **zweiten** CMD-Fenster ausfuehren:

```cmd
playwright-cli open http://127.0.0.1:8765/setup.html --headed
playwright-cli snapshot
playwright-cli screenshot
playwright-cli close
```

Playwright steuert nur den lokalen Browser und prueft die EDEN-Vorschau. Es installiert kein Betriebssystem. Vor jeder Freigabe: manueller Review des Diff, synthetische Tests, Windows-VM-Abnahme und dokumentierter Rollback.
