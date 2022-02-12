# docker-mailserver-webadmin
Quick and dirty docker-mailserver webadmin using NodeJS

=> Read files for display, send docker exec for update

/!\ do not expose on public internet

## Features :
 - manage domains (list/dkim)
 - manage users (list/add/delete/change password)
 - manage alias (list/add/delete)
 - view logs

## Prerequisites :
 - Docker
 - docker-mailserver container (docker.io/mailserver/docker-mailserver:latest)

## Build :
docker-compose --build

## Run :
docker-compose up

## Volumes :
 - all from mailserver (config/mail-data/mail-state/mail-logs)
 - /etc/localtime
 - /var/run/docker.sock

Access with http://127.0.0.1:8080 in web browser or server address.

## TODOs :
 - fix docker compose build image (can't build on my system)
 - clean docker-compose.yml
 - quotas
 - admin system
 - interface refresh timers (async remove users & alias)
 - users restrictions (view/update)
 - better caching on client (domains, users)

## Plans :
 - web API ?
 - change system from file reads to commands only ?
 - domain config checker (mx/spf/dkim)