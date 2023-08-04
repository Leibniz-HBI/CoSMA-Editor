import { ColumnDefinition } from '../../column_menu/state'
import { Remote } from '../../util/state'
import { MergeRequestConflict } from './state'

export class GetMergeRequestConflictStartAction {}

export class GetMergeRequestConflictSuccessAction {
    updated: Remote<MergeRequestConflict>[]
    conflicts: Remote<MergeRequestConflict>[]
    tagDefinitionDestination: ColumnDefinition
    tagDefinitionOrigin: ColumnDefinition

    constructor({
        updated,
        conflicts,
        tagDefinitionOrigin,
        tagDefinitionDestination
    }: {
        updated: Remote<MergeRequestConflict>[]
        conflicts: Remote<MergeRequestConflict>[]
        tagDefinitionOrigin: ColumnDefinition
        tagDefinitionDestination: ColumnDefinition
    }) {
        this.updated = updated
        this.conflicts = conflicts
        this.tagDefinitionDestination = tagDefinitionDestination
        this.tagDefinitionOrigin = tagDefinitionOrigin
    }
}

export class GetMergeRequestConflictErrorAction {
    msg: string

    constructor(msg: string) {
        this.msg = msg
    }
}

export class ResolveConflictBaseAction {
    idEntityPersistent: string
    constructor(idEntityPersistent: string) {
        this.idEntityPersistent = idEntityPersistent
    }
}

export class ResolveConflictStartAction extends ResolveConflictBaseAction {}
export class ResolveConflictSuccessAction extends ResolveConflictBaseAction {
    replace: boolean
    constructor(idEntityPersistent: string, replace: boolean) {
        super(idEntityPersistent)
        this.replace = replace
    }
}
export class ResolveConflictErrorAction extends ResolveConflictBaseAction {
    msg: string
    constructor(idEntityPersistent: string, msg: string) {
        super(idEntityPersistent)
        this.msg = msg
    }
}

export class StartMergeErrorAction {
    msg: string
    constructor(msg: string) {
        this.msg = msg
    }
}

export class StartMergeClearErrorAction {}

export type MergeRequestConflictResolutionAction =
    | GetMergeRequestConflictStartAction
    | GetMergeRequestConflictSuccessAction
    | GetMergeRequestConflictErrorAction
    | StartMergeErrorAction
    | StartMergeClearErrorAction
