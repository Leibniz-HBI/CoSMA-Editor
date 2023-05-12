# CoSMA-Editor
This repository contains the **Co**laborative **S**ocial **M**edia **A**ccount-**Editor**.
The CoSMA-Editor is a web application allowing communities to merge and curate lists of social media accounts

## Features
Currently the following features are supported:
* View social media account metadata
* Change the displayed metadata fields
* Create new metadata fields
* Edit Data

### Planned Features
The following features will be implemented
* Bulk data upload
* Assisted review for merging data from bulk uploads into the database


# Running
You can run CoSMA-Editor using `docker compose`.
The following instructions use files for storing secrets and assume that you can create a folder `/srv/cosmae` for SSL certificates.
To change the mechanism for the secrets or use a different location for the SSL certificates edit the `docker-compose.yml`.
You can also edit the file to use different ports than the standard 443 for HTTPS and 80 for HTTP
(only used for SSL certificate renewal challenges).
For more details how to edit the configuration please check the [Docker Compose file reference](https://docs.docker.com/compose/compose-file/compose-file-v3)
1. From the base directory of the repository run `docker compose build` to build the containers.
2. Create a folder `.secrets` that contains four text files:
  * `cosmae_db_password` contains the database password.
  * `cosmae_db_user` contains the database user name.
  * `cosmae_db_name` contains the name of the database.
  * `cosmae_django_key` contains the django secret key.
  You can generate it using `< /dev/urandom tr -dc _A-Z-a-z-0-9 | head -c${1:-64};echo;`
3. Add a SSL certificate (`cosmae.crt`) and key (`cosmae.key`) to a folder called `/srv/cosmae/ssl`.
4. Create an empty folder `/srv/cosmae/acme-challenge`.
5. Run CoSMA-Editor using `docker compose up`
6. Check that CoSMA-Editor is now accessible over HTTPS's default port 443 on your machine using a browser.
7. Navigate to `http:127.0.0.1:800` and login using the username `admin` and the password `changeme`.
8. Change the password and possibly the username in the django admin UI.


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
The CoSMA-Editor is funded by the German Federal Ministry of Education and Reasearch under grant number 01UG2151A-D
