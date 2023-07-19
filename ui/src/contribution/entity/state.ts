import { ColumnDefinition } from '../../column_menu/state'
import { CellValue } from '../../table/state'
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
    cellContents: Remote<CellValue[]>[]

    constructor({
        idPersistent,
        displayTxt,
        version,
        similarity,
        cellContents = [new Remote([])]
    }: {
        idPersistent: string
        displayTxt: string
        version: number
        similarity: number
        cellContents?: Remote<CellValue[]>[]
    }) {
        super({ idPersistent: idPersistent, displayTxt: displayTxt, version })
        this.similarity = similarity
        this.cellContents = cellContents
    }
}

export class EntityWithDuplicates extends Entity {
    similarEntities: Remote<ScoredEntity[]>
    assignedDuplicate: Remote<Entity | undefined>
    cellContents: Remote<CellValue[]>[]
    entityMap: Map<string, number>
    constructor({
        idPersistent,
        displayTxt,
        version,
        similarEntities,
        assignedDuplicate = new Remote(undefined),
        cellContents = [new Remote([])],
        entityMap = undefined
    }: {
        idPersistent: string
        displayTxt: string
        version: number
        similarEntities: Remote<ScoredEntity[]>
        assignedDuplicate?: Remote<undefined | Entity>
        cellContents?: Remote<CellValue[]>[]
        entityMap?: Map<string, number>
    }) {
        super({ idPersistent: idPersistent, displayTxt: displayTxt, version })
        this.similarEntities = similarEntities
        this.assignedDuplicate = assignedDuplicate
        this.cellContents = cellContents
        if (entityMap === undefined || entityMap.size != similarEntities.value.length) {
            this.entityMap = new Map(
                this.similarEntities.value.map((entity, idx) => [
                    entity.idPersistent,
                    idx
                ])
            )
        } else {
            this.entityMap = entityMap
        }
    }
}

export class TagInstance {
    idEntityPersistent: string
    idTagDefinitionPersistent: string
    cellValue: CellValue

    constructor(
        idEntityPersistent: string,
        idTagDefinitionPersistent: string,
        cellValue: CellValue
    ) {
        this.idEntityPersistent = idEntityPersistent
        this.idTagDefinitionPersistent = idTagDefinitionPersistent
        this.cellValue = cellValue
    }
}

export class ContributionEntityState {
    contributionCandidate: Remote<Contribution | undefined>
    entities: Remote<EntityWithDuplicates[]>
    entityMap: Map<string, number>
    completeEntityAssignment: Remote<boolean>
    tagDefinitions: ColumnDefinition[]
    tagDefinitionMap: Map<string, number>
    showTagDefinitionMenu

    constructor({
        contributionCandidate = new Remote(undefined),
        entities = new Remote([]),
        entityMap,
        completeEntityAssignment = new Remote(false),
        tagDefinitions = [],
        tagDefinitionMap: columnDefinitionMap,
        showTagDefinitionMenu = false
    }: {
        contributionCandidate?: Remote<Contribution | undefined>
        entities?: Remote<EntityWithDuplicates[]>
        entityMap?: Map<string, number>
        completeEntityAssignment?: Remote<boolean>
        tagDefinitions?: ColumnDefinition[]
        tagDefinitionMap?: Map<string, number>
        showTagDefinitionMenu?: boolean
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
        this.tagDefinitions = tagDefinitions
        if (
            columnDefinitionMap === undefined ||
            columnDefinitionMap.size != tagDefinitions.length
        ) {
            this.tagDefinitionMap = new Map(
                this.tagDefinitions.map((definition, idx) => [
                    definition.idPersistent,
                    idx
                ])
            )
        } else {
            this.tagDefinitionMap = columnDefinitionMap
        }
        this.showTagDefinitionMenu = showTagDefinitionMenu
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
