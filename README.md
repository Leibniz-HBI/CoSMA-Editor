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
See [Setup](setup/readme.md)

# Usage
Please check the [manual](manual/readme.md).
# Development
There are two projects in this repository.
A backend written in Python and a frontend in TypeScript.

## Requirements
Currently the only operating system supported is Linux.
For the backend the project requires Python and poetry as a package manager.
Please install Python and pipx with your distributions package manager.
Afterwards install poetry using `pipx install poetry`.

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
* In a separate shell switch to the `ui` directory and run `npm start`.

# Acknowledgements
## Community Input
The features of *CoSMA-Editor* where suggested and refined in multiple co-creation workshops.
Without the input from those meetings, development would not have been possible.
## Funding
The CoSMA-Editor is funded by the German Federal Ministry of Education and Reasearch under grant numbers 01UG2151A-D, 16DTM208A&B and 16DTM404A-E
