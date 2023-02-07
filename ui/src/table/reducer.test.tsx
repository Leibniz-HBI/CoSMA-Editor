import { describe, expect, test } from '@jest/globals'
import {
    SetEntityLoadingAction,
    SetErrorAction,
    SetEntitiesAction,
    SetColumnLoadingAction,
    AppendColumnAction
} from './actions'
import { tableReducer } from './reducer'
import { ColumnState, ColumnType, TableState } from './state'
describe('reducer tests', () => {
    const columnNameTest = 'column test name'
    const columnIdTest = 'column_id_test'
    const columnNameTest1 = 'test column 1'
    const columnIdTest1 = 'column_id_test_1'
    test('init to loading', () => {
        const state = new TableState({})
        const end_state = tableReducer(state, new SetEntityLoadingAction())
        const expected_state = new TableState({ isLoading: true })
        expect(end_state).toEqual(expected_state)
    })
    test('loading to error', () => {
        const state = new TableState({})
        const end_state = tableReducer(state, new SetErrorAction('test error'))
        const expected_state = new TableState({
            isLoading: false,
            errorMsg: 'test error'
        })
        expect(end_state).toEqual(expected_state)
    })
    test('loading to success', () => {
        const state = new TableState({ isLoading: true })
        const entities = ['entity0', 'entity1', 'entity3']
        const end_state = tableReducer(state, new SetEntitiesAction(entities))
        const expected_state = new TableState({
            isLoading: false,
            entities: entities
        })
        expect(end_state).toEqual(expected_state)
    })
    test('error to loading', () => {
        const state = new TableState({ errorMsg: 'test error' })
        const end_state = tableReducer(state, new SetEntityLoadingAction())
        const expected_state = new TableState({ isLoading: true })
        expect(end_state).toEqual(expected_state)
    })
    test('reload', () => {
        const row_objects = [
            { a: 1, b: 3 },
            { a: 2, b: 4 }
        ]
        const state = new TableState({ rowObjects: row_objects })
        const end_state = tableReducer(state, new SetEntityLoadingAction())
        const expected_state = new TableState({
            isLoading: true,
            rowObjects: row_objects
        })
        expect(end_state).toEqual(expected_state)
    })
    describe('start column load', () => {
        test('when empty', () => {
            const action = new SetColumnLoadingAction(
                columnNameTest,
                columnIdTest,
                ColumnType.String
            )
            const state = new TableState({})
            const expectedState = new TableState({
                columnIndices: { column_id_test: 0 },
                columnStates: [
                    new ColumnState({
                        name: columnNameTest,
                        isLoading: true,
                        idPersistent: columnIdTest,
                        columnType: ColumnType.String
                    })
                ]
            })
            const endState = tableReducer(state, action)
            expect(endState).toEqual(expectedState)
        })
        test('when already present', () => {
            const action = new SetColumnLoadingAction(
                columnNameTest,
                columnIdTest,
                ColumnType.String
            )
            const state = new TableState({
                columnIndices: { column_id_test: 0 },
                columnStates: [
                    new ColumnState({
                        name: columnNameTest,
                        isLoading: true,
                        idPersistent: columnIdTest,
                        columnType: ColumnType.String
                    })
                ]
            })
            const expectedState = new TableState({
                columnIndices: { column_id_test: 0 },
                columnStates: [
                    new ColumnState({
                        name: columnNameTest,
                        isLoading: true,
                        idPersistent: columnIdTest,
                        columnType: ColumnType.String
                    })
                ]
            })
            const endState = tableReducer(state, action)
            expect(endState).toEqual(expectedState)
        })
        test('when other column is present', () => {
            const action = new SetColumnLoadingAction(
                columnNameTest,
                columnIdTest,
                ColumnType.String
            )
            const state = new TableState({
                columnIndices: { column_id_test_1: 0 },
                columnStates: [
                    new ColumnState({
                        name: columnNameTest1,
                        isLoading: true,
                        idPersistent: columnIdTest1,
                        columnType: ColumnType.String
                    })
                ]
            })
            const expectedState = new TableState({
                columnIndices: { column_id_test_1: 0, column_id_test: 1 },
                columnStates: [
                    new ColumnState({
                        name: columnNameTest1,
                        isLoading: true,
                        idPersistent: columnIdTest1,
                        columnType: ColumnType.String
                    }),
                    new ColumnState({
                        name: columnNameTest,
                        isLoading: true,
                        idPersistent: columnIdTest,
                        columnType: ColumnType.String
                    })
                ]
            })
            const endState = tableReducer(state, action)
            expect(endState).toEqual(expectedState)
        })
    })
    describe('Finish column loading', () => {
        const columnDataTest = { id_entity_test: ['foo'] }
        const columnDataTest1 = { id_entity_test: ['bar'] }
        test('when empty', () => {
            const state = new TableState({})
            const action = new AppendColumnAction(columnIdTest, {})
            const expectedState = new TableState({})
            const endState = tableReducer(state, action)
            expect(endState).toEqual(expectedState)
        })
        test('when loading', () => {
            const state = new TableState({
                columnIndices: { column_id_test: 0 },
                columnStates: [
                    new ColumnState({
                        name: columnNameTest,
                        isLoading: true,
                        idPersistent: columnIdTest,
                        columnType: ColumnType.String
                    })
                ]
            })
            const action = new AppendColumnAction(columnIdTest, columnDataTest)
            const expectedState = new TableState({
                columnIndices: { column_id_test: 0 },
                columnStates: [
                    new ColumnState({
                        name: columnNameTest,
                        cellContents: columnDataTest,
                        isLoading: false,
                        idPersistent: columnIdTest,
                        columnType: ColumnType.String
                    })
                ]
            })
            const endState = tableReducer(state, action)
            expect(endState).toEqual(expectedState)
        })
        describe('when other is present', () => {
            const otherColumn = new ColumnState({
                name: columnNameTest1,
                isLoading: true,
                idPersistent: columnIdTest1,
                columnType: ColumnType.Boolean
            })
            const state = new TableState({
                columnIndices: { column_id_test: 0, column_id_test_1: 1 },
                columnStates: [
                    new ColumnState({
                        name: columnNameTest,
                        isLoading: true,
                        idPersistent: columnIdTest,
                        columnType: ColumnType.String
                    }),
                    otherColumn
                ]
            })
            const action = new AppendColumnAction(columnIdTest, columnDataTest)
            const expectedState = new TableState({
                columnIndices: { column_id_test: 0, column_id_test_1: 1 },
                columnStates: [
                    new ColumnState({
                        name: columnNameTest,
                        cellContents: columnDataTest,
                        isLoading: false,
                        idPersistent: columnIdTest,
                        columnType: ColumnType.String
                    }),
                    otherColumn
                ]
            })
            const endState = tableReducer(state, action)
            expect(endState).toEqual(expectedState)
        })
    })
})
