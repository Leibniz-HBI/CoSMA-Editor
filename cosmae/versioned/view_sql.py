"SQL queries for creating history views."

DROP_TAG_INSTANCE_VIEW_SQL = "drop view cosmae_taginstance"
DROP_TAG_DEFINITION_VIEW_SQL = "drop view cosmae_tagdefinition"
DROP_VALUE_VIEW_SQL = "drop view cosmae_value"
DROP_COLUMN_VIEW_SQL = "drop view cosmae_column"
DROP_ENTITY_VIEW_SQL = "drop view cosmae_entity"

CREATE_TAG_INSTANCE_VIEW_SQL = """
            create view "cosmae_taginstance" as (
                select *
                from (
                        select max("id") max_id
                        from cosmae_taginstancehistory vt
                        group by id_persistent
                    ) with_version
                    left join  (
                        select *
                        from cosmae_taginstancehistory vt1
                    ) without_version
                    on "with_version"."max_id"="without_version"."id"
            )"""

CREATE_TAG_DEFINITION_VIEW_SQL = (
    """
            create view "cosmae_tagdefinition" as (
                select *
                from (
                        select max("id") max_id
                        from cosmae_tagdefinitionhistory vt
                        group by id_persistent
                    ) with_version
                    left join  (
                        select *
                        from cosmae_tagdefinitionhistory vt1
                    ) without_version
                    on "with_version"."max_id"="without_version"."id"
            )""",
)
CREATE_VALUE_VIEW_SQL = """
            create view "cosmae_value" as (
                select *
                from (
                        select max("id") max_id
                        from cosmae_valuehistory vt
                        group by id_persistent
                    ) with_version
                    left join  (
                        select *
                        from cosmae_valuehistory vt1
                    ) without_version
                    on "with_version"."max_id"="without_version"."id"
            )"""

CREATE_COLUMN_VIEW_SQL = (
    """
            create view "cosmae_column" as (
                select *
                from (
                        select max("id") max_id
                        from cosmae_columnhistory vt
                        group by id_persistent
                    ) with_version
                    left join  (
                        select *
                        from cosmae_columnhistory vt1
                    ) without_version
                    on "with_version"."max_id"="without_version"."id"
            )""",
)


CREATE_ENTITY_VIEW_SQL = (
    """
            create view "cosmae_entity" as (
                select *
                from (
                        select max("id") max_id
                        from cosmae_entityhistory vt
                        group by id_persistent
                    ) with_version
                    left join  (
                        select *
                        from cosmae_entityhistory vt1
                    ) without_version
                    on "with_version"."max_id"="without_version"."id"
            )""",
)
