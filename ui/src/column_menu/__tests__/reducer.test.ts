import { describe } from '@jest/globals'
import { columnMenuReducer } from '../reducer'
import {
    ColumnDefinition,
    ColumnSelectionEntry,
    ColumnSelectionState,
    ColumnType
} from '../state'
import {
    ClearSearchEntriesAction,
    LoadColumnHierarchySuccessAction,
    SetSearchEntriesAction,
    LoadColumnHierarchyStartAction,
    StartSearchAction,
    SubmitColumnDefinitionErrorAction,
    SubmitColumnDefinitionStartAction,
    SubmitColumnDefinitionSuccessAction,
    ToggleExpansionAction
} from '../actions'
import { ErrorState } from '../../util/error/slice'

describe('Column Menu Reducer', () => {
    const columnSelectionEntryTest10 = new ColumnSelectionEntry({
        columnDefinition: new ColumnDefinition({
            namePath: ['parent1', 'child0'],
            idPersistent: 'column_id_test_10',
            version: 2,
            columnType: ColumnType.String
        })
    })
    const columnSelectionEntryTest11 = new ColumnSelectionEntry({
        columnDefinition: new ColumnDefinition({
            namePath: ['parent1', 'child1'],
            idPersistent: 'column_id_test_11',
            version: 3,
            columnType: ColumnType.String
        })
    })
    const columnSelectionEntryTest0 = new ColumnSelectionEntry({
        columnDefinition: new ColumnDefinition({
            namePath: ['parent1'],
            idPersistent: 'column_id_test_0',
            version: 0,
            columnType: ColumnType.Inner
        })
    })
    const columnSelectionEntryTest1 = new ColumnSelectionEntry({
        columnDefinition: new ColumnDefinition({
            namePath: ['parent0'],
            idPersistent: 'column_id_test_1',
            version: 1,
            columnType: ColumnType.Inner
        }),
        children: [columnSelectionEntryTest10, columnSelectionEntryTest11]
    })
    describe('loading', () => {
        test('global loading', () => {
            const initialState = new ColumnSelectionState({
                navigationEntries: [
                    columnSelectionEntryTest0,
                    columnSelectionEntryTest1
                ]
            })
            const expectedState = new ColumnSelectionState({
                isLoading: true,
                navigationEntries: [
                    columnSelectionEntryTest0,
                    columnSelectionEntryTest1
                ]
            })
            const endState = columnMenuReducer(
                initialState,
                new LoadColumnHierarchyStartAction([])
            )
            expect(endState).toEqual(expectedState)
        })
        test('entry loading', () => {
            const initialState = new ColumnSelectionState({
                navigationEntries: [
                    columnSelectionEntryTest0,
                    columnSelectionEntryTest1
                ]
            })
            const expectedState = new ColumnSelectionState({
                isLoading: false,
                navigationEntries: [
                    columnSelectionEntryTest0,
                    new ColumnSelectionEntry({
                        ...columnSelectionEntryTest1,
                        children: [
                            columnSelectionEntryTest10,
                            new ColumnSelectionEntry({
                                ...columnSelectionEntryTest11,
                                isLoading: true
                            })
                        ]
                    })
                ]
            })
            const endState = columnMenuReducer(
                initialState,
                new LoadColumnHierarchyStartAction([1, 1])
            )
            expect(endState).toEqual(expectedState)
        })
    })
    describe('Set navigation entries', () => {
        test('top level', () => {
            const initialState = new ColumnSelectionState({ isLoading: true })
            const expectedState = new ColumnSelectionState({
                navigationEntries: [
                    columnSelectionEntryTest0,
                    columnSelectionEntryTest1
                ]
            })
            const endState = columnMenuReducer(
                initialState,
                new LoadColumnHierarchySuccessAction(
                    [columnSelectionEntryTest0, columnSelectionEntryTest1],
                    []
                )
            )
            expect(endState).toEqual(expectedState)
        })

        test('Set children', () => {
            const initialState = new ColumnSelectionState({
                navigationEntries: [
                    columnSelectionEntryTest0,
                    columnSelectionEntryTest1
                ]
            })
            const childrenTest = [
                columnSelectionEntryTest10,
                columnSelectionEntryTest11
            ]
            const expectedState = new ColumnSelectionState({
                navigationEntries: [
                    new ColumnSelectionEntry({
                        ...columnSelectionEntryTest0,
                        children: childrenTest
                    }),
                    columnSelectionEntryTest1
                ]
            })
            const endState = columnMenuReducer(
                initialState,
                new LoadColumnHierarchySuccessAction(childrenTest, [0])
            )
            expect(endState).toEqual(expectedState)
        })
    })
    test('Toggle expansion', () => {
        const initialState = new ColumnSelectionState({
            navigationEntries: [columnSelectionEntryTest0, columnSelectionEntryTest1]
        })
        const expectedState = new ColumnSelectionState({
            navigationEntries: [
                columnSelectionEntryTest0,
                new ColumnSelectionEntry({
                    ...columnSelectionEntryTest1,
                    children: [
                        new ColumnSelectionEntry({
                            ...columnSelectionEntryTest10,
                            isExpanded: true
                        }),
                        columnSelectionEntryTest11
                    ]
                })
            ]
        })
        const endState = columnMenuReducer(
            initialState,
            new ToggleExpansionAction([1, 0])
        )
        expect(endState).toEqual(expectedState)
    })
    describe('searchEntries', () => {
        test('start searching', () => {
            const initialState = new ColumnSelectionState({
                searchEntries: [columnSelectionEntryTest0]
            })
            const expectedState = new ColumnSelectionState({
                searchEntries: [columnSelectionEntryTest0],
                isSearching: true
            })
            const endState = columnMenuReducer(initialState, new StartSearchAction())
            expect(endState).toEqual(expectedState)
        })
        test('set search entries', () => {
            const initialState = new ColumnSelectionState({ isSearching: true })
            const expectedState = new ColumnSelectionState({
                searchEntries: [columnSelectionEntryTest0]
            })
            const endState = columnMenuReducer(
                initialState,
                new SetSearchEntriesAction([columnSelectionEntryTest0])
            )
            expect(endState).toEqual(expectedState)
        })
        test('clear search entries', () => {
            const initialState = new ColumnSelectionState({
                searchEntries: [columnSelectionEntryTest0]
            })
            const expectedState = new ColumnSelectionState({})
            const endState = columnMenuReducer(
                initialState,
                new ClearSearchEntriesAction()
            )
            expect(endState).toEqual(expectedState)
        })
        test('submit column definition start', () => {
            const initialState = new ColumnSelectionState({
                submissionErrorState: new ErrorState('error')
            })
            const expectedState = new ColumnSelectionState({
                isSubmittingDefinition: true
            })
            const endState = columnMenuReducer(
                initialState,
                new SubmitColumnDefinitionStartAction()
            )
            expect(endState).toEqual(expectedState)
        })
        test('submit column definition success', () => {
            const initialState = new ColumnSelectionState({
                isSubmittingDefinition: true
            })
            const expectedState = new ColumnSelectionState({
                isSubmittingDefinition: false
            })
            const endState = columnMenuReducer(
                initialState,
                new SubmitColumnDefinitionSuccessAction()
            )
            expect(endState).toEqual(expectedState)
        })
        test('submit column definition error', () => {
            const initialState = new ColumnSelectionState({
                isSubmittingDefinition: true
            })
            const expectedState = new ColumnSelectionState({
                submissionErrorState: new ErrorState(
                    'error',
                    undefined,
                    'id-error-test'
                )
            })
            const endState = columnMenuReducer(
                initialState,
                new SubmitColumnDefinitionErrorAction(
                    new ErrorState('error', undefined, 'id-error-test')
                )
            )
            expect(endState).toEqual(expectedState)
        })
    })
})
