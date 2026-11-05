# EDEN OneFile Runtime

## Vertrag

Nach außen existiert genau **eine ausführbare Datei pro Plattform**. Beim Start werden keine Python-, Node-, Modell- oder EDEN-Pakete aus dem Internet nachinstalliert.

Die Datei enthält intern:

- EDEN-Term / Ultimate Hub / Toolbox
- Node.js Runtime
- Python Runtime
- DuckDB
- Needle 2 inklusive Gewichten
- Jev/vLLM-Jev Runtime inklusive fest ausgewähltem Modellprofil
- nanobot-Code und isolierte Python-Umgebung
- EDEN-Policy, Prompts und Tool-Schemas

## Warum intern trotzdem entpackt wird

Ein einziges natives Programm kann Python-, Node- und Modellartefakte zwar als Ressourcen einbetten, die einzelnen Runtimes erwarten zur Ausführung aber teilweise echte Dateien, Shared Libraries und Modellpfade.

EDEN verwendet deshalb einen **self-extracting verified payload**:

1. Native Launcher startet.
2. Eingebettetes Manifest wird geprüft.
3. Payload wird ausschließlich in einen versionsgebundenen Benutzer-Cache entpackt.
4. Jede Datei wird gegen SHA-256 im eingebetteten Manifest geprüft.
5. Erst danach startet der interne Supervisor.
6. Kein Download und keine Systeminstallation.

Für Nutzer und Deployment bleibt es eine einzige Datei.

## Größenrealität

Needle 2 ist für den Always-on-Router geeignet und vergleichsweise klein.

Jev/vLLM-Jev plus ein 0.6B–2B Modell und ggf. CUDA-Komponenten sind dagegen deutlich größer. Ein wirklich vollständig eingebetteter Full-Build kann deshalb mehrere hundert Megabyte bis mehrere Gigabyte groß werden. Das ist kein Verpackungsfehler, sondern die tatsächliche Größe der Modellgewichte und Runtimes.

EDEN behandelt deshalb zwei Build-Profile:

- **FULL** — alle fest ausgewählten Modelle und Runtimes eingebettet.
- **LITE** — gleiche EDEN-Oberfläche und Policy, nur Needle 2 als Modell.

Der gewünschte Hauptbuild ist FULL. LITE ist Recovery-/Mobile-Profil.

## Sicherheitsarchitektur

```text
EDEN-Term
   |
   v
Node Policy Broker
   |---- deterministic fallback
   |
   +---- Needle 2 (tiny router)
   |
   +---- Jev (optional second opinion / structured scoring)
   |
   +---- nanobot (agent layer, restricted)
   |
   v
Allowlisted EDEN Tool Schema
   |
   +---- read-only action  -> may execute
   +---- navigation        -> may execute
   +---- write-like action -> PLAN_ONLY -> explicit approval
```

Kein Modelltext wird als Shellbefehl interpretiert.

## Plattformen

### Windows

Ein einzelnes `EDEN-OneFile-Windows-x64.exe`. Keine Administratorrechte für die Benutzeroberfläche oder internen Modellruntimes.

### Qubes / Whonix

`EDEN-OneFile-Linux-x86_64.run` gehört in einen EDEN App Qube bzw. eine Whonix Workstation. Nicht in `dom0` und nicht in `sys-whonix`.

### Tails

Dieselbe Linux-Datei liegt im Persistent Storage oder auf separatem Medium. Das Tails-Basisimage wird nicht verändert.

## Reproduzierbarkeit

Der OneFile-Build muss aus einem gesperrten Komponentenmanifest entstehen. Jeder eingebettete Payload erhält Hash, Version und Herkunft. CI prüft, dass der Launcher keine Remote-Installationspfade besitzt.
