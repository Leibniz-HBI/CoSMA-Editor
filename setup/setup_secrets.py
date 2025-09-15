#!/usr/bin/python3
"Quick setup for CoSMA-Editor, will generate all necessary secrets and print them."
import secrets
import subprocess
from argparse import ArgumentParser


def generate_key(key_length=64):
    "Generate random secret keys"
    allowed_chrs = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#%&*()[]:\\/?<>"
    return "".join(secrets.choice(allowed_chrs) for i in range(key_length))


def mk_parser():
    "Create a parser"
    parser = ArgumentParser(
        prog="cosmae-quick-setup",
        description="Quick setup for CoSMA-E, will generate all necessary secrets and print them.",
    )
    parser.add_argument("--db-password", help="password for the database")
    parser.add_argument(
        "--db-user",
        help="username for accessing the database",
        default="cosmae-db-user",
    )
    parser.add_argument(
        "--db-name", help="name to use for the database", default="cosmae-data"
    )
    parser.add_argument("--django-key", help="Key used for django")
    parser.add_argument("--redis-password")
    parser.add_argument(
        "--show", "-s", help="Do not print the generated secrets", action="store_true"
    )
    return parser


def add_docker_swarm_secret(key, value):
    "Create a Docker Swarm secret."
    subprocess.run(
        [f"echo '{value}' | docker secret create {key} -"],
        shell=True,
        check=True,
        stdout=None,
    )


if __name__ == "__main__":
    arg_parser = mk_parser()
    args = arg_parser.parse_args()
    DJANGO_SECRET_KEY = args.django_key
    if DJANGO_SECRET_KEY is None:
        DJANGO_SECRET_KEY = generate_key()
    DB_PASSWORD = args.db_password
    if DB_PASSWORD is None:
        DB_PASSWORD = generate_key(16)
    REDIS_PASSWORD = args.redis_password
    if REDIS_PASSWORD is None:
        REDIS_PASSWORD = generate_key(16)

    PG_CONF = f"db:5432:{args.db_name}:{args.db_user}:{DB_PASSWORD}"
    PG_SERVICE_FILE = f"""host=db
port=5432
dbname={args.db_name}
user={args.db_user}
"""
    REDIS_CONF = f"requirepass {REDIS_PASSWORD}"

    add_docker_swarm_secret("cosmae_db_password", DB_PASSWORD)
    add_docker_swarm_secret("cosmae_db_user", args.db_user)
    add_docker_swarm_secret("cosmae_db_name", args.db_name)
    add_docker_swarm_secret("cosmae_pg_conf", PG_CONF)
    add_docker_swarm_secret("cosmae_pg_service_file", PG_SERVICE_FILE)
    add_docker_swarm_secret("cosmae_django_key", DJANGO_SECRET_KEY)
    add_docker_swarm_secret("cosmae_redis_password", REDIS_PASSWORD)
    add_docker_swarm_secret("cosmae_redis_conf", REDIS_CONF)

    if args.show:
        print(f"DJANGO_SECRET_KEY={DJANGO_SECRET_KEY}")
        print(f"DB_PASSWORD={DB_PASSWORD}")
        print(f"PG_CONF={PG_CONF}")
        print(f"DB_SERVICE_FILE={PG_SERVICE_FILE}")
        print(f"REDIS_PASSWORD={REDIS_PASSWORD}")
        print(f"REDIS_CONF={REDIS_PASSWORD}")
