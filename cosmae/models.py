"""Union of all DB models."""

# pylint: disable=unused-import
from cosmae.comments.models_django import Comment
from cosmae.contribution.entity.models_django import EntityDuplicate
from cosmae.contribution.models_django import ContributionCandidate
from cosmae.contribution.tag_definition.models_django import (
    TagDefinitionContribution,
    TagInstanceContribution,
)
from cosmae.entity.models_django import Entity, EntityJustification
from cosmae.management.models_django import ConfigValue
from cosmae.merge_request.entity.models_django import (
    EntityConflictResolution,
    EntityMergeRequest,
)
from cosmae.merge_request.models_django import TagConflictResolution, TagMergeRequest
from cosmae.tag.models_django import TagDefinition, TagInstance
from cosmae.util import CosmaeUser
