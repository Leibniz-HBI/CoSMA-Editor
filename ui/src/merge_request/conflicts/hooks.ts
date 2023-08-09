import { ColumnDefinition } from '../../column_menu/state'
import { Entity } from '../../contribution/entity/state'
import { Remote, useThunkReducer } from '../../util/state'
import { StartMergeClearErrorAction } from './actions'
import {
    GetMergeRequestConflictAction,
    ResolveConflictAction,
    StartMergeAction
} from './async_actions'
import { mergeRequestConflictResolutionReducer } from './reducer'
import { MergeRequestConflictResolutionState, TagInstance } from './state'

export function useMergeRequestConflictResolutions(idMergeRequestPersistent: string) {
    const [state, dispatch] = useThunkReducer(
        mergeRequestConflictResolutionReducer,
        new MergeRequestConflictResolutionState(
            new Remote(undefined),
            new Remote(false)
        )
    )

    return {
        getMergeRequestConflictsCallback: () => {
            if (state.conflicts.isLoading) {
                return
            }
            dispatch(new GetMergeRequestConflictAction(idMergeRequestPersistent))
        },
        resolveConflictCallback: ({
            entity,
            tagInstanceOrigin,
            tagDefinitionOrigin,
            tagInstanceDestination,
            tagDefinitionDestination,
            replace
        }: {
            entity: Entity
            tagInstanceOrigin: TagInstance
            tagDefinitionOrigin: ColumnDefinition
            tagInstanceDestination?: TagInstance
            tagDefinitionDestination: ColumnDefinition
            replace: boolean
        }) =>
            dispatch(
                new ResolveConflictAction({
                    idMergeRequestPersistent,
                    entity,
                    tagInstanceOrigin,
                    tagDefinitionOrigin,
                    tagInstanceDestination,
                    tagDefinitionDestination,
                    replace
                })
            ),
        conflictsByCategory: state.conflicts,
        startMerge: state.startMerge,
        startMergeCallback: () => {
            if (state.startMerge.isLoading) {
                return
            }
            dispatch(new StartMergeAction(idMergeRequestPersistent))
        },
        startMergeClearErrorCallback: () => dispatch(new StartMergeClearErrorAction())
    }
}
