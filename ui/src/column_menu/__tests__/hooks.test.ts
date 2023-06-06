/* eslint-disable @typescript-eslint/no-explicit-any */

import { useThunkReducer } from '../../util/state'
import { ToggleExpansionAction } from '../actions'
import { GetHierarchyAction, SubmitColumnDefinitionAction } from '../async_actions'
import { useRemoteColumnMenuData } from '../hooks'
import { ColumnSelectionState } from '../state'
jest.mock('../../util/state', () => {
    const original = jest.requireActual('../../util/state')
    return {
        ...original,
        useThunkReducer: jest.fn().mockImplementation()
    }
})
describe('Column menu hook', () => {
    test(' get hierarchy callback exits early when already loading', async () => {
        const emittedActions: any[] = []
        ;(useThunkReducer as jest.Mock).mockReturnValue([
            new ColumnSelectionState({ isLoading: true }),
            (action: any) => {
                emittedActions.push(action)
            }
        ])
        const { getHierarchyCallback } = useRemoteColumnMenuData()
        getHierarchyCallback()
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
        const { getHierarchyCallback } = useRemoteColumnMenuData()
        getHierarchyCallback()
        expect(emittedActions).toEqual([new GetHierarchyAction({ expand: true })])
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
        const { toggleExpansionCallback } = useRemoteColumnMenuData()
        toggleExpansionCallback(path)
        expect(emittedActions).toEqual([new ToggleExpansionAction(path)])
    })
    test('submit column definition callback emits two actions', async () => {
        const emittedActions: any[] = []
        ;(useThunkReducer as jest.Mock).mockReturnValue([
            new ColumnSelectionState({}),
            (action: any) => {
                emittedActions.push(action)
                return Promise.resolve(true)
            }
        ])
        const { submitColumnDefinitionCallback } = useRemoteColumnMenuData()
        const columnNameTest = 'column name test'
        const idParentPersistentTest = 'id-parent-test'
        submitColumnDefinitionCallback({
            name: columnNameTest,
            idParentPersistent: idParentPersistentTest,
            columnTypeIdx: 1
        })
        await setTimeout(() => true, 100)
        expect(emittedActions).toEqual([
            new SubmitColumnDefinitionAction({
                name: columnNameTest,
                idParentPersistent: idParentPersistentTest,
                columnTypeIdx: 1
            }),
            new GetHierarchyAction({ expand: true })
        ])
    })
    test('submit column definition callback not emitting when already submitting', () => {
        const emittedActions: any[] = []
        ;(useThunkReducer as jest.Mock).mockReturnValue([
            new ColumnSelectionState({
                // prevent emission of async action.
                isLoading: true,
                isSubmittingDefinition: true
            }),
            (action: any) => {
                emittedActions.push(action)
                return Promise.resolve(true)
            }
        ])
        const { submitColumnDefinitionCallback } = useRemoteColumnMenuData()
        const columnNameTest = 'column name test'
        const idParentPersistentTest = 'id-parent-test'
        submitColumnDefinitionCallback({
            name: columnNameTest,
            idParentPersistent: idParentPersistentTest,
            columnTypeIdx: 1
        })
        expect(emittedActions).toEqual([])
    })
    test('submit column definition callback not emitting get hierarchy when submitting fails', () => {
        const emittedActions: any[] = []
        ;(useThunkReducer as jest.Mock).mockReturnValue([
            new ColumnSelectionState({
                isLoading: false,
                isSubmittingDefinition: false
            }),
            (action: any) => {
                emittedActions.push(action)
                return Promise.resolve(false)
            }
        ])
        const { submitColumnDefinitionCallback } = useRemoteColumnMenuData()
        const columnNameTest = 'column name test'
        const idParentPersistentTest = 'id-parent-test'
        submitColumnDefinitionCallback({
            name: columnNameTest,
            idParentPersistent: idParentPersistentTest,
            columnTypeIdx: 1
        })
        expect(emittedActions).toEqual([
            new SubmitColumnDefinitionAction({
                name: columnNameTest,
                idParentPersistent: idParentPersistentTest,
                columnTypeIdx: 1
            })
        ])
    })
})
