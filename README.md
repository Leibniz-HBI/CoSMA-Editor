# CoSMA-Editor
This repository contains the **Co**laborative **S**ocial **M**edia **A**ccount-**Editor**.
The CoSMA-Editor is a web application allowing communities to merge and curate lists of social media accounts

# Note
The repository is still in its infancy.
More details will be added in the future.

# Running
Currently there is no recommended way of running CoSMA-Editor.
Please see the _Development_ section.

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
* Generate a secret key using `< /dev/urandom tr -dc _A-Z-a-z-0-9 | head -c${1:-64};echo`;.
* Copy the secret key and paste it as the value of the variable `DJANGO_KEY` in the `.env` file.
* Set the variable `COSMAE_DEBUG` to true in the `.env` file.
* Generate a local database by runing `poetry run ./manage.py migrate`.
## Running
* Start the backend by running `poetry run ./manage.py  runserver`.
* In a seperate shell switch to the `ui` directory and run `npm start`.

# Funding
The CoSMA-Editor is funded by the German Federal Ministry of Education and Reasearch under grant number 01UG2151A-D
