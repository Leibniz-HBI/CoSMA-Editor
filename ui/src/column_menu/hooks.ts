import { Context, createContext } from 'react'
import { ErrorState } from '../util/error/slice'
import { useThunkReducer } from '../util/state'
import {
    SubmitColumnDefinitionClearErrorAction,
    ToggleExpansionAction
} from './actions'
import { GetHierarchyAction, SubmitColumnDefinitionAction } from './async_actions'
import { columnMenuReducer } from './reducer'
import { ColumnSelectionState, ColumnSelectionEntry } from './state'

export type SubmitColumnDefinitionArgs = {
    name: string
    idParentPersistent?: string
    columnTypeIdx: number
}

export const ColumnHierarchyContext: Context<RemoteColumnMenuData | undefined> =
    createContext<RemoteColumnMenuData | undefined>(undefined)

export type RemoteColumnMenuData = {
    navigationEntries: ColumnSelectionEntry[]
    submitColumnError?: ErrorState
    toggleExpansionCallback: (path: number[]) => void
    getHierarchyCallback: VoidFunction
    submitColumnDefinitionCallback: (args: SubmitColumnDefinitionArgs) => void
    submitColumnDefinitionClearErrorCallback: () => void
}

export function useRemoteColumnMenuData(): RemoteColumnMenuData {
    const [state, dispatch] = useThunkReducer(
        columnMenuReducer,
        new ColumnSelectionState({})
    )

    function getHierarchyCallback() {
        if (state.isLoading) {
            return
        }
        dispatch(new GetHierarchyAction({ expand: true }))
    }
    return {
        navigationEntries: state.navigationEntries,
        submitColumnError: state.submissionErrorState,
        toggleExpansionCallback(path: number[]) {
            dispatch(new ToggleExpansionAction(path))
        },
        getHierarchyCallback: getHierarchyCallback,
        submitColumnDefinitionCallback: (args: SubmitColumnDefinitionArgs) => {
            if (state.isSubmittingDefinition) {
                return
            }
            dispatch(
                new SubmitColumnDefinitionAction({
                    name: args.name,
                    idParentPersistent: args.idParentPersistent,
                    columnTypeIdx: args.columnTypeIdx
                })
            ).then((success?: boolean) => {
                if (success) {
                    getHierarchyCallback()
                }
            })
        },
        submitColumnDefinitionClearErrorCallback: () =>
            dispatch(new SubmitColumnDefinitionClearErrorAction())
    }
}
