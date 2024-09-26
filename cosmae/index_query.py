"Queries for generating trigram indices"

# Possible alternative gin index with `opclasses=["gin_trgrm_ops"],
# Would mean faster retrieval but increased size and update time.
# Needs to add extension via migration.
CREATE_ENTITY_DISPLAY_TXT_INDEX_QUERY = """
            CREATE INDEX cosmae_entity_display_txt_trgm_idx
            ON cosmae_entityhistory
            USING GIST (display_txt gist_trgm_ops)"""

DROP_ENTITY_DISPLAY_TXT_INDEX_QUERY = "DROP INDEX cosmae_entity_display_txt_trgm_idx"

# Possible alternative gin index with `opclasses=["gin_trgrm_ops"],
# Would mean faster retrieval but increased size and update time.
# Needs to add extension via migration.
CREATE_TAG_INSTANCE_VALUE_INDEX_QUERY = """
            CREATE INDEX cosmae_taginstance_value_trgm_idx
            ON cosmae_taginstancehistory
            USING GIST (value gist_trgm_ops)"""

DROP_TAG_INSTANCE_VALUE_INDEX_QUERY = "DROP INDEX cosmae_taginstance_value_trgm_idx"
