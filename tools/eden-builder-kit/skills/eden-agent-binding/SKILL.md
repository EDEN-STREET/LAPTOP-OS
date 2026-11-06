---
name: eden-agent-binding
version: 0.2.0
skill_id: agents.bind
class: read_only
agent: Workflow Orchestrator
---
# eden-agent-binding

## Trigger
Projekt-Bestandsprüfung, /GOAL-Workflow oder explizite Anfrage zu agents.bind.

## Zweck
Ordnet registrierte Skill-IDs eindeutig zu freigegebenen Agentenrollen; erstellt nur Pläne.

## Inputs
Datei-/Repository-Metadaten, revisionsfeste Quellen-IDs, Konfiguration, bekannte Versionen. Private Dateien verbleiben lokal.

## Outputs
Strukturierter Status mit prüfbarer Herkunft, Zeitstempel, Testmethode, Befund, verbleibenden Unsicherheiten und nächstem Gate.

## Reproduzierbarer Ablauf
1. Vorhandene Skills finden und Wiederverwendung prüfen.
2. Eingaben inventarisieren und zugehörige Version/Hash notieren.
3. Kompatibilität und Sicherheitsregeln prüfen, ohne unbekannte Befehle auszuführen.
4. Rein lesenden Dry-Run/Verifikationsplan erstellen.
5. Tatsächliche Ergebnisse von Demo-Anzeigen und Annahmen trennen.
6. Regressionstest/Negativtest protokollieren; Release-Gate verlangen.

## Config / Tests
Registry: `config/tool.json`; Agenten: `agents/registry.json`; Workflow: `workflows/full-recovery.json`. Tests via `npm test`, Agentplan via `npm run agent:plan`.

## Recovery und Grenzen
Das Tool schreibt nichts an Geräten oder Systemen. Rücknahme des nur dokumentarischen Entwurfs erfolgt über einen neuen Git-Commit bzw. Verwerfen des Draft-PRs; keine Force-Pushes. Keine automatische Veröffentlichung privater Quellen oder historischer PDFs. Produktive Änderungen benötigen separate Freigabe.
