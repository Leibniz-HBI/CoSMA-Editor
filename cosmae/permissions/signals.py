# def set initial_permissions(
#     sender,
#     instance,
#     created,
#     update_fields,
#     **kwargs,  # pylint: disable=unused-argument
# ):
#     "Dispatch method for updating entity display txt, when entity has changed."
#     if created or (update_fields and "value" in update_fields):
#         enqueue(update_display_txt_cache, str(instance.id_persistent))
