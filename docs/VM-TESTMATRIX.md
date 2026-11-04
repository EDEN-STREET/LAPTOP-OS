# EDEN – virtuelle npm-Testmatrix und Abnahmekriterien

**Implementationszweig:** `feature/one-command-safe-quickstart-v0.1.0`.

| Testebene | Verfahren | Aussage |
|---|---|---|
| Paket | `npm ci`, `npm pack --dry-run` | Lockfile und tarball-fähige App |
| npm-Lifecycle | `npm test` | Kein installierendes `preinstall` / `postinstall` |
| Isolierte virtuelle Laptop-Datenablage | `tests/quickstart.test.mjs` | Keine Writes vor Freigabe; nur neue versionierte App-Dateien; idempotent |
| Virtuelle Windows-Sentinel | gleiches Testmodul | Gedachte Windows-Systemdatei wird nie verändert |
| Defekte Zustimmungs-/UI-Dateien | Negativtests | Fail-closed; kein stilles Überschreiben |
| Netzwerk-Design | `tests/network-policy.test.mjs` | Bei fehlenden Belegen BLOCKED; auch bei sämtlichen Angaben keine live Netzwerkfreigabe |
| Browser lokal | vorhandene HTTP-/UI-Tests | HTTP nur an 127.0.0.1, keine Schreib-API |
| Windows/Linux | GitHub Actions Node 22 auf `windows-latest` und `ubuntu-latest` | npm-Laufzeitumgebung geprüft |
| Reale VM mit Windows-Laufwerk | **NICHT AUSGEFÜHRT** | Kein echter Disk-/OS-Reinstall-Test |
| Qubes/Whonix real | **NICHT AUSGEFÜHRT** | Netzwerkisolation/Kill-Switch nicht belegt |
| Tails Live-Medium | **NICHT AUSGEFÜHRT** | Boot-, USB- und Tor-Verifikation nicht belegt |

## Release-Gates

1. Versionsdaten in package.json, shrinkwrap und core übereinstimmend.
2. CI auf Windows und Linux vollständig grün.
3. Virtuelle Sentinel und negative Fälle erfolgreich.
4. Browser-Oberfläche und Architektur-Demo erreichbar.
5. Sicherheitstexte korrekt: LOCAL_UI_ONLY und PLAN_ONLY.
6. Keine rückwirkende Freigabe für OS-/Disk-/Netzwerkoperationen.
7. Separater Review und Merge nach aktualisiertem GitHub-HEAD.

## Reproduzierbarer Ablauf

```bash
npm ci --ignore-scripts
npm test
npm run test:quickstart
npm pack --dry-run
```

Alle Prüfungen können in einem kurzlebigen CI-Runner durchgeführt werden. Die Sentinel-Datei liegt ausschließlich in einem temporären Testordner.

## Rollback

Vor dem Merge: PR schließen, `main` bleibt unverändert.

Nach einem Merge: Commit gezielt revertieren; vorhandene EDEN-Versionen und Zustimmungsnachweise bleiben in den jeweiligen Benutzerverzeichnissen. Keine pauschale Löschung von Benutzerdaten.

**OS-Installationen oder Netzwerkfreigaben** erfordern separate spätere Gate-Checks und werden durch das Bestehen dieser Tests nicht autorisiert.
