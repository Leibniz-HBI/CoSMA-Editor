"Create necessary folders and files for CoSMA-Editor"

import logging
import subprocess
from argparse import ArgumentParser
from datetime import datetime, timezone
from os import chmod, chown, geteuid, mkdir, path
from shutil import copyfile
from typing import Set

LOGGER = logging.getLogger("setup_credentials")
_epoch = datetime.fromtimestamp(0, timezone.utc)


def mk_parser():
    "Create a parser"
    parser = ArgumentParser(
        prog="cosmae-quick-setup",
        description="Quick setup for CoSMA-Editor, will generate all necessary local data.",
    )
    parser.add_argument(
        "--directory",
        "-d",
        help="Specify where the data should be located",
        default="/srv/cosmae",
    )
    parser.add_argument("--ssh-key", help="Path to the public ssh key", required=True)
    parser.add_argument(
        "--system-user", help="Name of the created user.", default="cosmae"
    )
    parser.add_argument(
        "--initial-user", help="Name of the initial user.", default="cosmartin"
    )
    parser.add_argument(
        "--group", "-g", help="Name of the created group.", default="cosmae"
    )
    return parser


def create_group(group_name):
    "Create the user group if it does not exist."
    LOGGER.info("Create group %s", group_name)
    with subprocess.Popen(["/usr/sbin/groupadd", "-f", group_name]) as process:
        if process.wait() != 0:
            raise Exception(  # pylint: disable=broad-exception-raised
                "Could not create group"
            )
    return get_group_id(group_name)


def _get_user_id(username):
    with open("/etc/passwd", "r", encoding="ascii") as passwd_file:
        for line in passwd_file.readlines():
            if line.startswith(username):
                return int(line.split(":")[2])
    raise Exception(  # pylint: disable=broad-exception-raised
        "Could not determine user id."
    )


def create_user(
    username, user_id=None, user_home_base_dir=None, group_name=None, create_home=True
):
    "Create a new user"
    cmd = [
        "/usr/sbin/useradd",
    ]
    if user_id is not None:
        cmd += ["-u", str(user_id)]
    if group_name is not None:
        cmd += ["-g", group_name]
    if create_home:
        cmd += ["-m"]
    else:
        cmd += ["-M"]
    if user_home_base_dir is not None:
        cmd += ["-b", user_home_base_dir]
    cmd += [username]

    with subprocess.Popen(cmd) as process:
        create_success = process.wait() != 0
    try:
        user_id = _get_user_id(username)
        return user_id
    except Exception as exc:  # pylint: disable=broad-except
        if create_success:
            raise exc
        raise Exception(  # pylint: disable=broad-exception-raised
            "Could not create user."
        ) from exc


def _get_conf_int_from_file(file_pth, conf_field_name):
    with open(file_pth, "r", encoding="ascii") as login_defs:
        for line in login_defs.readlines():
            if line.startswith(conf_field_name):
                return int(line.split()[1])
    return -1


def _get_user_id_limit():
    limit = 60000
    try:
        limit = max(limit, _get_conf_int_from_file("/etc/login.defs", "UID_MAX"))
    except (OSError, ValueError):
        pass
    try:
        limit = max(limit, _get_conf_int_from_file("/etc/adduser.conf", "LAST_UID"))
    except (OSError, ValueError):
        pass
    return limit


def get_group_id(group_name):
    "Get the group id for a given group name"
    with open("/etc/group", "rt", encoding="ascii") as group_file:
        for line in group_file.readlines():
            if line.startswith(group_name):
                return int(line.split(":")[2])
    return None


def _mk_parent_dir(root_dir):
    "Create a directory and all parent directories if they do not exist."
    if not path.exists(root_dir):
        parts = root_dir.split("/")
        parent_pth = parts[0]
        if not parent_pth:
            parent_pth = "/"
        for part in parts[1:]:
            if not path.exists(parent_pth):
                mkdir(parent_pth)
            parent_pth = f"{parent_pth}/{part}"
        mkdir(parent_pth)


def setup_ssh_proxy(root_dir):
    "Setup necessary files and folders for the ssh proxy."
    ssh_dir = f"{root_dir}/ssh"
    if not path.exists(ssh_dir):
        mkdir(ssh_dir)
    sshd_config_pth = ssh_dir + "/sshd_config"
    if not path.exists(sshd_config_pth):
        with open(sshd_config_pth, "wt", encoding="ascii") as sshd_config:
            sshd_config.write("Port 1709\n")
            sshd_config.write(
                "Ciphers aes256-gcm@openssh.com,aes128-gcm@openssh.com,"
                "aes256-ctr,aes192-ctr,aes128-ctr\n"
            )
            sshd_config.write('AuthenticationMethods "publickey,password"\n')
            sshd_config.write("PasswordAuthentication yes\n")
            sshd_config.write("PermitRootLogin no\n")
            sshd_config.write("KbdInteractiveAuthentication no\n")
            sshd_config.write("UsePAM no\n")
            sshd_config.write("AllowAgentForwarding no\n")
            sshd_config.write("AllowTcpForwarding yes\n")
            sshd_config.write("X11Forwarding no\n")
            sshd_config.write("PrintMotd no\n")
            sshd_config.write("ForceCommand /usr/bin/true\n")
    for key_type in ["rsa", "ecdsa", "ed25519"]:

        key_pth = ssh_dir + f"/ssh_host_{key_type}_key"
        if path.exists(key_pth):
            continue
        with subprocess.Popen(
            [
                "/usr/bin/ssh-keygen",
                "-t",
                key_type,
                "-f",
                key_pth,
                "-N",
                "",
                "-q",
            ]
        ) as process:
            if process.wait() != 0:
                raise Exception(  # pylint: disable=broad-exception-raised
                    f"Could not create {key_type} ssh host key"
                )


