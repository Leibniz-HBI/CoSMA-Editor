"Test for the password hasher."

import cosmae.util.password_hasher as ph

config_strings = [
    "j75",
    "j85",
    "j7T",
    "j8T",
    "j9T",
    "jAT",
    "jBT",
    "jCT",
    "jDT",
    "jET",
    "jFT",
]


def test_cost_factor_2_config():
    "Check whether cost factors are correctly transformed to config strings."
    for idx, expected in enumerate(config_strings):
        assert ph.cost_factor_to_config(idx + 1) == expected


def test_config_cost_factor():
    "Check whether config strings are correctly transformed to cost factors."
    for idx, hash_config in enumerate(config_strings):
        assert ph.cost_from_config(hash_config) == idx + 1


# password string generated from the console.
CONFIG = "jFT"
SALT = "6KMqKdvu.uh9R/sFxy94J/"
HASH = "RZBLdqw5/tI.LqxqbjnMWnfqv316ilALI/qYbv9Xlb6"
PASSWORD_ENCODED = "$".join(["linuxy", CONFIG, SALT, HASH])


def test_can_verify_password():
    "Check whether the correct password is recognized"
    hasher = ph.MkPasswordYescryptPasswordHasher()
    assert hasher.verify("test?!1234", PASSWORD_ENCODED)


def test_no_verify_incorrect():
    "Check that an incorrect password is not accepted"
    hasher = ph.MkPasswordYescryptPasswordHasher()
    assert not hasher.verify("test?!123", PASSWORD_ENCODED)


def test_format():
    "Make sure the password string has the right format."
    hasher = ph.MkPasswordYescryptPasswordHasher()
    encoded_result = hasher.encode("test?!1234", SALT)
    splitted = encoded_result.split("$")
    assert len(splitted) == 4
    assert splitted[0] == "linuxy"
    assert splitted[1] == CONFIG
    assert splitted[2] == SALT
    assert splitted[3] == HASH


def test_salt():
    "Make sure salt is of correct length"
    hasher = ph.MkPasswordYescryptPasswordHasher()
    salt_result = hasher.salt()
    assert len(salt_result) == 22


# the following tests check for chars with special meaning in the shell.
# They could be used to perform exploits, therefore make sure they are used literally.
# For additional chars generate reference strings using
#   ``` echo 'test$(echo black)' | tee /tmp/out.txt | \
#       /usr/bin/mkpasswd -m yescrypt -s -R 11 -S '$y$jFT$6KMqKdvu.uh9R/sFxy94J/'`
# and check /tmp/out.txt for the intended password.


def test_dollar_sign():
    "make sure dollar sign is correctly escaped."
    hasher = ph.MkPasswordYescryptPasswordHasher()
    password = hasher.encode("test$(echo bla)", SALT)
    assert password[-43:] == "TYHnjnKHIRUTqxnKOWZ.sHr1.TjsRFUUQ6tThS7eoIC"


def test_ampersand():
    "make sure dollar sign is correctly escaped."
    hasher = ph.MkPasswordYescryptPasswordHasher()
    password = hasher.encode("test && echo bla", SALT)
    assert password[-43:] == "y1Aqi3rK.lxyoTy6Lf1PhEaaiTTj/912BKy.SYOfGx5"


def test_exclamation():
    "make sure dollar sign is correctly escaped."
    hasher = ph.MkPasswordYescryptPasswordHasher()
    password = hasher.encode("test !!", SALT)
    # reference string generated directly from shell.
    assert password[-43:] == "K9CnOBR1OaK/9gIFqjyoGEggBo4jQoB0r7XsFlWybr3"


def test_semicolon():
    "make sure dollar sign is correctly escaped."
    hasher = ph.MkPasswordYescryptPasswordHasher()
    password = hasher.encode("test ; echo bla", SALT)
    # reference string generated directly from shell.
    assert password[-43:] == "FRMksBz4xwdow0Nm1z37U.7JVkDjV6uIgIvbU/KSQ30"


def test_redirection():
    "make sure dollar sign is correctly escaped."
    hasher = ph.MkPasswordYescryptPasswordHasher()
    password = hasher.encode("test >", SALT)
    # reference string generated directly from shell.
    assert password[-43:] == "m/VCP0kSPmRbBR7ia9T8nXu62Nc6ayJBDO3W4m97W19"


def test_single_quote():
    "make sure dollar sign is correctly escaped."
    hasher = ph.MkPasswordYescryptPasswordHasher()
    password = hasher.encode("test '", SALT)
    # reference string generated directly from shell.
    assert password[-43:] == "hQ170o19gA2v00awOj/niIALfXg3qnQQm23C79iP2K7"


def test_double_quote():
    "make sure dollar sign is correctly escaped."
    hasher = ph.MkPasswordYescryptPasswordHasher()
    password = hasher.encode('test "', SALT)
    # reference string generated directly from shell.
    assert password[-43:] == "2OOrFIonVQrM07s77AnnvP2vnLoad3Dz5P68lWof892"
