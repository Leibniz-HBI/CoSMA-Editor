import {
    MergeRequestConflict,
    MergeRequestConflictResolutionState,
    MergeRequestConflictsByState
} from './state'
import {
    GetMergeRequestConflictErrorAction,
    GetMergeRequestConflictStartAction,
    GetMergeRequestConflictSuccessAction,
    MergeRequestConflictResolutionAction,
    ResolveConflictBaseAction,
    ResolveConflictErrorAction,
    ResolveConflictStartAction,
    ResolveConflictSuccessAction,
    StartMergeClearErrorAction,
    StartMergeErrorAction,
    StartMergeStartAction,
    StartMergeSuccessAction
} from './actions'
import { Remote } from '../../util/state'

export function mergeRequestConflictResolutionReducer(
    state: MergeRequestConflictResolutionState,
    action: MergeRequestConflictResolutionAction
) {
    if (action instanceof ResolveConflictBaseAction) {
        if (state.conflicts.value === undefined) {
            return state
        }
        let newUpdated = state.conflicts.value.updated
        let newUpdatedMap = state.conflicts.value.updatedEntityIdMap
        const updatedIdx = state.conflicts.value.updatedEntityIdMap.get(
            action.idEntityPersistent
        )
        if (updatedIdx !== undefined) {
            const changed = resolutionReducer(newUpdated[updatedIdx], action)
            if (changed.value.replace !== undefined) {
                newUpdated = [
                    ...newUpdated.slice(0, updatedIdx),
                    ...newUpdated.slice(updatedIdx + 1)
                ]
                newUpdatedMap = new Map(
                    newUpdated.map((conflict, idx) => [
                        conflict.value.entity.idPersistent,
                        idx
                    ])
                )
            } else {
                newUpdated = [
                    ...newUpdated.slice(0, updatedIdx),
                    changed,
                    ...newUpdated.slice(updatedIdx + 1)
                ]
            }
        }
        let newConflicts = state.conflicts.value.conflicts
        const conflictIdx = state.conflicts.value.conflictsEntityIdMap.get(
            action.idEntityPersistent
        )
        if (conflictIdx !== undefined) {
            newConflicts = [
                ...newConflicts.slice(0, conflictIdx),
                resolutionReducer(newConflicts[conflictIdx], action),
                ...newConflicts.slice(conflictIdx + 1)
            ]
        }
        return new MergeRequestConflictResolutionState(
            new Remote(
                new MergeRequestConflictsByState({
                    ...state.conflicts.value,
                    updated: newUpdated,
                    updatedEntityIdMap: newUpdatedMap,
                    conflicts: newConflicts
                }),
                state.conflicts.isLoading,
                state.conflicts.errorMsg
            ),
            state.startMerge
        )
    }
    if (action instanceof GetMergeRequestConflictStartAction) {
        return new MergeRequestConflictResolutionState(
            state.conflicts.startLoading(),
            state.startMerge
        )
    }
    if (action instanceof GetMergeRequestConflictSuccessAction) {
        return new MergeRequestConflictResolutionState(
            state.conflicts.success(
                new MergeRequestConflictsByState({
                    updated: action.updated,
                    conflicts: action.conflicts,
                    mergeRequest: action.mergeRequest
                })
            ),
            state.startMerge
        )
    }
    if (action instanceof StartMergeStartAction) {
        return new MergeRequestConflictResolutionState(
            state.conflicts,
            state.startMerge.startLoading()
        )
    }
    if (action instanceof StartMergeSuccessAction) {
        return new MergeRequestConflictResolutionState(
            state.conflicts,
            new Remote(true)
        )
    }
    if (action instanceof GetMergeRequestConflictErrorAction) {
        return new MergeRequestConflictResolutionState(
            state.conflicts.withError(action.msg),
            state.startMerge
        )
    }
    if (action instanceof StartMergeErrorAction) {
        return new MergeRequestConflictResolutionState(
            state.conflicts,
            new Remote(false, false, action.msg)
        )
    }
    if (action instanceof StartMergeClearErrorAction) {
        return new MergeRequestConflictResolutionState(
            state.conflicts,
            new Remote(false, state.startMerge.isLoading)
        )
    }
    return state
}

export function resolutionReducer(
    state: Remote<MergeRequestConflict>,
    action: ResolveConflictBaseAction
) {
    if (action instanceof ResolveConflictStartAction) {
        return state.startLoading()
    }
    if (action instanceof ResolveConflictSuccessAction) {
        return state.success(
            new MergeRequestConflict({ ...state.value, replace: action.replace })
        )
    }
    if (action instanceof ResolveConflictErrorAction) {
        return state.withError(action.msg)
    }
    return state
}
