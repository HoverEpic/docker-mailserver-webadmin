# docker-mailserver-webadmin

Quick and dirty [docker-mailserver](https://github.com/docker-mailserver/docker-mailserver) webadmin using NodeJS

Standalone version of [jeboehm/docker-mailserver](https://github.com/jeboehm/docker-mailserver)

=> Read files for display, send docker exec for update

/!\ do not expose on public internet, or, do it at your own risks. I'm not a security expert.

## Features :
 - manage domains (list/dkim)
 - manage users (list/add/delete/change password/restrict/quotas)
 - manage web admins
 - manage alias (list/add/delete)
 - view logs

## Prerequisites :
 - Docker
 - [docker-mailserver](https://github.com/docker-mailserver/docker-mailserver) container

## Build :
docker-compose --build or ./docker_build.sh

## Compose :
### First edit docker-compose.yml with your own env

docker-compose up

## Volumes :
 - all from mailserver (config/mail-data/mail-logs)
 - /etc/localtime
 - /var/run/docker.sock
 - /usr/src/app/config/

Access with http://127.0.0.1:8080 in web browser or server address.

## TODOs :
 - fix docker compose build image (can't build/test on my system)
 - standalone change password page for all clients
 - add first start admin setup

## Plans :
 - web API ?
 - change system from file reads to commands only ?
 - domain config checker (mx/spf/dkim)