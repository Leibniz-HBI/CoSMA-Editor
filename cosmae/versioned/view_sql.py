"SQL queries for creating history views."
DROP_TAG_INSTANCE_VIEW_SQL = "drop view cosmae_taginstance"
DROP_TAG_DEFINITION_VIEW_SQL = "drop view cosmae_tagdefinition"
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
