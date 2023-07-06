import { ColumnDefinition } from '../column_menu/state'
import { PublicUserInfo } from '../user/state'
import { Remote } from '../util/state'

export class MergeRequest {
    idPersistent: string
    createdBy: PublicUserInfo
    assignedTo: PublicUserInfo
    originTagDefinition: ColumnDefinition
    destinationTagDefinition: ColumnDefinition

    constructor({
        idPersistent,
        createdBy,
        assignedTo,
        originTagDefinition,
        destinationTagDefinition
    }: {
        idPersistent: string
        createdBy: PublicUserInfo
        assignedTo: PublicUserInfo
        originTagDefinition: ColumnDefinition
        destinationTagDefinition: ColumnDefinition
    }) {
        this.idPersistent = idPersistent
        this.createdBy = createdBy
        this.assignedTo = assignedTo
        this.originTagDefinition = originTagDefinition
        this.destinationTagDefinition = destinationTagDefinition
    }
}

export class MergeRequestByCategory {
    created: MergeRequest[]
    assigned: MergeRequest[]

    constructor({
        created = [],
        assigned = []
    }: {
        created?: MergeRequest[]
        assigned?: MergeRequest[]
    }) {
        this.created = created
        this.assigned = assigned
    }
}

export class MergeRequestState {
    byCategory: Remote<MergeRequestByCategory>

    constructor({
        byCategory = new Remote(new MergeRequestByCategory({}))
    }: {
        byCategory?: Remote<MergeRequestByCategory>
    }) {
        this.byCategory = byCategory
    }
}
