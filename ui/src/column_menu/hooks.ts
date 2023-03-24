import { ErrorState } from '../util/error'
import { useThunkReducer } from '../util/state'
import {
    ColumnMenuTab,
    SelectTabAction,
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

export type RemoteColumnMenuData = {
    navigationEntries: ColumnSelectionEntry[]
    selectedTab: ColumnMenuTab
    submitColumnError?: ErrorState
    toggleExpansionCallback: (path: number[]) => void
    selectTabCallback: (tab: ColumnMenuTab) => void
    getHierarchyCallback: VoidFunction
    submitColumnDefinitionCallback: (args: SubmitColumnDefinitionArgs) => void
    submitColumnDefinitionClearErrorCallback: () => void
}

export function useRemoteColumnMenuData(baseUrl: string): RemoteColumnMenuData {
    const [state, dispatch] = useThunkReducer(
        columnMenuReducer,
        new ColumnSelectionState({
            submissionErrorState: new ErrorState('bla')
        })
    )

    function getHierarchyCallback() {
        if (state.isLoading) {
            return
        }
        dispatch(new GetHierarchyAction({ apiPath: baseUrl, expand: true }))
    }
    return {
        navigationEntries: state.navigationEntries,
        selectedTab: state.selectedTab,
        submitColumnError: state.submissionErrorState,
        toggleExpansionCallback(path: number[]) {
            dispatch(new ToggleExpansionAction(path))
        },
        selectTabCallback: (tab: ColumnMenuTab) => {
            dispatch(new SelectTabAction(tab))
        },
        getHierarchyCallback: getHierarchyCallback,
        submitColumnDefinitionCallback: (args: SubmitColumnDefinitionArgs) => {
            if (state.isSubmittingDefinition) {
                return
            }
            dispatch(
                new SubmitColumnDefinitionAction({
                    apiPath: baseUrl,
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
