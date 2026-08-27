# pylint: disable=unused-argument
"Test computing conflicts for entity merge requests."


def test_finds_conflicts_empty_destination(
    merge_request_user,
    instances_merge_request_origin_user,
):
    "make sure same values are not considered conflicts"
    conflicts = merge_request_user.compute_instance_conflicts()
    assert len(conflicts) == 3
    for conflict in conflicts:
        assert conflict.value_destination is None


def test_excludes_same_value(
    merge_request_user,
    instances_merge_request_origin_user,
    instance_merge_request_destination_user_no_conflict,
):
    "make sure same values are not considered conflicts"
    conflicts = merge_request_user.compute_instance_conflicts()
    assert len(conflicts) == 2
    column_ids = {conflict.id_column_persistent for conflict in conflicts}
    assert (
        instance_merge_request_destination_user_no_conflict.id_column_persistent
        not in column_ids
    )


def test_finds_destination_value(
    merge_request_user,
    instances_merge_request_origin_user,
    instance_merge_request_destination_user_conflict0,
):
    "make sure same values are not considered conflicts"
    conflicts = merge_request_user.compute_instance_conflicts()
    assert len(conflicts) == 3
    for conflict in conflicts:
        if conflict.value_destination is not None:
            assert (
                conflict.value_destination["id"]
                == instance_merge_request_destination_user_conflict0.id
            )
