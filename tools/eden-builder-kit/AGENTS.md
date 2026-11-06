# EDEN Skill Factory – Agentenanweisungen

**Geltung:** Dieses Verzeichnis und darunter liegende Dateien. Agenten lesen vor Änderungen `config/tool.json`, `agents/registry.json`, `workflows/full-recovery.json` und den passenden `skills/*/SKILL.md`.

## Verbindliches Routing
1. Vorhandene Versionen, Skills, PRs und Quellenbestände prüfen; keine fehlenden Daten erfinden.
2. Skills aus der freigegebenen Registry wiederverwenden. Unbekannte IDs oder zusätzliche Parameter verweigern.
3. `npm run agent:plan` erzeugt nur einen Plan; `NOT_EXECUTED` bleibt unverändert, bis eine separate Laufzeit und Freigabe existieren.
4. Archive und Folien nur lesend mit `python3 scripts/audit_artifacts.py` prüfen.
5. Tests, Abhängigkeiten, Fehlerpfad, Belege und Recovery vor jedem Release dokumentieren.
6. Keine privaten Originale/Tokens öffentlich hochladen. Kein Flashing, Betriebssystemwechsel, Datenträgerformatieren oder automatischer Merge.
7. In einem Feature-Branch mit Draft-PR arbeiten; bestehende Funktionen nicht ungeprüft überschreiben.

**Agentenrollen:** Project Auditor, Recovery Agent, Documentation Agent, Skill Architect, Workflow Orchestrator, Release Guardian. Diese Dateien definieren Rollen, keine dauerhaft im Hintergrund laufenden Dienste.
