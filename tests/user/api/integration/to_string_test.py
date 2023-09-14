# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name
from tests.user import common as c
from cosmae.user.models_api import LoginRequest, RegisterRequest


def test_login_no_password_print():
    assert 0 > (
        str(LoginRequest(name=c.test_username, password=c.test_password)).find(
            c.test_password
        )
    )


def test_register_no_password_print():
    assert 0 > (
        str(
            RegisterRequest(
                user_name=c.test_username,
                password=c.test_password,
                names_personal=c.test_names_personal,
                email=c.test_email,
            )
        ).find(c.test_password)
    )
