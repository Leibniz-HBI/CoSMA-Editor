import { LoadContributionDetailsAction } from '../details/action'
import { Entity, EntityWithDuplicates, ScoredEntity } from './state'

/**
 * Indicate start of loading entities for a contribution
 */
export class GetContributionEntitiesStartAction {}

/**
 * Indicate successful loading of entities
 */
export class GetContributionEntitiesSuccessAction {
    entities: EntityWithDuplicates[]

    constructor(entities: EntityWithDuplicates[]) {
        this.entities = entities
    }
}

/**
 * Indicate error while loading entities
 */
export class GetContributionEntitiesErrorAction {
    msg: string
    constructor(msg: string) {
        this.msg = msg
    }
}

export class GetContributionEntityDuplicatesAction {
    idPersistent: string
    constructor(idPersistent: string) {
        this.idPersistent = idPersistent
    }
}

/**
 * Indicate start of fetching duplicate candidates for an entity.
 */
export class GetContributionEntityDuplicatesStartAction extends GetContributionEntityDuplicatesAction {
    constructor(idPersistent: string) {
        super(idPersistent)
    }
}

/**
 * Indicate successful fetching duplicate candidates for an entity.
 */
export class GetContributionEntityDuplicatesSuccessAction extends GetContributionEntityDuplicatesAction {
    scoredEntities: ScoredEntity[]
    assignedDuplicate?: Entity
    constructor(
        idPersistent: string,
        scoredEntities: ScoredEntity[],
        assignedDuplicate?: Entity
    ) {
        super(idPersistent)
        this.scoredEntities = scoredEntities
        this.assignedDuplicate = assignedDuplicate
    }
}

/**
 * Indicate an error during fetching duplicates for an entity.
 */
export class GetContributionEntityDuplicatesErrorAction extends GetContributionEntityDuplicatesAction {
    msg: string
    constructor(idPersistent: string, msg: string) {
        super(idPersistent)
        this.msg = msg
    }
}

/**
 * Indicate start of request for completing entity assignment
 */
export class CompleteEntityAssignmentStartAction {}

/**
 * Indicate successful complete entity assignment request.
 */
export class CompleteEntityAssignmentSuccessAction {}

/**
 * Indicate an error during request for completing entity assignment.
 */
export class CompleteEntityAssignmentErrorAction {
    msg: string
    constructor(msg: string) {
        this.msg = msg
    }
}

/**
 * Clear error fo complete entity assignment request
 */
export class CompleteEntityAssignmentClearErrorAction {}

export class PutDuplicateStartAction extends GetContributionEntityDuplicatesAction {
    constructor(idPersistent: string) {
        super(idPersistent)
    }
}

export class PutDuplicateSuccessAction extends GetContributionEntityDuplicatesAction {
    assignedDuplicate?: Entity
    constructor(idPersistent: string, assignedDuplicate?: Entity) {
        super(idPersistent)
        this.assignedDuplicate = assignedDuplicate
    }
}

export class PutDuplicateErrorAction extends GetContributionEntityDuplicatesAction {
    msg: string
    constructor(idPersistent: string, msg: string) {
        super(idPersistent)
        this.msg = msg
    }
}

export class PutDuplicateClearErrorAction extends GetContributionEntityDuplicatesAction {
    constructor(idPersistent: string) {
        super(idPersistent)
    }
}

export type ContributionEntityAction =
    | GetContributionEntitiesStartAction
    | GetContributionEntitiesSuccessAction
    | GetContributionEntitiesErrorAction
    | GetContributionEntityDuplicatesAction
    | LoadContributionDetailsAction
    | CompleteEntityAssignmentStartAction
    | CompleteEntityAssignmentSuccessAction
    | CompleteEntityAssignmentErrorAction
    | CompleteEntityAssignmentClearErrorAction
