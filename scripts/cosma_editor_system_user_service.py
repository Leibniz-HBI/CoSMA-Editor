"Handle user management for Cosmae on the host machine."

import json
import logging
import select
import subprocess
from os import chmod, mkfifo
from os.path import exists
from shutil import chown, copy
from sys import argv
from tempfile import NamedTemporaryFile

USER_HOME_DIR = "/srv/cosmae/user_home"


def create_user(group_name: str, username: str, password_hash: str, user_id: int):
    "Method for creating a new user"
    logging.info("Creating user %s.", username)
    with subprocess.Popen(
        [
            "/usr/sbin/useradd",
            "-u",
            str(20_000 + user_id),
            "-g",
            group_name,
            "-m",
            "-b",
            USER_HOME_DIR,
            f"{group_name}_{username}",
        ]
    ) as process:
        if process.wait() == 0:
            set_password(group_name, username, password_hash, user_id)


def check_hashed_password(hashed_password: str):
    "make sure that only permitted chars are used in password"
    for char in hashed_password:
        c_ord = ord(char)
        if c_ord > 90:  # ord('Z')
            if c_ord < 97 or c_ord > 122:  # ord('a') and ord('z')
                return False
            return True
        if c_ord >= 65:  # ord('A')
            return True
        if c_ord > 57 or (  # ord('9'),
            c_ord < 46 and c_ord != 36  #  ord('.') and ord('$')
        ):
            return False
        return True


def set_password(
    group_name: str,
    username: str,
    password_hash: str,
    user_id: int,  # pylint: disable=unused-argument
):
    "Set password of a user."
    with NamedTemporaryFile("w", encoding="ascii") as tmp_file:
        logging.info("Set password for user %s", username)
        sed_command = (
            f"s/^\\({group_name}_{username}\\):[^:]*:\\(.*\\)"
            f"/\\1:{password_hash.replace("/", "\\/")}:\\2/"
        )
        with subprocess.Popen(
            [
                "/usr/bin/sed",
                sed_command,
                "/etc/shadow",
            ],
            stdout=tmp_file,
        ) as process:
            if process.wait() == 0:
                chown(tmp_file.name, "root", "shadow")
                copy(tmp_file.name, "/etc/shadow")


methods = {"create_user": create_user, "set_password": set_password}


def echo_debug(text):
    """Method for simply printing some text.
    This is intended for debugging/testing purposes."""
    print(text)


def consume_pipe(pipe_path: str, group_name: str):
    "Consume events from the provided named pipe."
    with open(pipe_path, "r", encoding="utf8") as pipe:
        pollobj = select.poll()
        pollobj.register(pipe, select.POLLIN)
        logging.info("Opening pipe")

        while True:
            for _, evt in pollobj.poll():
                if evt & select.POLLIN:
                    for line in pipe.readlines():
                        decoded = json.loads(line)
                        try:
                            command = decoded.get("command")
                            methods[command](group_name, **decoded["arguments"])
                        except KeyError:
                            if command is not None:
                                print(f"Unknown command {command}")
                            else:
                                print("Could not read command.")


def create_group(group_name):
    "Create the user group if it does not exist."
    with open("/etc/group", "r", encoding="ascii") as group_file:
        for line in group_file.readlines():
            if line.startswith(group_name):
                logging.info("Group %s already exists, moving on.")
                return
    logging.info("Create group %s", group_name)
    with subprocess.Popen(
        ["/usr/sbin/groupadd", "-f", "-g", "100000", group_name]
    ) as process:
        if process.wait() != 0:
            raise Exception(  # pylint: disable=broad-exception-raised
                "Could not create group"
            )


def create_pipe(pipe_path):
    "Create a pipe if it does not exist."
    if not exists(pipe_path):
        mkfifo(pipe_path, mode=0o666)
        chmod(pipe_path, 0o666)


if __name__ == "__main__":
    PIPE_PATH = argv[1]
    GROUP_NAME = argv[2]
    for c in GROUP_NAME:
        if not c.isalpha():
            raise Exception(  # pylint: disable=broad-exception-raised
                "only characters allowed for group name."
            )
    if len(argv) > 3 and argv[3] in {"-d", "--debug"}:
        methods["echo"] = echo_debug
    create_group(GROUP_NAME)
    create_pipe(PIPE_PATH)
    consume_pipe(PIPE_PATH, GROUP_NAME)
