# Running CoSMA-Editor

## Container Environment
You can run CoSMA-E using `docker compose`.
The following instructions use a single node Docker Swarm.
### Setup Docker Swarm
1. [Install docker](https://docs.docker.com/engine/install/)
2. Setup swarm: `docker swarm init`

You can also edit the file located `docker-compose.yml` to use different ports than the standard 1709 for SSH
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
    host=db
    port=5432
    dbname=$COSMAE_DB_NAME
    user=$COSMAE_DB_USER
    ```
  * `cosmae_django_key` contains the django secret key.
  You can generate it using `< /dev/urandom tr -dc _A-Z-a-z-0-9 | head -c${1:-64};echo;`
  * `cosmae_redis_password` contains the redis password
  * `cosmae_redis_conf` contains `requirepass $REDIS_PASSWORD`.
  * `orcid_client_id` containing the orcid client id
  * `orcid_client_secret` containing the orcid client secret
  * `email_host` containing the SMTP host for outgoing messages
  * `email_host_user` containing the username for the SMTP host
  * `email_host_app_password` containing the password for the SMTP host
3. Create directories using `setup_credentials.py`
4. Set the `DOMAIN_NAME` variable in `django_project/settings/settings_production.py` to the correct URL.
5. From the base directory of the repository run `docker compose build` to build the containers.
6. Run `docker compose push` to push the images to the registry.
7. Run CoSMA-E using `docker stack deploy --compose-file docker-compose.yml cosmae`
8. Check that CoSMA-E is now accessible over HTTPS's default port 443 on your machine using a browser.
9. Navigate to `http:127.0.0.1:8000` and login using the username `admin` and the password `changeme`.
10. Change the password and possibly the username in the django admin UI.
