# Bedienungsanleitung — EDEN Gate 5 Universal Hardware Preflight (Einsteigerfreundlich)

Diese Anleitung erklärt Schritt für Schritt, wie du mit **EDEN Gate 5** deinen Windows- oder Linux-Laptop sicher auf seine Eignung für EDEN LAPTOP-OS prüfst.

> **Wichtiges Sicherheitsversprechen:**  
> Gate 5 arbeitet **ausschließlich im Nur-Lese-Modus (Read-Only)**. Es werden **keine** Festplatten partitioniert, **keine** Daten gelöscht und **keine** Einstellungen im BIOS/UEFI oder Bootloader verändert.

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

---

## 3. Bestimmtes Zielprofil prüfen

Standardmäßig prüft Gate 5 das strengste Sicherheitsprofil (`qubes-whonix`). Du kannst jedes der fünf unterstützten Profile gezielt auswählen:

| Zielprofil | Befehl | Wann verwenden? |
|:--|:--|:--|
| **Qubes OS + Whonix** | `node bin/eden.mjs gate5 --profile=qubes-whonix` | Für maximale Hardware-Isolation auf eigenem Sicherheits-Laptop (mind. 16 GB RAM, VT-x/AMD-V + IOMMU) |
| **Linux KVM + EDEN-Term** | `node bin/eden.mjs gate5 --profile=linux-kvm` | Für Linux-Laptops mit virtuellen Maschinen (mind. 8 GB RAM) |
| **Windows Workbench** | `node bin/eden.mjs gate5 --profile=windows-workbench` | Für die lokale Nutzung der EDEN-Term-Oberfläche direkt unter Windows 11 |
| **Tails Live-USB** | `node bin/eden.mjs gate5 --profile=tails-live` | Für den spurlosen Start von einem verifizierten USB-Stick (mind. 4 GB RAM) |
| **Kali Audit-Profil** | `node bin/eden.mjs gate5 --profile=kali-audit` | Für isolierte Sicherheits- und Netzwerkprüfungen |

---

## 4. Maschinenlesbaren JSON-Bericht erzeugen und speichern

Für automatisierte Auswertungen oder zur Archivierung kannst du den Bericht im JSON-Format ausgeben oder in eine neue Datei schreiben lassen:

```bash
# JSON direkt im Terminal anzeigen:
node bin/eden.mjs gate5 --profile=linux-kvm --json

# Bericht sicher in eine neue Datei speichern (bestehende Dateien werden niemals überschrieben):
node bin/eden.mjs gate5 --profile=qubes-whonix --save-report=./mein-gate5-bericht.json
```

---

## 5. Was bedeuten die Ergebnisse?

Gate 5 bewertet jede Eigenschaft mit genau einem von drei Begriffen:

1. **`verfügbar` (`available`)** — Dein Laptop erfüllt diesen Punkt nachweislich.
2. **`nicht verfügbar` (`unavailable`)** — Diese Funktion fehlt oder ist im BIOS/UEFI noch ausgeschaltet (z. B. Virtualisierung oder zu wenig freier Speicherplatz).
3. **`unbekannt` (`unknown`)** — Die Information konnte im normalen Benutzerkonto nicht eindeutig ausgelesen werden oder ein Nachweis (wie Backup oder ISO-Prüfsumme) wurde noch nicht übergeben.

### Bedeutung des Gesamtstatus (`overall_status`)

- **`BLOCKED`:** Mindestens eine Pflichtvoraussetzung ist `nicht verfügbar` (z. B. zu wenig RAM).
- **`REVIEW_REQUIRED`:** Keine Pflichtvoraussetzung ist fehlgeschlagen, aber mindestens ein Prüfpunkt steht noch auf `unbekannt` (z. B. IOMMU-Status im BIOS prüfen oder Backup-Nachweis ergänzen).
- **`READY_FOR_HUMAN_REVIEW`:** Alle technischen Prüfpunkte `G5-01` bis `G5-09` sind `verfügbar`. Tor `G5-10` hält das System weiterhin sicher im Lesemodus, bis du selbst über das weitere Vorgehen entscheidest.
