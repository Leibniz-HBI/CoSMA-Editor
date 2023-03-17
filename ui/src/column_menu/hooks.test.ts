/* eslint-disable @typescript-eslint/no-explicit-any */

import { useThunkReducer } from '../util/state'
import { ToggleExpansionAction } from './actions'
import { GetHierarchyAction } from './async_actions'
import { useRemoteColumnMenuData } from './hooks'
import { ColumnSelectionState } from './state'
jest.mock('../util/state', () => {
    const original = jest.requireActual('../util/state')
    return {
        ...original,
        useThunkReducer: jest.fn().mockImplementation()
    }
})
describe('Column menu hook', () => {
    const urlTest = 'http://test.url/'
    test(' get hierarchy callback exits early when already loading', async () => {
        ;(useThunkReducer as jest.Mock).mockReturnValue([
            new ColumnSelectionState({ isLoading: true }),
            (action: any) => {
                emittedActions.push(action)
            }
        ])
        const { getHierarchyCallback } = useRemoteColumnMenuData(urlTest)
        getHierarchyCallback()
        const emittedActions: any[] = []
        expect(emittedActions.length).toBe(0)
    })
    test('starts async action', () => {
        const emittedActions: any[] = []
        ;(useThunkReducer as jest.Mock).mockReturnValue([
            new ColumnSelectionState({}),
            (action: any) => {
                emittedActions.push(action)
            }
        ])
        const { getHierarchyCallback } = useRemoteColumnMenuData(urlTest)
        getHierarchyCallback()
        expect(emittedActions[0]).toEqual(
            new GetHierarchyAction({ apiPath: urlTest, expand: true })
        )
    })
    test('toggle callback emits action', () => {
        const emittedActions: any[] = []
        ;(useThunkReducer as jest.Mock).mockReturnValue([
            new ColumnSelectionState({
                // prevent emission of async action.
                isLoading: true
            }),
            (action: any) => {
                emittedActions.push(action)
            }
        ])
        const path = [2, 5, 7, 8]
        const { toggleExpansionCallback } = useRemoteColumnMenuData(urlTest)
        toggleExpansionCallback(path)
        expect(emittedActions[0]).toEqual(new ToggleExpansionAction(path))
    })
})
