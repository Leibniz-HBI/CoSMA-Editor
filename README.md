# CoSMA-Editor
This repository contains the **Co**laborative **S**ocial **M**edia **A**ccount-**Editor**.
The CoSMA-Editor is a web application allowing communities to merge and curate lists of social media accounts

## Features
Currently the following features are supported:
* View social media account metadata
* Change the displayed metadata fields
* Create new metadata fields
* Edit Data
* Upload batch data in `.csv` format and merge it with existing data, with automatic duplicate detection.

# Running
You can run CoSMA-Editor using `docker compose`.
The following instructions use a single node Docker Swarm.
## Setup Docker Swarm
1. [Install docker](https://docs.docker.com/engine/install/)
2. Setup swarm: `docker swarm init`

You can also edit the file located `docker-compose.yml` to use different ports than the standard 443 for HTTPS and 80 for HTTP
(HTTP is only used SSL certificate renewal challenges).
For more details how to edit the configuration please check the [Docker Compose file reference](https://docs.docker.com/compose/compose-file/compose-file-v3)
Please substitute your values for patterns starting with a **$** like `$REPLACE_THIS`.
1. Start a container running a registry: `docker service create --name registry --publish published=5000,target=5000 registry:2`
2. Create the secrets.
you can either use the `quick_setup.py` script for setting up secrets or register the following secrets manually using ` echo '$SECRET_CONTENTS | docker secret create $SECRET_NAME -'`
  * `cosmae_db_password` contains the database password.
  * `cosmae_db_user` contains the database user name.
  * `cosmae_db_name` contains the name of the database.
  * `cosmae_pg_conf` contains `cosmae_db:5432:$COSMAE_DB_NAME:$COSMAE_DB_USER:$COSMAE_DB_PASSWORD
  * `cosmae_pg_service_file` containing
    ```
    [cosmae_service]
    host=cosmae_db
    port=5432
    dbname=$COSMAE_DB_NAME
    user=$COSMAE_DB_USER
    ```
  * `cosmae_django_key` contains the django secret key.
  You can generate it using `< /dev/urandom tr -dc _A-Z-a-z-0-9 | head -c${1:-64};echo;`
  * `cosmae_redis_password` contains the redis password
  * `cosmae_redis_conf` contains `requirepass $REDIS_PASSWORD`
3. From the base directory of the repository run `docker compose build` to build the containers.
4. Run `docker compose push` to push the images to the registry.
5. Create empty directories:
    * `/srv/cosmae/ssl`
    * `/srv/cosmae/contributions`
    * `/srv/cosmae/acme-challenge`
6. Set your user as owner of the directories: `chown -R ${USER} /srv/cosmae`
7. Add a SSL certificate (`cosmae.crt`) and key (`cosmae.key`) while being in directory `/srv/cosmae/ssl`.
you can create a temporary insecure certificate and key using
```
openssl req -x509 -out /srv/cosmae/ssl/cosmae.crt -keyout /srv/cosmae/ssl/cosmae.key \
   -newkey rsa:2048 -nodes -sha256 \
   -subj '/CN=localhost' -extensions EXT -config <( \
   printf "[dn]\nCN=localhost\n[req]\ndistinguished_name = dn\n[EXT]\nsubjectAltName=DNS:localhost\nkeyUsage=digitalSignature\nextendedKeyUsage=serverAuth")
```
For proper credentials please use [certbot](https://certbot.eff.org/) or [getssl](https://github.com/srvrco/getssl)
8. Run CoSMA-Editor using `docker stack deploy --compose-file docker-compose.yml cosmae`
9. Check that CoSMA-Editor is now accessible over HTTPS's default port 443 on your machine using a browser.
10. Navigate to `http:127.0.0.1:8000` and login using the username `admin` and the password `changeme`.
11. Change the password and possibly the username in the django admin UI.

# Development
There are two projects in this repository.
A backend written in python and a frontend in TypeScript.

## Requirements
Currently the only operating system supported is Linux.
For the backend the project requires Python and poetry as a package manager.
Please install Python with your distros package manager.
Afterwards install poetry using `pip install poetry`.

Node is required for the frontend.
You can find instructions on installing node at [https://github.com/nodesource/distributions]

## Installing dependencies
* For the backend run `poetry install` from the root of the directory.
* For the frontend run `npm install` from  the `ui` directory.

## Preparing the backend
The following steps are required for the initial setup.
You only need to run them once.
* Create an instance of the environment file by running `cp .template.env .env`
* Generate a secret key using `< /dev/urandom tr -dc _A-Z-a-z-0-9 | head -c${1:-64};echo;`.
* Copy the secret key and paste it as the value of the variable `DJANGO_KEY` in the `.env` file.
* Set the variable `COSMAE_DEBUG` to true in the `.env` file.
* Generate a local database by runing `poetry run ./manage.py migrate`.
## Additional Services
You need to run a redis instance for managing task queues.
The easiest way is to launch it in a container: `docker run -p 6379:6379 redis`.
## Running
* Start the backend by running `poetry run ./manage.py  runserver`.
* In a seperate shell switch to the `ui` directory and run `npm start`.

# Funding
The CoSMA-Editor is funded by the German Federal Ministry of Education and Reasearch under grant numbers 01UG2151A-D, 16DTM208A&B and 16DTM404A-E
