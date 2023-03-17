import { useThunkReducer } from '../util/state'
import { ToggleExpansionAction } from './actions'
import { GetHierarchyAction } from './async_actions'
import { columnMenuReducer } from './reducer'
import { ColumnSelectionState, ColumnSelectionEntry } from './state'

export type RemoteColumnMenuData = {
    navigationEntries: ColumnSelectionEntry[]
    toggleExpansionCallback: (path: number[]) => void
    getHierarchyCallback: VoidFunction
}

export function useRemoteColumnMenuData(baseUrl: string): RemoteColumnMenuData {
    const [state, dispatch] = useThunkReducer(
        columnMenuReducer,
        new ColumnSelectionState({})
    )

    return {
        navigationEntries: state.navigationEntries,
        toggleExpansionCallback(path: number[]) {
            dispatch(new ToggleExpansionAction(path))
        },
        getHierarchyCallback: () => {
            if (state.isLoading) {
                return
            }
            dispatch(new GetHierarchyAction({ apiPath: baseUrl, expand: true }))
        }
    }
}
