import { Remote } from '../../util/state'
import { Contribution } from '../state'

export class Entity {
    idPersistent: string
    displayTxt: string
    version: number

    constructor({
        idPersistent,
        displayTxt,
        version
    }: {
        idPersistent: string
        displayTxt: string
        version: number
    }) {
        this.idPersistent = idPersistent
        this.displayTxt = displayTxt
        this.version = version
    }
}

export class ScoredEntity extends Entity {
    similarity: number

    constructor({
        idPersistent,
        displayTxt,
        version,
        similarity
    }: {
        idPersistent: string
        displayTxt: string
        version: number
        similarity: number
    }) {
        super({ idPersistent: idPersistent, displayTxt: displayTxt, version })
        this.similarity = similarity
    }
}

export class EntityWithDuplicates extends Entity {
    similarEntities: Remote<ScoredEntity[]>
    assignedDuplicate: Remote<Entity | undefined>
    constructor({
        idPersistent,
        displayTxt,
        version,
        similarEntities,
        assignedDuplicate = new Remote(undefined)
    }: {
        idPersistent: string
        displayTxt: string
        version: number
        similarEntities: Remote<ScoredEntity[]>
        assignedDuplicate?: Remote<undefined | Entity>
    }) {
        super({ idPersistent: idPersistent, displayTxt: displayTxt, version })
        this.similarEntities = similarEntities
        this.assignedDuplicate = assignedDuplicate
    }
}

export class ContributionEntityState {
    contributionCandidate: Remote<Contribution | undefined>
    entities: Remote<EntityWithDuplicates[]>
    entityMap: Map<string, number>
    completeEntityAssignment: Remote<boolean>
    constructor({
        contributionCandidate = new Remote(undefined),
        entities = new Remote([]),
        entityMap,
        completeEntityAssignment = new Remote(false)
    }: {
        contributionCandidate?: Remote<Contribution | undefined>
        entities?: Remote<EntityWithDuplicates[]>
        entityMap?: Map<string, number>
        completeEntityAssignment?: Remote<boolean>
    }) {
        this.contributionCandidate = contributionCandidate
        this.entities = entities
        this.completeEntityAssignment = completeEntityAssignment
        if (entityMap === undefined || entityMap.size != entities.value.length) {
            this.entityMap = new Map(
                this.entities.value.map((entity, idx) => [entity.idPersistent, idx])
            )
        } else {
            this.entityMap = entityMap
        }
    }

    minEntityLoadingIndex() {
        const entities = this.entities.value
        for (let idx = 0; idx < entities.length; ++idx) {
            if (entities[idx].similarEntities.isLoading) {
                return idx
            }
        }
        return undefined
    }

    /**
     * Check whether there are any duplicates at all
     */
    isDuplicates() {
        if (this.entities.isLoading) {
            return true
        }
        for (const entity of this.entities.value) {
            if (
                entity.similarEntities.isLoading ||
                entity.similarEntities.value.length > 0
            ) {
                return true
            }
        }
        return false
    }
}
