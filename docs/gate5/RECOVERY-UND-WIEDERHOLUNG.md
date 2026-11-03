# Wiederholungs- und Recovery-Verfahren — EDEN Gate 5 (Preflight v0.1.0)

Dieses Dokument beschreibt, wie du vorgehst, wenn **Gate 5** einen Blocker (`BLOCKED`), einen offenen Prüfpunkt (`REVIEW_REQUIRED` / `unbekannt`) oder einen Konfigurationsfehler meldet, und wie du Prüfläufe jederzeit gefahrlos wiederholst.

---

## 1. Warum ein Abbruch in Gate 5 niemals dein System beschädigt

Da Gate 5 v0.1.0 **ausschließlich lesend (`read-only`)** arbeitet:

- werden **keine** Partitionstabellen berührt,
- werden **keine** Bootloader- oder UEFI-Variablen verändert,
- werden **keine** bestehenden Berichtsdateien überschrieben (Schreibschutz durch Dateiflag `wx`).

**Folge:** Wenn ein Prüflauf fehlschlägt, mit `Strg+C` abgebrochen wird oder `BLOCKED` meldet, befindet sich dein Laptop in exakt demselben Zustand wie vor dem Aufruf. Du kannst die Prüfung beliebig oft wiederholen.

---

## 2. Schritt-für-Schritt-Lösungen für typische Meldungen

### Fall A: `G5-02` oder `G5-03` meldet `nicht verfügbar` oder `unbekannt` (Virtualisierung / IOMMU)

- **Ursache:** Hardware-Virtualisierung (`Intel VT-x` / `AMD-V`) oder IOMMU (`Intel VT-d` / `AMD-Vi`) ist im UEFI/BIOS deaktiviert oder unter Windows ohne Administratorrechte nicht direkt aus den ACPI-Tabellen (`DMAR`/`IVRS`) ablesbar.
- **Lösung & Wiederholung:**
  1. Prüfe im Windows-Task-Manager unter *Leistung → CPU*, ob *Virtualisierung: Aktiviert* angezeigt wird.
  2. Falls deaktiviert: Starte den Laptop neu, öffne das BIOS/UEFI (meist `F2`, `F12` oder `Entf`) und aktiviere unter *Security* oder *CPU Configuration* die Optionen **Intel Virtualization Technology (VT-x)** und **Intel VT-d** (bzw. **SVM Mode** und **AMD IOMMU** bei AMD-Prozessoren).
  3. Speichere die BIOS-Einstellung, starte das System normal und führe erneut aus:
     ```bash
     node bin/eden.mjs gate5 --profile=qubes-whonix
     ```

### Fall B: `G5-04` oder `G5-05` meldet zu wenig RAM oder freien Speicherplatz

- **Ursache:** Das gewählte Zielprofil (z. B. `qubes-whonix` mit mindestens 16 GB RAM und 128 GB freiem Speicher) übersteigt die aktuell freien Ressourcen.
- **Lösung & Wiederholung:**
  1. Schließe nicht benötigte Programme bzw. schaffe auf einem separaten Datenträger Platz – **oder**
  2. Wechsle auf ein ressourcenschonenderes Profil wie `windows-workbench`, `linux-kvm` oder `tails-live`:
     ```bash
     node bin/eden.mjs gate5 --profile=windows-workbench
     ```

### Fall C: `G5-08` (Backup-Nachweis) oder `G5-09` (Medienverifikation) steht auf `unbekannt`

- **Ursache:** Nach dem **Fail-Closed-Prinzip** setzt Gate 5 niemals stillschweigend voraus, dass ein Backup existiert oder eine heruntergeladene ISO-Datei echt ist.
- **Lösung & Wiederholung:**
  1. Erstelle vor jeder späteren Systemänderung ein vollständiges Backup deiner wichtigen Daten auf einem externen Speichermedium und prüfe, ob sich mindestens eine Testdatei daraus wiederherstellen lässt.
  2. Prüfe heruntergeladene Installationsmedien immer mittels SHA-256:
     - **Windows PowerShell:** `Get-FileHash -Algorithm SHA256 .\dein-abbild.iso`
     - **Linux:** `sha256sum ./dein-abbild.iso`

### Fall D: Fehler beim Speichern mit `--save-report` (`EEXIST`)

- **Ursache:** Die angegebene Zieldatei existiert bereits. Gate 5 überschreibt aus Sicherheitsgründen niemals vorhandene Berichte.
- **Lösung:** Wähle einen neuen Dateinamen mit Zeitstempel oder Versionsnummer:
  ```bash
  node bin/eden.mjs gate5 --save-report=./gate5-bericht-lauf2.json
  ```

### Fall E: Konfigurationsfehler (`config/gate5-preflight.v0.1.0.json` beschädigt)

- **Ursache:** Falls eine eigene Konfigurationsdatei über `--config=...` übergeben wurde und ungültiges JSON enthält oder versucht, `read_only: false` zu setzen, blockiert Gate 5 sofort mit Exit-Code `2`.
- **Recovery:** Stelle die Originalkonfiguration aus Git wieder her oder lasse den Parameter `--config` weg, um die geprüfte Standardkonfiguration zu nutzen:
  ```bash
  git checkout -- config/gate5-preflight.v0.1.0.json
  node bin/eden.mjs gate5
  ```
