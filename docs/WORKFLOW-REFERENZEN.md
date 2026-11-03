# EDEN LAPTOP-OS · Workflows, Agenten und Bedienungsanweisungen

[← Projektübersicht](EDEN-SUITE-VORSCHAU.md) · [Alle EDEN Suite Workflows](https://github.com/EDEN-STREET/.github/blob/main/docs/workflows.html) · [Masterdokumentation](https://github.com/EDEN-STREET/.github/blob/main/docs/EDEN-STREET-MASTERDOKUMENTATION.md)

## Zuordnung

| Aufgabe | Vorschau | Prompt |
|---|---|---|
| EDEN-Term Branding/UX | [WF-06](https://github.com/EDEN-STREET/.github/blob/main/docs/workflow.html?id=06) | [Anleitung 06](https://github.com/EDEN-STREET/.github/blob/main/docs/prompts/06-terminal.md) |
| LAPTOP-OS Preflight | [WF-09](https://github.com/EDEN-STREET/.github/blob/main/docs/workflow.html?id=09) | [Anleitung 09](https://github.com/EDEN-STREET/.github/blob/main/docs/prompts/09-laptop.md) |
| Universal Bootstrap | [WF-12](https://github.com/EDEN-STREET/.github/blob/main/docs/workflow.html?id=12) | [Anleitung 12](https://github.com/EDEN-STREET/.github/blob/main/docs/prompts/12-bootstrap.md) |
| UI-Vorschauen | [WF-13](https://github.com/EDEN-STREET/.github/blob/main/docs/workflow.html?id=13) | [Anleitung 13](https://github.com/EDEN-STREET/.github/blob/main/docs/prompts/13-previews.md) |
| Qualität und CI | [WF-15](https://github.com/EDEN-STREET/.github/blob/main/docs/workflow.html?id=15) | [Anleitung 15](https://github.com/EDEN-STREET/.github/blob/main/docs/prompts/15-quality.md) |
| Issue-/PR-Governance | [WF-16](https://github.com/EDEN-STREET/.github/blob/main/docs/workflow.html?id=16) | [Anleitung 16](https://github.com/EDEN-STREET/.github/blob/main/docs/prompts/16-github.md) |

## Beispiel einer sicheren Arbeitssequenz

[![LAPTOP-OS Preflight-Workflow](https://raw.githubusercontent.com/EDEN-STREET/.github/main/docs/media/workflows/WF-09.svg)](https://github.com/EDEN-STREET/.github/blob/main/docs/workflow.html?id=09)

1. Read-only Host-/Hardwareinventar ausführen.
2. Ergebnisse ohne reale Gerätekennungen protokollieren.
3. Qubes-/Whonix-Kompatibilität nach offiziellen, aktuellen Versionen überprüfen.
4. Datensicherung, Firmware-/UEFI-Gates und Medienintegrität dokumentieren.
5. Dry-Run und Plan ohne Datenträgeränderung.
6. Bei Destruktionsrisiko Stoppsignal; explizite Freigabe getrennt behandeln.
7. Tests und Reviewer-Nachweis, dann erst dokumentierte nächste Etappe.

## Kopierbarer Prompt
Nutze den [LAPTOP-OS Prompt WF-09](https://github.com/EDEN-STREET/.github/blob/main/docs/prompts/09-laptop.md) mit tatsächlichem Git-HEAD und Geräte-Constraints. Eine UI-Demo hat niemals die Autorität, Festplatten oder Firmware zu verändern.

## Projektinterne LLM-Orientierung
[llms.txt](../llms.txt) · [EDEN Suite Bereichs-llms.txt](https://github.com/EDEN-STREET/.github/blob/main/docs/areas/laptop/llms.txt)

## Status
**Nur Dokumentation:** Auf diesem Branch werden keine Installationsprogramme, Testgates oder Gerätekomponenten verändert.
