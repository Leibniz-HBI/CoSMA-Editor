"Password hasher for CoSMA editor"

import subprocess
from random import randbytes
from sys import byteorder
from typing import Tuple

from django.contrib.auth.hashers import BasePasswordHasher, mask_hash
from django.utils.translation import gettext_noop

from cosmae.util.password_hasher.code_maps import LIBXCRYPT_CODE, LIBXCYPT_REVERSE_CODE


def encode64_uint32(value: int, n_src_bits=6, min_value=0):
    """Encode an int value according to a code map.
    This is intended for sequences of maximum 30 bit"""
    if value < min_value:
        raise ValueError()
    return_value = ""
    tmp = value - min_value
    for _ in range(0, n_src_bits, 6):
        return_value += LIBXCRYPT_CODE[tmp & 63]
        tmp >>= 6
    return return_value


def cost_factor_to_config(cost_factor: int):
    """Transform cost factor to libxcrypt yescrypt config string."""
    # The actual N used for scrypt is 2**(n_log_2)
    if cost_factor < 3:
        r = 8
        n_log_2 = cost_factor + 9
    else:
        r = 32
        n_log_2 = cost_factor + 7
    return "j" + encode64_uint32(n_log_2, min_value=1) + encode64_uint32(r, min_value=1)


def cost_from_config(config: str):
    "Reconstruct the cost factor from a config string."
    if config[0] != "j":
        raise ValueError()
    n_log_2 = decode(LIBXCYPT_REVERSE_CODE, config[1]) + 1
    r = decode(LIBXCYPT_REVERSE_CODE, config[2]) + 1
    if r == 8:
        return n_log_2 - 9
    return n_log_2 - 7


YESCRYPT_LINUX_COST_PARAMETER = 11
YESCRYPT_LINUX_CONFIG = cost_factor_to_config(YESCRYPT_LINUX_COST_PARAMETER)
YESCRYPT_SALT_LEN_BYTES = 16

RANDOM_STRING_CHARS = LIBXCRYPT_CODE


def encode_bytes(value: bytes):
    "Encode a longer value with more than 30 bits."
    return_value = ""
    num_bytes = len(value)
    n_bytes_step = 3
    for offset in range(0, num_bytes, 3):
        end = offset + 3
        if end > num_bytes:
            n_bytes_step = 3 - (end - num_bytes)
        return_value += encode64_uint32(
            int.from_bytes(value[offset : offset + n_bytes_step], byteorder="big"),
            n_bytes_step * 8,
        )
    return return_value


def decode(reverse_code_config: Tuple[int, str], encoded: str):
    "Decode a string value into an int according to a reverse code map."
    reverse_code_offset, reverse_code_map = reverse_code_config
    value = 0
    for c in reversed(encoded):
        reverse_map_idx = ord(c) - reverse_code_offset
        try:
            c_decoded = reverse_code_map[reverse_map_idx]
            if c_decoded > 63 or reverse_map_idx < 0:
                raise ValueError()
        except IndexError as exc:
            raise ValueError() from exc
        value <<= 6
        value |= c_decoded
    return value


class MkPasswordYescryptPasswordHasher(BasePasswordHasher):
    """Scrypt PasswordHasher that is compatible with Linux `/etc/shadow` format.
    This requires setting of specific parameters."""

    class PasswordHashCreationException(Exception):
        "Raised when a password could not be created."

    algorithm = "linuxy"

    def verify(self, password, encoded):
        """Check if the given password is correct."""
        _algorithm, _config, salt, _hash = encoded.split("$")
        hash_from_provided_password = self.encode(password, salt)
        return encoded == hash_from_provided_password

    def encode(self, password, salt):
        """
        Create an encoded database value.

        The result is normally formatted as "algorithm$salt$hash" and
        must be fewer than 128 characters.
        """
        with subprocess.Popen(
            [
                "/usr/bin/mkpasswd",
                "-m",
                "yescrypt",
                "-R",
                str(YESCRYPT_LINUX_COST_PARAMETER),
                "-s",
                "-S",
                f"$y${YESCRYPT_LINUX_CONFIG}${salt}",
            ],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        ) as p:
            out_string, error_string = p.communicate((password + "\n").encode("utf-8"))
            p.wait()
        if len(error_string) > 0:
            raise self.PasswordHashCreationException()
        hashed_password = out_string.decode("utf-8")
        # there is a '$' separator in the result from mkpasswd
        # and a new line char.
        return self.algorithm + hashed_password[2:-1]

    def decode(self, encoded):
        """
        Return a decoded database value.

        The result is a dictionary and should contain `algorithm`, `hash`, and
        `salt`. Extra keys can be algorithm specific like `iterations` or
        `work_factor`.
        """
        algorithm, config, salt, hash_ = encoded.split("$")
        cost = cost_from_config(config)

        return {"algorithm": algorithm, "salt": salt, "hash": hash_, "cost": cost}

    def salt(self):
        """
        Generate a cryptographically secure nonce salt in ASCII with an entropy
        of at least `salt_entropy` bits.
        """
        return encode_bytes(randbytes(YESCRYPT_SALT_LEN_BYTES))

    def safe_summary(self, encoded):
        """
        Return a summary of safe values.

        The result is a dictionary and will be used where the password field
        must be displayed to construct a safe representation of the password.
        """
        decoded = self.decode(encoded)
        return {
            gettext_noop("algorithm"): decoded["algorithm"],
            gettext_noop("cost"): decoded["cost"],
            gettext_noop("salt"): mask_hash(decoded["salt"]),
            gettext_noop("hash"): mask_hash(decoded["hash"]),
        }
