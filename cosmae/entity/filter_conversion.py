"Methods fro converting an API filter model to a Django Q object." ""
from functools import reduce
from re import compile as re_compile
from typing import Union

from django.db.models import Q

from cosmae.entity.models_api import FilterClause, FilterComposite, FilterLiteral

_MAPPING_FILTER_PREDICATE_API_TO_DJANGO = {
    "EQ": lambda x, y: Q(id_column_persistent=x, value__like=y),
    "NEQ": lambda x, y: ~Q(id_column_persistent=x, value__like=y),
}
_MAPPING_FILTER_OPERATOR_API_TO_DJANGO = {
    "AND": Q.__and__,
    "OR": Q.__or__,
}

_WILDCARD_MATCH_PATTERN = re_compile(r"(^|([^\\]))\*")
_WILDCARD_REPLACE_PATTERN = r"\g<1>%"
_ESCAPED_WILDCARD_MATCH_PATTERN = re_compile(r"\\\*")
_ESCAPED_WILDCARD_REPLACE_PATTERN = r"*"


def filter_to_django_q(
    filter_tree: Union[FilterClause] | None,
) -> Q:
    """Convert API filter model to Django Q object."""
    if filter_tree is None:
        return Q()
    todo_stack = [filter_tree]
    done_stack = [[]]
    while todo_stack:
        current = todo_stack.pop()
        if isinstance(current, str):  # operator
            parts = done_stack.pop()
            operator = _MAPPING_FILTER_OPERATOR_API_TO_DJANGO[current]
            combined = reduce(operator, parts)
            done_stack[-1].append(combined)
            continue
        current = current.filter
        if isinstance(current, FilterLiteral):
            done_stack[-1].append(
                _MAPPING_FILTER_PREDICATE_API_TO_DJANGO[current.predicate](
                    current.id_column_persistent,
                    _ESCAPED_WILDCARD_MATCH_PATTERN.sub(
                        _ESCAPED_WILDCARD_REPLACE_PATTERN,
                        _WILDCARD_MATCH_PATTERN.sub(
                            _WILDCARD_REPLACE_PATTERN, current.value
                        ),
                    ),
                )
            )
        elif isinstance(current, FilterComposite):
            done_stack.append([])
            todo_stack.append(current.operator)
            todo_stack = todo_stack + current.parts
    return done_stack[0][0]
