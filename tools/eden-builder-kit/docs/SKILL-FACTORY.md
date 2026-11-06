# EDEN Skill Factory / Agentenworkflow v0.2.0

Sechs wiederverwendbare Skills in `skills/*/SKILL.md` ergänzen den ursprünglichen Builder. `config/tool.json` ist die zentrale Registry. `agents/registry.json` bindet **genau eine Agentenrolle** je Skill. `workflows/full-recovery.json` legt die Reihenfolge fest.

## /GOAL
DISCOVER → INVENTORY → COMPARE → PLAN → VALIDATE → APPROVE → DOCUMENT → RECOVER.

## Prüfen
```sh
cd tools/eden-builder-kit
npm test
npm run validate
npm run agent:plan
```

Dieser Agentenplan ist **nicht ausführend**. Die Agentenrollen sind als versionierte Dateien gespeichert und werden erst dann wirklich in eine andere Agentenplattform eingebunden, wenn diese Registry/Skill-Dateien dort importiert sind. Keine Geräteänderungen, kein automatischer Merge. Private Quellen/Archive dürfen nicht automatisch nach GitHub.