def setup_credentials(credentials_dir, username, user_id, group_id):
    "Create necessary files and folders for user credentials."
    add_to_passwd(username, user_id, group_id, credentials_dir)
    password_change_time = int(
        (datetime.now(timezone.utc) - _epoch).total_seconds() // (60 * 60 * 24)
    )
    password_hash = (  # password is 'changeme'
        "$y$jFT$.VleHugrAufPWIAmmAw28/$96G4IbTuE6Avuhxq3SS9x4YxB6N9l4QeVguL4kvRJc8"
    )
    add_to_shadow(username, credentials_dir, password_change_time, password_hash)
    with open(credentials_dir + "/group", "at", encoding="ascii") as group:
        # group inside container will always be "cosmae"
        group.write(f"cosmae:x:{group_id}:\n")


def add_to_passwd(username, user_id, group_id, credentials_dir):
    "Add an user to the passwd file."
    with open(credentials_dir + "/passwd", "at", encoding="ascii") as passwd:
        passwd.write(
            f"{username}:x:{user_id}:{group_id}::/srv/cosmae/home/{username}:/usr/bin/true\n"
        )


def add_to_shadow(username, credentials_dir, password_change_time, password_hash):
    "Add an user to the shadow file."
    with open(credentials_dir + "/shadow", "at", encoding="ascii") as shadow:
        shadow.write(f"{username}:{password_hash}:{password_change_time}::::::\n")


def _copy_user_info_from_host_to_guest(
    username_set: Set[str],
    credentials_pth: str,
    exclude_group_id_set: Set[str] | None = None,
):
    "Copy user information from host to guest."
    group_id_set = set()
    if exclude_group_id_set is None:
        exclude_group_id_set = set()
    with open("/etc/passwd", "rt", encoding="ascii") as host_passwd:
        with open(credentials_pth + "/passwd", "at", encoding="ascii") as guest_passwd:
            for line in host_passwd.readlines():
                parts = line.split(":")
                if parts[0] in username_set:
                    guest_passwd.write(line)
                    group_id = parts[3]
                    if not group_id in exclude_group_id_set:
                        group_id_set.add(group_id)
    copy_matching_lines("/etc/shadow", credentials_pth + "/shadow", 0, username_set)
    copy_matching_lines("/etc/group", credentials_pth + "/group", 2, group_id_set)


def copy_matching_lines(file_path, target_path, match_idx, match_set):
    "Copy lines from file_path to target_path if they start with an entry in match_set."
    with open(file_path, "rt", encoding="ascii") as src:
        with open(target_path, "at", encoding="ascii") as target:
            for line in src.readlines():
                if line.split(":")[match_idx] in match_set:
                    target.write(line)


def run_setup_credentials(
    base_dir, group_name, system_user, initial_user, ssh_key_path
):
    "Perform all necessary steps to setup credentials for SSH tunnel proxy."
    # group is used on host and in containers
    group_id = create_group(group_name)
    # system user is used on host and in containers
    system_user_id = create_user(system_user, group_name=group_name)
    _mk_parent_dir(base_dir)
    chown(base_dir, system_user_id, group_id)
    contributions_dir = path.join(base_dir, "contributions")
    mkdir(contributions_dir)
    chown(contributions_dir, system_user_id, group_id)
    credentials_dir = f"{base_dir}/credentials"
    if not path.exists(credentials_dir):
        mkdir(credentials_dir)
        chown(credentials_dir, system_user_id, group_id)
    _copy_user_info_from_host_to_guest(
        {system_user, "sshd"}, credentials_dir, {str(group_id)}
    )
    host_user_id_limit = _get_user_id_limit()
    # add two to avoid collision with potential admin account.
    first_proxy_user_id = 10000 * (1 + (host_user_id_limit // 10000)) + 2
    setup_ssh_proxy(base_dir)
    setup_credentials(credentials_dir, initial_user, first_proxy_user_id, group_id)
    chown(credentials_dir + "/passwd", system_user_id, group_id)
    chown(credentials_dir + "/shadow", system_user_id, group_id)
    chown(credentials_dir + "/group", system_user_id, group_id)
    user_home = base_dir + "/home"
    if not path.exists(user_home):
        mkdir(user_home)
    initial_user_home = user_home + f"/{initial_user}"
    ssh_pth = initial_user_home + "/.ssh"
    _mk_parent_dir(ssh_pth)
    copyfile(ssh_key_path, ssh_pth + "/authorized_keys")
    # The DB process will need to read the public key.
    # Therefore, only after initial user in db is created, we can set the correct permissions,
    # Before that SSH will fail. This is intended.
    authorized_keys_pth = f"{user_home}/{initial_user}/.ssh/authorized_keys"
    chmod(authorized_keys_pth, 0o600)
    chown(authorized_keys_pth, first_proxy_user_id, group_id)
    chmod(ssh_pth, 0o700)
    chown(ssh_pth, first_proxy_user_id, group_id)
    chown(user_home, system_user_id, group_id)
    chown(initial_user_home, first_proxy_user_id, group_id)


if __name__ == "__main__":
    if geteuid() != 0:
        raise Exception(  # pylint: disable=broad-exception-raised
            "This script must be run as root."
        )
    args = mk_parser().parse_args()
    # make user
    # initial user within limits.
    _base_dir = args.directory
    _group_name = args.group
    _system_user = args.system_user
    _initial_user = args.initial_user
    _ssh_key = args.ssh_key

    run_setup_credentials(_base_dir, _group_name, _system_user, _initial_user, _ssh_key)
