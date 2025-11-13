"""API models for entity-related endpoints."""

from typing import List, Literal, Union

from ninja import Field, Schema


class FilterLiteral(Schema):
    # pylint: disable=too-few-public-methods
    """API model for basic filter building blocks."""
    id_column_persistent: str
    value: str
    predicate: Literal["EQ", "NEQ"]
    type: Literal["LITERAL"] = Field(default="LITERAL")


class FilterComposite(Schema):
    # pylint: disable=too-few-public-methods
    """API model for composite filter."""
    operator: Literal["AND", "OR"]
    clause_list: List["FilterClause"]
    type: Literal["COMPOSITE"] = Field(default="COMPOSITE")


class FilterNegation(Schema):
    # pylint: disable=too-few-public-methods
    """API model for negation filter."""
    clause: "FilterClause"
    type: Literal["NEGATION"] = Field(default="NEGATION")


class FilterClause(Schema):
    # pylint: disable=too-few-public-methods
    """API model for discriminating between filter types."""
    filter: Union[FilterLiteral, FilterComposite, FilterNegation] = Field(
        ..., discriminator="type"
    )
