import { Remote } from '../../util/state'
import { MergeRequest } from '../state'
import { MergeRequestConflict } from './state'

export class GetMergeRequestConflictStartAction {}

export class GetMergeRequestConflictSuccessAction {
    updated: Remote<MergeRequestConflict>[]
    conflicts: Remote<MergeRequestConflict>[]
    mergeRequest: MergeRequest

    constructor({
        updated,
        conflicts,
        mergeRequest
    }: {
        updated: Remote<MergeRequestConflict>[]
        conflicts: Remote<MergeRequestConflict>[]
        mergeRequest: MergeRequest
    }) {
        this.updated = updated
        this.conflicts = conflicts
        this.mergeRequest = mergeRequest
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

export class StartMergeStartAction {}

export class StartMergeSuccessAction {}

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
    | StartMergeStartAction
    | StartMergeSuccessAction
    | StartMergeErrorAction
    | StartMergeClearErrorAction
