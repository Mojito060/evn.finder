# Deployment

Jeder Merge/Push nach `main` baut automatisch ein Docker-Image, pusht es in
die GitHub Container Registry (GHCR) und deployed es per selbst-gehostetem
GitHub-Actions-Runner auf den Produktionsserver.

## Einmalige Einrichtung auf dem Server

### 1. Self-hosted Runner installieren

In diesem Repo unter **Settings → Actions → Runners → New self-hosted
runner** die für dein OS passenden Befehle kopieren und auf dem Server
ausführen. Danach den Runner als Dienst installieren, damit er nach einem
Reboot automatisch wieder läuft:

```bash
./svc.sh install
./svc.sh start
```

Der Runner-User braucht Zugriff auf den Docker-Daemon (z.B. Mitglied der
Gruppe `docker`).

### 2. Deploy-Verzeichnis anlegen

Das Deploy-Verzeichnis liegt bewusst außerhalb des (ephemeren) Runner-
Workspaces, damit `.env` mit den echten Secrets nie im Git-Checkout landet:

```bash
sudo mkdir -p /opt/evn-finder
sudo chown $(whoami) /opt/evn-finder
```

Aus dem Repo `docker-compose.prod.yml` und `.env.example` nach
`/opt/evn-finder` kopieren, `.env.example` zu `.env` umbenennen und mit den
echten Werten befüllen (RIS-API-Zugangsdaten etc., siehe Kommentare in der
Datei):

```bash
cp docker-compose.prod.yml /opt/evn-finder/
cp .env.example /opt/evn-finder/.env
chmod 600 /opt/evn-finder/.env
$EDITOR /opt/evn-finder/.env
```

Falls der Deploy-Workflow ein anderes Verzeichnis nutzen soll: Repository-
Variable `DEPLOY_DIR` unter **Settings → Actions → Variables** setzen.

### 3. GHCR-Image sichtbar machen

Standardmäßig ist das gepushte Image in GHCR privat. Der Deploy-Job loggt
sich mit dem automatischen `GITHUB_TOKEN` ein, das reicht zum Pullen aus
demselben Repo/Org. Falls das Package-Sichtbarkeits-Setting es verlangt,
einmalig unter **github.com/Mojito060?tab=packages** → Package →
**Package settings** den Runner/das Repo als berechtigt hinzufügen (meist
automatisch der Fall).

### 4. Reverse Proxy auf evn.alkstarz.de

Der A-Record auf `evn.alkstarz.de` existiert bereits. Der App-Container
bindet nur lokal auf `127.0.0.1:9042`. Im vorhandenen Reverse Proxy
(nginx/Caddy/Traefik – was auf dem Server schon läuft) einen vhost/Route
für `evn.alkstarz.de` anlegen, der auf `127.0.0.1:9042` proxied, plus
TLS-Zertifikat (z.B. via certbot oder was der Proxy schon nutzt).

Beispiel nginx-Snippet:

```nginx
server {
    server_name evn.alkstarz.de;
    listen 443 ssl;

    location / {
        proxy_pass http://127.0.0.1:9042;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Ablauf beim Deploy

1. Push/Merge nach `main`.
2. Job `build-and-push`: baut das Image, pusht `ghcr.io/mojito060/evn.finder:latest`
   und `:<commit-sha>`.
3. Job `deploy` (läuft auf dem self-hosted Runner): pullt das neue Image,
   führt in `/opt/evn-finder` `docker compose up -d` mit dem neuen
   `IMAGE_TAG` aus und entfernt alte Images.

## Manuelles Deployment / Rollback

```bash
cd /opt/evn-finder
IMAGE_TAG=<commit-sha-oder-latest> docker compose -f docker-compose.prod.yml up -d
```

Logs ansehen: `docker compose -f docker-compose.prod.yml logs -f app`
