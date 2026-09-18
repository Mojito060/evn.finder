# EVN Finder

Ein auf [bahn.expert](https://bahn.expert) basierender, stark reduzierter
Fork, der **nur noch eine einzige Funktion** enthält: EVNs (Europäische
Fahrzeugnummern / UIC-Wagennummern) suchen und lokal merken.

> Hinweis zum Ausgangszustand: Der öffentliche Fork-Branch `main`
> enthielt zum Zeitpunkt dieses Umbaus nur noch eine README (der
> bahn.expert-Quellcode wurde vom Original-Autor closed-source gestellt).
> Der tatsächliche letzte offene Quellcode lag im Branch `lastPublic` und
> wurde als Basis für diesen Umbau verwendet.

## Was die App macht

Es gibt genau drei Tabs, sonst nichts (keine Abfahrtstafel, keine
Routenplanung, keine Zugläufe-Übersicht, kein Streik-Banner, keine
Analytics/Cookies/Popups):

1. **Zug suchen** – Zugnummer (+ optional Gattung) und Datum eingeben,
   danach alle Halte der Fahrt sehen und an einem beliebigen Halt die
   Wagenreihung inkl. EVNs abrufen.
2. **Liniensuche** – Bahnhof + Linie(n) (z.B. „S1“, oder kommagetrennt
   „RE1, RE6“) + Tag eingeben, um alle Fahrten dieser Linie an diesem Tag
   zu sehen und pro Fahrt die Wagenreihung/EVNs zu laden.
3. **EVN suchen** – Eine EVN/UIC-Fahrzeugnummer direkt eingeben, um **alle
   Fahrten dieses Fahrzeugs** an diesem Tag zu sehen – inklusive
   Linienwechseln im Tagesverlauf (z.B. wenn ein Rhein-Ruhr-Express-Zug
   vormittags als RE1 und nachmittags als RE6 fährt). Das funktioniert
   über die offizielle RIS::Transports-Funktion „Fahrten pro Fahrzeug“,
   nicht über Raten/Heuristiken.

Über die "Merken"-Buttons (Lesezeichen-Symbol) kann jede gefundene EVN in
eine persönliche Liste übernommen werden. Von dort aus lässt sich mit
einem Klick direkt wieder nach den Fahrten dieser EVN suchen.

## Privacy first

Alles, was gespeichert wird (Merkliste der EVNs inkl. optionaler Notiz),
liegt **ausschließlich im `localStorage` des Browsers** unter dem Schlüssel
`evnFinder.savedEvns.v1`. Es gibt:

- keinen Account/Login,
- keinen Server-seitigen Speicher für Nutzerdaten,
- kein Tracking, keine Analytics, keine Cookies, keine Consent-Banner.

Export/Import als JSON-Datei ist möglich (Sidebar → „Export“/„Import“), um
die Merkliste manuell zu sichern oder auf ein anderes Gerät zu übertragen.

## Datenquellen

Die Bahn-Daten kommen weiterhin von der Deutschen Bahn (RIS-API-Familie),
genau wie im ursprünglichen bahn.expert:

| Feature | Endpoint | Env-Variablen |
|---|---|---|
| Halte einer Fahrt (Zugsuche) | RIS::Journeys | `RIS_JOURNEYS_V2_URL`, `RIS_JOURNEYS_V2_CLIENT_ID`, `RIS_JOURNEYS_V2_CLIENT_SECRET` (Fallback `RIS_JOURNEYS_URL`/`_CLIENT_ID`/`_CLIENT_SECRET`) |
| Abfahrten für Liniensuche | RIS::Boards | `RIS_BOARDS_URL`, `RIS_BOARDS_CLIENT_ID`, `RIS_BOARDS_CLIENT_SECRET` |
| Wagenreihung/EVNs | RIS::Transports (mit automatischem Fallback auf die unauthentifizierte bahn.de-API, falls nicht konfiguriert) | `COACH_SEQUENCE_URL`, `COACH_SEQUENCE_CLIENT_ID`, `COACH_SEQUENCE_CLIENT_SECRET` |
| Alle Fahrten einer EVN (Linienwechsel) | RIS::Transports | `COACH_SEQUENCE_URL`, `COACH_SEQUENCE_CLIENT_ID`, `COACH_SEQUENCE_CLIENT_SECRET` |
| Bahnhofssuche | RIS::Stations | `RIS_STATIONS_URL`, `RIS_STATIONS_CLIENT_ID`, `RIS_STATIONS_CLIENT_SECRET` |

Zugangsdaten gibt es kostenlos über den
[DB API Marketplace](https://developers.deutschebahn.com/db-api-marketplace/apis)
(RIS::Journeys, RIS::Boards, RIS::Transports, RIS::Stations abonnieren).
Ohne `COACH_SEQUENCE_*`-Zugangsdaten funktioniert die Wagenreihung für
aktuelle Fahrten trotzdem meist über den bahn.de-Fallback – nur die
"EVN suchen"-Funktion (Linienwechsel-Erkennung) braucht zwingend
RIS::Transports, da nur diese API eine Fahrt-Historie pro Fahrzeug liefert.

`.env`/Prozess-Umgebung lokal befüllen, dann:

```bash
corepack enable
pnpm install
pnpm dev
```

## Technischer Hintergrund / was entfernt wurde

Basis ist weiterhin TanStack Start + tRPC (kein Next.js, wie es eine
ältere README-Version mal behauptete). Entfernt wurden alle UI-Features
außer der EVN-Suche: Abfahrtstafel, Routenplanung, Zugläufe-Browser,
About-Seite, Einstellungen, Favoriten (Cookies), Politik-Popup,
Feedback-Snackbar und das Analytics-Skript. Der tRPC-Router wurde auf
`coachSequence`, `journeys`, `boards` und `stopPlace` reduziert.

Da die komplette UI neu gebaut wurde, sind die alten Cypress-E2E-Tests
(Abfahrten/Routing/Settings/etc.) entfernt worden – sie testen
UI-Elemente, die es nicht mehr gibt. Für die neue Oberfläche existiert
bisher keine automatisierte Testabdeckung; das wäre ein guter nächster
Schritt.

## Self Hosting

Für Wagenreihung ohne DB-Zugangsdaten reicht der bahn.de-Fallback. Für
alle anderen Features (Zugsuche, Liniensuche, EVN-Fahrt-Historie) werden
eigene RIS-Zugangsdaten benötigt (siehe oben) – die Original-App wurde
mit intern verteilten, nicht-öffentlichen Zugangsdaten betrieben.

## Branching & Deployment

Entwicklung läuft über Feature-Branches → `develop` → `main`. Ein Merge
nach `main` deployed automatisch per Docker/GHCR auf den Server. Details:
[`CONTRIBUTING.md`](./CONTRIBUTING.md) und [`DEPLOYMENT.md`](./DEPLOYMENT.md).

## Cross browser testing

Big thanks to [BrowserStack](https://browserstack.com)  
<a href="https://browserstack.com"><img width=200 src="https://live.browserstack.com/images/opensource/browserstack-logo.svg"></a>
