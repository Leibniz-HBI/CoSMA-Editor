# Running CoSMA-Editor
## Prerequisites
To increase security. *CoSMA-Editor* is hosted behind an SSH proxy.
Therefore you need a public SSH key.
In addition for setting up the initial passwords you need the `mkpasswd` tool.
To install it on Debian, Ubuntu and Arch Linux it is provided by the `whois` package that can be installed from your package manager.
## Container Environment
You can run CoSMA-E using `docker compose`.
The following instructions use a single node Docker Swarm.
### Setup Docker Swarm
1. [Install docker](https://docs.docker.com/engine/install/)
2. Setup swarm: `docker swarm init`

You can also edit the file located `docker-compose.yml` to use different ports than the standard 1709 for SSH
For more details how to edit the configuration please check the [Docker Compose file reference](https://docs.docker.com/compose/compose-file/compose-file-v3)
Please substitute your values for patterns starting with a **$** like `$REPLACE_THIS`.
### Start a Container Registry
Start a container running a registry by executing: `docker service create --name registry --publish published=5000,target=5000 registry:3`
### Create Secrets
#### Mandatory Secrets
You can either use the `setup_secrets.py` script for setting up secrets or register the following secrets manually using ` echo "$SECRET_CONTENTS" | docker secret create $SECRET_NAME -`
> **_NOTE:_** With a space at the beginning of the command the secret will not be stored in your command history.

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
 * `cosmae_initial_admin_password` The initial password for the django admin account
#### Optional Secrets
Afterwards you may set the following secrets using ` echo "$SECRET_CONTENTS" | docker secret create $SECRET_NAME -`.
> **_NOTE:_** If you do not want to optional secrets, set them to `0` by ` echo "0" | docker secret create $SECRET_NAME -`.
Otherwise you would have to remove them from the docker compose file.
##### ORCID
> **_NOTE:_** *CoSMA-Editor* runs fine without ORCID as long as users do not paste ORCID-Id into the edit session participant search.

 * `orcid_client_id` containing the orcid client id
 * `orcid_client_secret` containing the orcid client secret
 ##### EMAIL
 > **_NOTE:_** Instead of configuring emails you can also disable them by setting `ACCOUNT_EMAIL_VERIFICATION = "none"` in the file `django_project/settings/settings_production.py`

 * `email_host` containing the SMTP host for outgoing messages
 * `email_host_user` containing the username for the SMTP host
 * `email_host_app_password` containing the password for the SMTP host
 * `email_from` to the address emails are sent from, e.g., `"cosmae@$YOUR_TLD"`
### Create Directories
Create directories using `setup_credentials.py`.
The default location is `/srv/cosmae`. You can change it with the `--directory argument`
### Configure variables
Set the following variables `django_project/settings/settings_production.py`
  * `DOMAIN_NAME` to the correct URL.
  * `EMAIL_SUBJECT_PREFIX` to a value indicating the name of the app.
## Build and Launch Containers

To build the containers, go to the base directory of the repository and run
`docker compose build --build-arg USER_ID=$(id -u cosmae) --build-arg GROUP_ID=$(id -g cosmae)` to build the containers.
Afterwards run `docker compose push` to push the images to the registry.
Start CoSMA-E using `USER_ID=$(id -u cosmae) GROUP_ID=$(id -g cosmae) docker stack deploy --compose-file docker-compose.yml cosmae`
> **_NOTE:_** If you have configured a directory different from `/srv/cosmae` you need to also prepend `HOST_DATA_DIR=${YOUR_DIRECTORY} --detach=true` to the deploy command

## Post Setup
Add the following to your SSH config file:
```
Host cosmae
        HostName ${YOUR_HOST}
        Port 1709
        User cosmartin # or your custom initial user name.
        IdentityFile ${YOUR_SSH_KEY}
        SessionType none
        LocalForward 7070 ui:80
```
Afterwards, run `ssh cosmae` from a terminal.
If there is no error message you connected successfully.
Open you browser and go to 127.0.0.1:7070
