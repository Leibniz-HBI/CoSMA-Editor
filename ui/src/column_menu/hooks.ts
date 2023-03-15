import { useLayoutEffect } from 'react'
import { useThunkReducer } from '../util/state'
import { ToggleExpansionAction } from './actions'
import { GetHierarchyAction } from './async_actions'
import { columnMenuReducer } from './reducer'
import { ColumnSelectionState, ColumnSelectionEntry } from './state'

export type RemoteColumnMenuData = {
    navigationEntries: ColumnSelectionEntry[]
    toggleExpansionCallback: (path: number[]) => void
}

export function useRemoteColumnMenuData(baseUrl: string): RemoteColumnMenuData {
    const [state, dispatch] = useThunkReducer(
        columnMenuReducer,
        new ColumnSelectionState({})
    )
    useLayoutEffect(
        () => {
            if (!state.isLoading) {
                dispatch(new GetHierarchyAction({ apiPath: baseUrl, expand: true }))
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [baseUrl]
    )

    return {
        navigationEntries: state.navigationEntries,
        toggleExpansionCallback(path: number[]) {
            dispatch(new ToggleExpansionAction(path))
        }
    }
}
