import { ColumnDefinition } from '../column_menu/state'
import { PublicUserInfo } from '../user/state'
import { Remote } from '../util/state'

export enum MergeRequestStep {
    Open = 'Open',
    Conflicts = 'Conflicts',
    Closed = 'Closed',
    Resolved = 'Resolved',
    Merged = 'Merged',
    Error = 'Error'
}

export class MergeRequest {
    idPersistent: string
    createdBy: PublicUserInfo
    assignedTo: PublicUserInfo
    originTagDefinition: ColumnDefinition
    destinationTagDefinition: ColumnDefinition
    step: MergeRequestStep

    constructor({
        idPersistent,
        createdBy,
        assignedTo,
        originTagDefinition,
        destinationTagDefinition,
        step
    }: {
        idPersistent: string
        createdBy: PublicUserInfo
        assignedTo: PublicUserInfo
        originTagDefinition: ColumnDefinition
        destinationTagDefinition: ColumnDefinition
        step: MergeRequestStep
    }) {
        this.idPersistent = idPersistent
        this.createdBy = createdBy
        this.assignedTo = assignedTo
        this.originTagDefinition = originTagDefinition
        this.destinationTagDefinition = destinationTagDefinition
        this.step = step
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
