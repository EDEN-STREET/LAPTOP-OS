# Bedienungsanleitung — EDEN Gate 5 Universal Hardware Preflight (Einsteigerfreundlich)

Diese Anleitung erklärt Schritt für Schritt, wie du mit **EDEN Gate 5** deinen Windows- oder Linux-Laptop sicher im **reinen Lesemodus (Read-Only)** auf seine Eignung für EDEN LAPTOP-OS untersuchst.

> **Wichtiges Sicherheitsversprechen:**  
> Gate 5 ist ein **rein lesendes Diagnosewerkzeug**. Es werden **keine** Festplatten partitioniert, **keine** Daten gelöscht und **keine** Einstellungen im BIOS/UEFI oder Bootloader verändert. Auch nach einem erfolgreichen Durchlauf wird **keine** Betriebssysteminstallation gestartet.

---

## 1. Voraussetzungen

- **Betriebssystem:** Windows 10/11 oder Linux (x86_64 / ARM64)
- **Laufzeitumgebung:** Node.js **Version 22 oder neuer** (inklusive `npm`)
- **Administratorrechte:** **Nicht erforderlich** für den Standard-Durchlauf

---

## 2. Schnellstart in 30 Sekunden

Öffne ein Terminal (**PowerShell** oder **Eingabeaufforderung/CMD** unter Windows, bzw. dein Terminal unter Linux) im Projektordner und führe folgenden Befehl aus:

```bash
npm run gate5
```

Oder direkt über das `eden`-Kommando:

```bash
node bin/eden.mjs gate5
```

Für automatisierte Skripte oder CI-Prüfungen gibt es den **strikten Modus (`--strict`)**, der bei jedem nicht vollständig verifizierten Status (`BLOCKED` oder `REVIEW_REQUIRED` / `unbekannt`) mit einem Fehlercode (`Exit-Code != 0`) endet:

```bash
node bin/eden.mjs gate5 --strict --json
```

---

## 3. Bestimmtes Zielprofil prüfen

Standardmäßig prüft Gate 5 das strengste Sicherheitsprofil (`qubes-whonix`). Du kannst jedes der fünf unterstützten Profile gezielt auswählen:

| Zielprofil | Befehl | Wann verwenden? |
|:--|:--|:--|
| **Qubes OS + Whonix** | `node bin/eden.mjs gate5 --profile=qubes-whonix` | Für maximale Hardware-Isolation auf eigenem Sicherheits-Laptop (mind. 16 GB RAM, mind. 4 physische CPU-Kerne, VT-x/AMD-V + IOMMU) |
| **Linux KVM + EDEN-Term** | `node bin/eden.mjs gate5 --profile=linux-kvm` | Für Linux-Laptops mit virtuellen Maschinen (mind. 8 GB RAM, mind. 4 physische CPU-Kerne) |
| **Windows Workbench** | `node bin/eden.mjs gate5 --profile=windows-workbench` | Für die lokale Nutzung der EDEN-Term-Oberfläche direkt unter Windows 11 |
| **Tails Live-USB** | `node bin/eden.mjs gate5 --profile=tails-live` | Für den spurlosen Start von einem verifizierten USB-Stick (mind. 4 GB RAM) |
| **Kali Audit-Profil** | `node bin/eden.mjs gate5 --profile=kali-audit` | Für isolierte Sicherheits- und Netzwerkprüfungen |

---

## 4. Maschinenlesbaren JSON-Bericht erzeugen und speichern

```bash
# JSON direkt im Terminal anzeigen:
node bin/eden.mjs gate5 --profile=linux-kvm --json

# Bericht sicher in eine neue Datei speichern (bestehende Dateien werden niemals überschrieben):
node bin/eden.mjs gate5 --profile=qubes-whonix --save-report=./mein-gate5-bericht.json
```

---

## 5. Was bedeuten die Ergebnisse (und was sind die Prüfgrenzen)?

Gate 5 bewertet jede Eigenschaft mit genau einem von drei Begriffen:

1. **`verfügbar` (`available`)** — Der abgefragte Schwellenwert oder Systemindikator wurde im Rahmen der lesenden Betriebssystemabfrage bzw. Dateiprüfung als vorhanden gemeldet. *(Hinweis: Eine lesende Betriebssystemabfrage ersetzt keinen echten Boot-Test auf der Zielhardware und keinen manuellen Wiederherstellungstest eines externen Backups.)*
2. **`nicht verfügbar` (`unavailable`)** — Diese Voraussetzung ist laut Systemabfrage unterschritten, fehlt oder ist im BIOS/UEFI deaktiviert (z. B. zu wenig RAM, zu wenige physische CPU-Kerne oder abweichende SHA-256-Prüfsumme).
3. **`unbekannt` (`unknown`)** — Die Information konnte im nicht-privilegierten Benutzermodus technisch nicht zweifelsfrei ermittelt werden (z. B. IOMMU-Tabellen unter Windows ohne Adminrechte, noch nicht zugeordneter Zieldatenträger oder fehlendes Prüfmanifest). **Wichtig:** Bloße Selbstauskünfte ohne echte Prüfdatei werden grundsätzlich als `unbekannt` eingestuft.

### Bedeutung des Gesamtstatus (`overall_status`)

- **`BLOCKED`:** Mindestens eine Pflichtvoraussetzung ist `nicht verfügbar` (`FAIL`) oder die Konfigurationsdatei verletzt die Sicherheitsvorgaben.
- **`REVIEW_REQUIRED`:** Keine Pflichtvoraussetzung ist hart fehlgeschlagen, aber mindestens ein Prüfpunkt steht auf `unbekannt` (`UNKNOWN`). Nach dem **Fail-Closed-Prinzip** bleibt jede Freigabe gesperrt.
- **`READY_FOR_HUMAN_REVIEW`:** Alle technischen Prüfpunkte `G5-01` bis `G5-09` wurden mit prüfbaren Nachweisen durchlaufen. Tor `G5-10` bleibt in Gate 5 v0.1.0 dennoch dauerhaft `BLOCKED` (`installation_authorized: false`), da dieses Modul ausschließlich der Diagnose dient.


## Präzisierung der Nachweisgrenzen (EDEN Integration)

- Ein lokaler SHA-256-Abgleich beweist nur Gleichheit mit einem Vergleichswert. Wenn Prüfmanifest und Referenzhash vom selben Aufrufer stammen, ist **keine unabhängige Herausgeber- oder Signaturprüfung** erfolgt. Der Status bleibt `UNKNOWN`.
- Eine selbst erzeugte Restore-Nachweisdatei mit passendem Hash beweist **keinen realen Restore-Test**. Der Status bleibt `UNKNOWN`.
- Durch Eingaben behauptete Geräte-ID, Partitionsübersicht und freie Kapazität beweisen **keine OS-seitig bestätigte Zieldatenträgerzuordnung**. Der Status bleibt `UNKNOWN`.
- `--strict` ist eine **Readiness-Sperre** und darf keinen Erfolg für eine nicht unabhängig überprüfte Installation melden. Der normale Exit-Code 0 bedeutet nur, dass der Bericht erzeugt wurde.
- Qubes/Whonix und Tails bleiben getrennte Zielumgebungen. Die Qubes-Dokumentation: https://www.qubes-os.org/doc/system-requirements/ und https://www.qubes-os.org/doc/InstallationGuide/.
