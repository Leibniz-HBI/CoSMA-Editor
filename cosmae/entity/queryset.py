"""Custom queryset for entities."""

from datetime import datetime
from re import compile as re_compile

from django.db import models

from cosmae.entity.models_api import FilterComposite, FilterLiteral, FilterNegation
from cosmae.justification.models_django import EntityJustification
from cosmae.versioned.models_django import (
    VersionedHistoryQuerysetMixin,
    VersionedQueryset,
)


class EntityQueryset(VersionedQueryset):
    "Custom queryset for recent entities"

    def search(self, search_term: str):
        "search for entities by display text."
        query = models.Q()
        for term in search_term.split():
            query = query & models.Q(display_txt__icontains=term)
        return self.filter(query)

    def chunk(self, offset: int, limit=int):
        "Get a portion of entities"
        return self.filter(id__gte=offset).order_by("id")[:limit]

    def exclude_contributed(self):
        "Exclude entities from queryset that belong to a contribution."
        return self.filter(contribution_candidate__isnull=True)

    def annotate_justification(
        self,
        up_until_time: datetime | None = None,
    ):
        "Annotate the most recent justification for being in the db to a query set of entities."
        inner_query = models.Q(id_entity_persistent=models.OuterRef("id_persistent"))
        if up_until_time is not None:
            inner_query &= models.Q(timestamp__lte=up_until_time)
        return self.annotate(
            justification_txt=models.Subquery(
                EntityJustification.objects.filter(  # pylint: disable=no-member
                    inner_query
                )
                .order_by(models.F("timestamp").desc())[:1]
                .values("text")
            )
        )

    _MAPPING_FILTER_OPERATOR_API_TO_DJANGO = {
        "AND": (lambda x, y: x.intersection(y), lambda x: x),
        "OR": (lambda x, y: x.union(y), lambda x: x.none()),
    }
    _WILDCARD_MATCH_PATTERN = re_compile(r"(^|([^\\]))\*")
    _WILDCARD_REPLACE_PATTERN = r"\g<1>%"
    _ESCAPED_WILDCARD_MATCH_PATTERN = re_compile(r"\\\*")
    _ESCAPED_WILDCARD_REPLACE_PATTERN = r"*"

    def filter_by_values(self, value_objects, api_filter):
        """Filter entities by values matching the provided query.
        The provided values objects is needed to ensure that the up_until_time is
        correctly applied."""
        if api_filter is None or not self.exists():
            return self
        todo_stack = [api_filter]
        all_ids = self.values("id_persistent")
        done_stack = [[]]
        while todo_stack:
            current = todo_stack.pop()
            if isinstance(current, str):  # operator
                current_id_qs_list = done_stack.pop()
                if current == "NOT":
                    done_stack[-1].append(
                        all_ids.exclude(id_persistent__in=current_id_qs_list[0])
                    )
                    continue
                operator, initializer = self._MAPPING_FILTER_OPERATOR_API_TO_DJANGO[
                    current
                ]
                temp_ids = initializer(all_ids)
                for qs in current_id_qs_list:
                    temp_ids = operator(temp_ids, qs)
                done_stack[-1].append(temp_ids)
                continue
            # in all other cases it is necessary to add new tasks to the todo stack
            current = current.filter
            if isinstance(current, FilterLiteral):
                predicate = models.Q(
                    id_column_persistent=current.id_column_persistent,
                    value__like=self._ESCAPED_WILDCARD_MATCH_PATTERN.sub(
                        self._ESCAPED_WILDCARD_REPLACE_PATTERN,
                        self._WILDCARD_MATCH_PATTERN.sub(
                            self._WILDCARD_REPLACE_PATTERN, current.value
                        ),
                    ),
                )
                filtered_queryset = (
                    self.annotate(
                        id_value=models.Subquery(
                            value_objects.filter(
                                id_entity_persistent=models.OuterRef("id_persistent")
                            )
                            .filter(predicate)
                            .values("id")[:1]
                        )
                    )
                    .filter(id_value__isnull=False)
                    .values("id_persistent")
                )
                if current.predicate == "NEQ":
                    filtered_queryset = all_ids.exclude(
                        id_persistent__in=filtered_queryset
                    )
                done_stack[-1].append(filtered_queryset)
            if isinstance(current, FilterNegation):
                todo_stack.append("NOT")
                todo_stack.append(current.clause)
                done_stack.append([])
            elif isinstance(current, FilterComposite):
                done_stack.append([])
                todo_stack.append(current.operator)
                todo_stack = todo_stack + current.clause_list
        return self.filter(id_persistent__in=done_stack[0][0])


class EntityHistoryQueryset(EntityQueryset, VersionedHistoryQuerysetMixin):
    "Custom queryset for entity history"
