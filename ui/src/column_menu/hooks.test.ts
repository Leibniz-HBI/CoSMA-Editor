/* eslint-disable @typescript-eslint/no-explicit-any */

import { useThunkReducer } from '../util/state'
import { ColumnMenuTab, SelectTabAction, ToggleExpansionAction } from './actions'
import { GetHierarchyAction, SubmitColumnDefinitionAction } from './async_actions'
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
        const emittedActions: any[] = []
        ;(useThunkReducer as jest.Mock).mockReturnValue([
            new ColumnSelectionState({ isLoading: true }),
            (action: any) => {
                emittedActions.push(action)
            }
        ])
        const { getHierarchyCallback } = useRemoteColumnMenuData(urlTest)
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
        const { getHierarchyCallback } = useRemoteColumnMenuData(urlTest)
        getHierarchyCallback()
        expect(emittedActions).toEqual([
            new GetHierarchyAction({ apiPath: urlTest, expand: true })
        ])
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
        expect(emittedActions).toEqual([new ToggleExpansionAction(path)])
    })
    test('select tab callback emits action', () => {
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
        const { selectTabCallback } = useRemoteColumnMenuData(urlTest)
        selectTabCallback(ColumnMenuTab.CREATE_NEW)
        expect(emittedActions[0]).toEqual(new SelectTabAction(ColumnMenuTab.CREATE_NEW))
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
        const { submitColumnDefinitionCallback } = useRemoteColumnMenuData(urlTest)
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
                apiPath: urlTest,
                name: columnNameTest,
                idParentPersistent: idParentPersistentTest,
                columnTypeIdx: 1
            }),
            new GetHierarchyAction({ apiPath: urlTest, expand: true })
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
        const { submitColumnDefinitionCallback } = useRemoteColumnMenuData(urlTest)
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
        const { submitColumnDefinitionCallback } = useRemoteColumnMenuData(urlTest)
        const columnNameTest = 'column name test'
        const idParentPersistentTest = 'id-parent-test'
        submitColumnDefinitionCallback({
            name: columnNameTest,
            idParentPersistent: idParentPersistentTest,
            columnTypeIdx: 1
        })
        expect(emittedActions).toEqual([
            new SubmitColumnDefinitionAction({
                apiPath: urlTest,
                name: columnNameTest,
                idParentPersistent: idParentPersistentTest,
                columnTypeIdx: 1
            })
        ])
    })
})
