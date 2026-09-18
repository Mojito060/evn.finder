# Branch- & Deploy-Workflow

## Branches

- `main` – immer deploybar. Jeder Push/Merge auf `main` löst automatisch ein
  Deployment auf den Produktionsserver aus (`.github/workflows/deploy.yml`).
- `develop` – Integrationsbranch. Feature-Branches werden hierhin gemerged.
- `feature/<kurzbeschreibung>` – ein Branch pro Feature/Fix, abgezweigt von
  `develop`.

## Ablauf

1. Neuen Branch von `develop` erstellen: `feature/<kurzbeschreibung>`.
2. Änderungen committen, pushen, Pull Request gegen `develop` öffnen.
3. CI (`.github/workflows/ci.yml`) muss grün sein, Review erfolgt im PR.
4. Nach Merge in `develop`: dort testen/beobachten.
5. Wenn `develop` stabil ist: Pull Request von `develop` nach `main` öffnen.
6. Merge nach `main` → GitHub Actions baut das Docker-Image, pusht es zu
   GHCR (`ghcr.io`) und deployed es automatisch auf den Server
   (siehe [`DEPLOYMENT.md`](./DEPLOYMENT.md)).

Es wird nicht direkt auf `develop` oder `main` entwickelt – jede Änderung
kommt über einen Feature-Branch + Pull Request.

Empfehlung: In den Repository-Einstellungen unter *Settings → Branches*
Branch-Protection-Regeln für `main` und `develop` aktivieren (PR + grüne CI
erforderlich, keine direkten Pushes).
