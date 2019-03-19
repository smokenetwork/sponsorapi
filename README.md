# sponsorapi
backend api for smoke sponsor service which is a page listing sponsors.

There are 2 main components: api and cronjob


### API
- **http://localhost:8200/list**  
To get the list of all sponsors

- **http://localhost:8200/status**  
For debug only


Using embedded cache to avoid db bottleneck.

default port is 8200, to change the port set `PORT` env

To start api, run:
```
node api.js
```


### cronjob
Tracking for incoming `transfer` tx of an account, if the amount is > `10000.000 SMOKE` then sender become a sponsor.

Acount to receive, and min amount are configuable in `config.json`.

To run cronjob, run:
```
node cronjob.js
```


### Data
Using embedded sqlite so no external db or config needed.

Data is stored in `./data/_db.db` as default and configuable `config.json`


### Config
There is sample config file `config.sample.json`, copy this file to `config.json` before running.
