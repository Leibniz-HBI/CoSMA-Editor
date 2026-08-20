"Django ORM models"

from uuid import uuid4

from django.db import models


class SshKey(models.Model):
    "Links SSH keys to users."

    user = models.ForeignKey("cosmaeuser", on_delete=models.CASCADE)
    key = models.TextField()
    name = models.TextField()
    type = models.TextField()
    id_persistent = models.CharField(max_length=36)

    class InvalidSshKeyException(Exception):
        "Indicate that an SSH key is invalid."

        def __init__(self, msg):
            self.msg = msg

    @classmethod
    def add_key(cls, user, key):
        "Add a new SSH key for a user."
        uuid = str(uuid4())
        key_verified = check_key(key)
        if len(key_verified) == 1:
            raise cls.InvalidSshKeyException(msg=key_verified[0])
        key_type, key_string, name = key_verified
        key_db = cls.objects.create(
            id_persistent=uuid,
            key=key_string,
            name=name,
            type=key_type,
            user=user,
        )
        return key_db

    def as_pub_key_string(self):
        "Returns the representation of the key required for the authorized_keys file."
        return " ".join((self.type, self.key, self.name))


def check_key(key: str):
    """Check a user provided key.
    Returns an array.
    If the length is one, then it contains an error message.
    If the length is three, then it contains the type, the key and the name."""
    split = key.split(" ")
    if len(split) != 3:
        return [
            "Could not parse key. It must consist of three parts, separated by spaces."
        ]
    key_type, key_string, name = split
    for c in key_type:
        if not (c.islower() or c.isdigit() or c == "-"):
            return ["Key type can only contain lower case, numbers or dashes."]
    for c in key_string:
        if not (c.isalnum() or c in {"+", "/", "="}):
            return ["The key has to be base64 encoded"]
    for c in name:
        if not (c.isalnum() or c in {"@", "+", "-", "_", ".", "\\"}):
            return [f'The character "{c}" is not allowed in key names.']
    return split
