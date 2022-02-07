# docker-mailserver-webadmin
Quick and dirty docker-mailserver webadmin using NodeJS
Read only for now !


## Features :
 - manage domains
 - manage users
 - manage alias

## Prerequisites :
 - Docker
 - docker-mailserver container

## Build :
docker-compose --build

## Run :
docker-compose up

## Volumes :
 - TODO

Access with http://127.0.0.1:8080 in web browser or server address.

## TODOs :
 - implements docker client to send updates commands
 - Quotas
 - DKIM

## Plans :
 - auth / tokens
 - web API
 - change system from file reads to commands only