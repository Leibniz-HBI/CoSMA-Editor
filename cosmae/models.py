"""Union of all DB models."""
# pylint: disable=unused-import
from cosmae.contribution.entity.models_django import EntityDuplicate
from cosmae.contribution.models_django import ContributionCandidate
from cosmae.contribution.tag_definition.models_django import (
    TagDefinitionContribution,
    TagInstanceContribution,
)
from cosmae.entity.models_django import Entity
from cosmae.merge_request.models_django import MergeRequest
from cosmae.tag.models_django import TagDefinition, TagInstance
from cosmae.util import CosmaeUser
