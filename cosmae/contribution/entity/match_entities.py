"Queue method for finding duplicates in entity names for contribution candidate."

from cosmae.entity.models_django import Entity


def find_matches(id_contribution_persistent, id_entity_persistent_list):
    """Find matches for the entities selected in the argument query set."""
    return Entity.objects.raw(  # pylint: disable=no-member
        MATCHES_QUERY_STRING,
        {
            "id_entity_persistent_list": id_entity_persistent_list,
            "id_contribution_persistent": str(id_contribution_persistent),
            "display_txt_similarity_weight": 0.6,
            "match_count_weight": 0.4,
            "display_txt_similarity_threshold": 0.7,
        },
    )


MATCHES_QUERY_STRING = """
        with "entity_most_recent" as (
            select *
            from (
                select max("id") max_id
                from cosmae_entity
                group by id_persistent
            ) with_version
            left join  (
                select *
                from cosmae_entity without_version
            ) enabled_only
            on "with_version"."max_id"="enabled_only"."id"
		),
		"entity_pairs" as (
			select *
			from(
				select "id" "existing_id"
                    , "id_persistent" "existing_id_persistent"
                    , "display_txt" "existing_display_txt"
				from entity_most_recent "entity_existing"
	        	where not disabled and contribution_candidate_id is null
            ) existing
            cross join (
                select "id" "contribution_id"
                    , "id_persistent" "contribution_id_persistent"
                    , "display_txt" "contribution_display_txt"
                    , "disabled" "contribution_disabled"
                    , "previous_version_id" "contribution_previous_version_id"
                    , "contribution_candidate_id" "contribution_contribution_candidate_id"
                    , "time_edit" "contribution_time_edit"
            	from entity_most_recent "entity_candidate"
            	where not disabled
                    and "id_persistent" =  ANY(%(id_entity_persistent_list)s)
            ) contribution
		),
		"with_levenshtein" as (
			select existing_id_persistent, contribution_id_persistent
                , (
                	case when "similarity" > 0.3 then
                		(1-levenshtein_less_equal(
		                	"existing_display_txt",
		                	"contribution_display_txt",
		                	ceiling(
		                    	0.25*length("contribution_display_txt"))::int)::float/length("contribution_display_txt"))
                   	else 0.0
                   	end) "levenshtein_similarity"
            from (
                select *
                    , SIMILARITY("existing_display_txt", "contribution_display_txt")
                from entity_pairs
            ) with_similarity
		),
	 	with_match_count as (
			select
				id_entity_origin
				, id_entity_destination
				, count (case when "value_origin" = "value_destination" then 1 end) equal_instance_count
				, array_agg (case when "value_origin" = "value_destination" then "id_destination_persistent" end) equal_tag_definition_list
				, count(*) total_instance_count
			from (
				select "id_entity_origin", "value_origin", "id_entity_destination" ,"value_destination", "id_destination_persistent"
				from (
					(
                        select "id_origin_persistent",  "id_destination_persistent"
						from cosmae_tagmergerequest
						where contribution_candidate_id=%(id_contribution_persistent)s
					) tagmergerequest
					inner join (
						select "id_persistent"
						from (
							select  max(id) "max_id"
							from cosmae_tagdefinition
							group by "id_persistent"
						) with_max
						left join (
							select *
							from cosmae_tagdefinition
						) tag_definition0
						on "tag_definition0"."id" = "with_max"."max_id"
						where "tag_definition0"."id" = "with_max"."max_id" and "curated"
					) tag_definition_curated
					on "id_destination_persistent" = "tag_definition_curated"."id_persistent"
				) merge_requests
				left join (
					select "id_entity_persistent" "id_entity_destination", "value" "value_destination", "id_tag_definition_persistent"
                    from cosmae_taginstance
					where id_entity_persistent in (
						select existing_id_persistent
						from entity_pairs
					)
				) instances_destination
				on "merge_requests"."id_destination_persistent" = "instances_destination"."id_tag_definition_persistent"
				left join (
						select "id_entity_persistent" "id_entity_origin", "value" "value_origin", "id_tag_definition_persistent"
                        from cosmae_taginstance
						where id_entity_persistent in (
							select contribution_id_persistent
							from entity_pairs
                        )
				) instances_origin
				on "merge_requests"."id_origin_persistent" = "instances_origin"."id_tag_definition_persistent"
				where "value_origin"="value_destination"
			) instance_pairs
			group by id_entity_origin, id_entity_destination
		),
		"with_json_match" as (
			select *,
				"entity_pairs"."contribution_id" "id"
				, jsonb_build_object(
					'levenshtein_similarity'::text,
	                "levenshtein_similarity"::float,
	                'equal_tag_definition_list'::text,
	                "equal_tag_definition_list",
	                'equal_instance_count'::text,
	                "equal_instance_count"::int,
	                'total_instance_count'::text,
	                "total_instance_count"::int,
	                'id'::text,
	                 existing_id::int,
	                'id_persistent'::text,
	                "entity_pairs"."existing_id_persistent",
	                'display_txt'::text,
	                existing_display_txt,
                    'disabled',
                    false) "match"
	            , row_number() over (
	            	partition by "entity_pairs"."contribution_id"
	            	order by (
		            	%(display_txt_similarity_weight)s*"levenshtein_similarity" + %(match_count_weight)s*(
		  					(
		  						case when total_instance_count is not null
		  							then equal_instance_count::float/total_instance_count::float
		  							else 0.0 end
		  					)
		  				)
	  				)
	  				desc)  "match_rank"
			from entity_pairs
			left join with_match_count
			on "contribution_id_persistent"="id_entity_origin" and "existing_id_persistent" = "id_entity_destination"
			left join with_levenshtein
			on "entity_pairs"."contribution_id_persistent"="with_levenshtein"."contribution_id_persistent" and "entity_pairs"."existing_id_persistent" =  "with_levenshtein"."existing_id_persistent"
			where "total_instance_count" is not null or levenshtein_similarity > %(display_txt_similarity_threshold)s
		),
        "duplicate_assignments" as (
            select "id_origin_persistent"
            	, jsonb_build_object(
            		'id',
            		"entity_most_recent"."id",
            		'id_persistent',
            		"cosmae_entityduplicate"."id_destination_persistent",
            		'display_txt',
            		"entity_most_recent"."display_txt",
            		'disabled',
            		"entity_most_recent"."disabled")::json "assigned_duplicate"
            from "cosmae_entityduplicate"
            left join entity_most_recent
            on "cosmae_entityduplicate"."id_destination_persistent" = "entity_most_recent"."id_persistent"
            where  "cosmae_entityduplicate"."id_origin_persistent" = any(%(id_entity_persistent_list)s)
                and "entity_most_recent"."max_id" is not null
        )
		select *
        from(
            select *
            from (
                select "id", json_agg("match" order by match_rank) "matches"
                from "with_json_match"
                where match_rank <= 5
                group by "id"
            ) grouped
            left join entity_most_recent
            on "grouped"."id"="entity_most_recent"."id"
        ) matches_with_detail
        left join "duplicate_assignments"
        on "matches_with_detail"."id_persistent" = "duplicate_assignments"."id_origin_persistent"
        """


def add_assigned_duplicates_query(matches_query):
    "Add information on duplicates to matches_query"

    return f"""
        with "scored_matches" as (
            {matches_query}
        )
        select *
        from "scored_matches"
        left join (
            select id_origin_persistent, jsonb_build_object(
                'id'::text,
                "entity_most_recent"."id"::int,
                'id_persistent'::text,
                "id_origin_persistent",
                'display_txt'::text,
                "entity_most_recent"."display_txt") "assigned_duplicate"
            from (
                select *
                from "cosmae_entityduplicate"
                left join entity_most_recent
                on "cosmae_entityduplicate"."id_origin_persistent" = "entity_most_recent"."id_persistent"
            ) "duplicate_details"
        ) "duplicate_details_json"
        on "scored_matches"."id_persistent" = "cosmae_entityduplicate"."id_origin_persistent"
    """
