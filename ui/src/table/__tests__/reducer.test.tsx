import { describe, expect, test } from '@jest/globals'
import { ColumnType } from '../../column_menu/state'
import { ErrorState } from '../../util/error/slice'
import {
    SetEntityLoadingAction,
    SetLoadDataErrorAction,
    SetEntitiesAction,
    SetColumnLoadingAction,
    AppendColumnAction,
    ShowColumnAddMenuAction,
    HideColumnAddMenuAction,
    ShowHeaderMenuAction,
    HideHeaderMenuAction,
    RemoveSelectedColumnAction,
    SetColumnWidthAction,
    ChangeColumnIndexAction,
    SubmitValuesStartAction,
    SubmitValuesErrorAction,
    SubmitValuesEndAction,
    SubmitValuesClearErrorAction
} from '../actions'
import { tableReducer } from '../reducer'
import { ColumnState, TableState } from '../state'
describe('reducer tests', () => {
    const columnNameTest = 'column test name'
    const columnIdTest = 'column_id_test'
    const columnNameTest1 = 'test column 1'
    const columnIdTest1 = 'column_id_test_1'
    const columnsTest = [
        new ColumnState({
            idPersistent: columnIdTest1,
            columnType: ColumnType.String,
            name: columnNameTest1
        }),
        new ColumnState({
            idPersistent: columnIdTest,
            columnType: ColumnType.String,
            name: columnNameTest
        })
    ]
    test('init to loading', () => {
        const state = new TableState({})
        const end_state = tableReducer(state, new SetEntityLoadingAction())
        const expected_state = new TableState({ isLoading: true })
        expect(end_state).toEqual(expected_state)
    })
    test('loading to error', () => {
        const state = new TableState({})
        const end_state = tableReducer(
            state,
            new SetLoadDataErrorAction(
                new ErrorState('test error', undefined, 'id-error-test')
            )
        )
        const expected_state = new TableState({
            isLoading: false,
            loadDataErrorState: new ErrorState('test error', undefined, 'id-error-test')
        })
        expect(end_state).toEqual(expected_state)
    })
    test('loading to success', () => {
        const state = new TableState({ isLoading: true })
        const entities = ['entity0', 'entity1', 'entity3']
        const end_state = tableReducer(state, new SetEntitiesAction(entities))
        const expected_state = new TableState({
            isLoading: false,
            entities: entities,
            entityIndices: new Map([
                ['entity0', 0],
                ['entity1', 1],
                ['entity3', 2]
            ])
        })
        expect(end_state).toEqual(expected_state)
    })
    test('error to loading', () => {
        const state = new TableState({
            loadDataErrorState: new ErrorState('test error')
        })
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
                columnIndices: new Map(Object.entries({ column_id_test: 0 })),
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
                columnIndices: new Map(Object.entries({ column_id_test: 0 })),
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
                columnIndices: new Map(Object.entries({ column_id_test: 0 })),
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
                columnIndices: new Map(Object.entries({ column_id_test_1: 0 })),
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
                columnIndices: new Map(
                    Object.entries({ column_id_test_1: 0, column_id_test: 1 })
                ),
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
        const columnDataTest = {
            id_entity_test: [
                { value: 'foo', idPersistent: 'id-value-test-2', version: 23 }
            ]
        }
        test('when empty', () => {
            const state = new TableState({})
            const action = new AppendColumnAction(columnIdTest, {})
            const expectedState = new TableState({})
            const endState = tableReducer(state, action)
            expect(endState).toEqual(expectedState)
        })
        test('when loading', () => {
            const state = new TableState({
                columnIndices: new Map(Object.entries({ column_id_test: 0 })),
                entities: ['id_entity_test'],
                entityIndices: new Map([['id_entity_test', 0]]),
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
                columnIndices: new Map(Object.entries({ column_id_test: 0 })),
                entities: ['id_entity_test'],
                entityIndices: new Map([['id_entity_test', 0]]),
                columnStates: [
                    new ColumnState({
                        name: columnNameTest,
                        cellContents: [
                            [
                                {
                                    value: 'foo',
                                    idPersistent: 'id-value-test-2',
                                    version: 23
                                }
                            ]
                        ],
                        isLoading: false,
                        idPersistent: columnIdTest,
                        columnType: ColumnType.String
                    })
                ]
            })
            const endState = tableReducer(state, action)
            expect(endState).toEqual(expectedState)
        })
        test('when other column is present', () => {
            const otherColumn = new ColumnState({
                name: columnNameTest1,
                isLoading: true,
                idPersistent: columnIdTest1,
                columnType: ColumnType.Inner
            })
            const state = new TableState({
                entities: ['id_entity_test'],
                entityIndices: new Map([['id_entity_test', 0]]),
                columnIndices: new Map(
                    Object.entries({ column_id_test: 0, column_id_test_1: 1 })
                ),
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
                entities: ['id_entity_test'],
                entityIndices: new Map([['id_entity_test', 0]]),
                columnIndices: new Map(
                    Object.entries({ column_id_test: 0, column_id_test_1: 1 })
                ),
                columnStates: [
                    new ColumnState({
                        name: columnNameTest,
                        cellContents: [
                            [
                                {
                                    value: 'foo',
                                    idPersistent: 'id-value-test-2',
                                    version: 23
                                }
                            ]
                        ],
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
    describe('column add menu', () => {
        test('show column menu', () => {
            const initialState = new TableState({})
            const expectedState = new TableState({ showColumnAddMenu: true })
            const endState = tableReducer(initialState, new ShowColumnAddMenuAction())
            expect(endState).toEqual(expectedState)
        })
        test('hide column menu', () => {
            const initialState = new TableState({ showColumnAddMenu: true })
            const expectedState = new TableState({})
            const endState = tableReducer(initialState, new HideColumnAddMenuAction())
            expect(endState).toEqual(expectedState)
        })
    })
    describe('header menu', () => {
        const rectangleTest = { x: 12, y: 13, width: 14, height: 15 }
        test('show header menu', () => {
            const initialState = new TableState({
                columnStates: columnsTest
            })
            const expectedState = new TableState({
                selectedColumnHeaderByIdPersistent: columnIdTest,
                selectedColumnHeaderBounds: rectangleTest,
                columnStates: columnsTest
            })
            const endState = tableReducer(
                initialState,
                new ShowHeaderMenuAction(1, rectangleTest)
            )
            expect(endState).toEqual(expectedState)
        })
        test('hide header menu', () => {
            const initialState = new TableState({
                selectedColumnHeaderByIdPersistent: columnIdTest,
                selectedColumnHeaderBounds: rectangleTest,
                columnStates: columnsTest
            })
            const expectedState = new TableState({
                columnStates: columnsTest
            })
            const endState = tableReducer(initialState, new HideHeaderMenuAction())
            expect(endState).toEqual(expectedState)
        })
        test('remove selected column', () => {
            const initialState = new TableState({
                selectedColumnHeaderByIdPersistent: columnIdTest1,
                selectedColumnHeaderBounds: rectangleTest,
                columnStates: columnsTest,
                columnIndices: new Map([
                    [columnIdTest1, 0],
                    [columnIdTest, 1]
                ])
            })
            const expectedState = new TableState({
                columnStates: [columnsTest[1]],
                columnIndices: new Map([[columnIdTest, 0]])
            })
            const endState = tableReducer(
                initialState,
                new RemoveSelectedColumnAction()
            )
            expect(endState).toEqual(expectedState)
        })
        test('remove selected but missing column', () => {
            const initialState = new TableState({
                selectedColumnHeaderByIdPersistent: columnIdTest1,
                selectedColumnHeaderBounds: rectangleTest,
                columnStates: [columnsTest[1]],
                columnIndices: new Map([[columnIdTest, 0]])
            })
            const expectedState = new TableState({
                columnStates: [columnsTest[1]],
                columnIndices: new Map([[columnIdTest, 0]])
            })
            const endState = tableReducer(
                initialState,
                new RemoveSelectedColumnAction()
            )
            expect(endState).toEqual(expectedState)
        })
    })
    describe('column width', () => {
        test('change', () => {
            const initialState = new TableState({ columnStates: columnsTest })
            const expextedState = new TableState({
                columnStates: [
                    columnsTest[0],
                    new ColumnState({ ...columnsTest[1], width: 400 })
                ]
            })
            const endState = tableReducer(
                initialState,
                new SetColumnWidthAction(1, 400)
            )
            expect(endState).toEqual(expextedState)
        })
    })
    describe('column moves', () => {
        test('swap columns forward', () => {
            const initialState = new TableState({
                columnStates: columnsTest,
                columnIndices: new Map([
                    [columnIdTest1, 0],
                    [columnIdTest, 1]
                ])
            })
            const expectedState = new TableState({
                columnStates: [columnsTest[1], columnsTest[0]],
                columnIndices: new Map([
                    [columnIdTest, 0],
                    [columnIdTest1, 1]
                ])
            })
            const endState = tableReducer(
                initialState,
                new ChangeColumnIndexAction(0, 1)
            )
            expect(endState).toEqual(expectedState)
        })
        test('swap columns backward', () => {
            const initialState = new TableState({
                columnStates: columnsTest,
                columnIndices: new Map([
                    [columnIdTest1, 0],
                    [columnIdTest, 1]
                ])
            })
            const expectedState = new TableState({
                columnStates: [columnsTest[1], columnsTest[0]],
                columnIndices: new Map([
                    [columnIdTest, 0],
                    [columnIdTest1, 1]
                ])
            })
            const endState = tableReducer(
                initialState,
                new ChangeColumnIndexAction(1, 0)
            )
            expect(endState).toEqual(expectedState)
        })
        test("can't swap frozen columns forward", () => {
            const initialState = new TableState({
                frozenColumns: 1,
                columnStates: columnsTest,
                columnIndices: new Map([
                    [columnIdTest1, 0],
                    [columnIdTest, 1]
                ])
            })
            const endState = tableReducer(
                initialState,
                new ChangeColumnIndexAction(0, 1)
            )
            expect(endState).toEqual(initialState)
        })
        test("can't swap frozen columns backward", () => {
            const initialState = new TableState({
                frozenColumns: 1,
                columnStates: columnsTest,
                columnIndices: new Map([
                    [columnIdTest1, 0],
                    [columnIdTest, 1]
                ])
            })
            const endState = tableReducer(
                initialState,
                new ChangeColumnIndexAction(1, 0)
            )
            expect(endState).toEqual(initialState)
        })
    })
    describe('submit values', () => {
        const entityTest0 = 'entity0'
        const entityTest1 = 'entity1'
        const entityTest3 = 'entity3'
        const entities = [entityTest0, entityTest1, entityTest3]
        const entityIndices = new Map(entities.map((entity, idx) => [entity, idx]))
        const columnsTestWithData = [
            new ColumnState({
                ...columnsTest[0],
                cellContents: [
                    [{ value: 2, idPersistent: 'id-value-test-5', version: 5 }],
                    [{ value: 4, idPersistent: 'id-value-test-6', version: 6 }],
                    [{ value: 6, idPersistent: 'id-value-test-7', version: 7 }]
                ]
            }),
            new ColumnState({
                ...columnsTest[1],
                cellContents: [
                    [{ value: 3, idPersistent: 'id-value-test-8', version: 8 }],
                    [{ value: 6, idPersistent: 'id-value-test-9', version: 9 }],
                    [{ value: 9, idPersistent: 'id-value-test-10', version: 10 }]
                ]
            })
        ]
        const versionedValueTest = {
            value: 8,
            idPersistent: 'id-value-test-7',
            version: 8
        }
        test('start submit value', () => {
            const initialState = new TableState({
                submitValuesErrorState: new ErrorState('error test')
            })
            const expectedState = new TableState({ isSubmittingValues: true })
            const endState = tableReducer(initialState, new SubmitValuesStartAction())
            expect(endState).toEqual(expectedState)
        })
        test('submit value error', () => {
            const initialState = new TableState({
                isSubmittingValues: true,
                entities: entities,
                entityIndices: entityIndices
            })
            const testError = new ErrorState('error test', undefined, 'id-error-test')
            const expectedState = new TableState({
                submitValuesErrorState: testError,
                entities: entities,
                entityIndices: entityIndices
            })
            const endState = tableReducer(
                initialState,
                new SubmitValuesErrorAction(
                    new ErrorState(
                        testError.msg,
                        testError.retryCallback,
                        'id-error-test'
                    )
                )
            )
            expect(endState).toEqual(expectedState)
        })
        test('change Value', () => {
            const columnIndices = new Map(
                columnsTestWithData.map((columnState, idx) => [
                    columnState.idPersistent,
                    idx
                ])
            )
            const initialState = new TableState({
                entities: entities,
                entityIndices: entityIndices,
                columnStates: columnsTestWithData,
                columnIndices: columnIndices
            })
            const expectedState = new TableState({
                entities: entities,
                entityIndices: entityIndices,
                columnStates: [
                    new ColumnState({
                        ...columnsTest[0],
                        cellContents: [
                            [
                                {
                                    value: 2,
                                    idPersistent: 'id-value-test-5',
                                    version: 5
                                }
                            ],
                            [
                                {
                                    value: 4,
                                    idPersistent: 'id-value-test-6',
                                    version: 6
                                }
                            ],
                            [
                                {
                                    value: 8,
                                    idPersistent: 'id-value-test-7',
                                    version: 8
                                }
                            ]
                        ]
                    }),
                    new ColumnState({
                        ...columnsTest[1],
                        cellContents: [
                            [
                                {
                                    value: 3,
                                    idPersistent: 'id-value-test-8',
                                    version: 8
                                }
                            ],
                            [
                                {
                                    value: 6,
                                    idPersistent: 'id-value-test-9',
                                    version: 9
                                }
                            ],
                            [
                                {
                                    value: 9,
                                    idPersistent: 'id-value-test-10',
                                    version: 10
                                }
                            ]
                        ]
                    })
                ],
                columnIndices: columnIndices
            })
            const endState = tableReducer(
                initialState,
                new SubmitValuesEndAction([
                    [entityTest3, columnIdTest1, versionedValueTest]
                ])
            )
            expect(endState).toEqual(expectedState)
        })
        test('identity for unknown column id', () => {
            const columnIndices = new Map(
                columnsTestWithData.map((columnState, idx) => [
                    columnState.idPersistent,
                    idx
                ])
            )
            const initialState = new TableState({
                entities: entities,
                entityIndices: entityIndices,
                columnStates: columnsTestWithData,
                columnIndices: columnIndices
            })
            const endState = tableReducer(
                initialState,
                new SubmitValuesEndAction([
                    [entityTest3, 'unknown_coloumn_id', versionedValueTest]
                ])
            )
            expect(endState).toBe(initialState)
        })
        test('identity for unknown entity id', () => {
            const columnIndices = new Map(
                columnsTestWithData.map((columnState, idx) => [
                    columnState.idPersistent,
                    idx
                ])
            )
            const initialState = new TableState({
                entities: entities,
                entityIndices: entityIndices,
                columnStates: columnsTestWithData,
                columnIndices: columnIndices
            })
            const endState = tableReducer(
                initialState,
                new SubmitValuesEndAction([
                    ['unknown_entity_id', columnIdTest1, versionedValueTest]
                ])
            )
            expect(endState).toBe(initialState)
        })
        test('empty edits', () => {
            const initialState = new TableState({
                entities: entities,
                entityIndices: entityIndices,
                isSubmittingValues: true
            })
            const expectedState = new TableState({
                entities: entities,
                entityIndices: entityIndices
            })
            const endState = tableReducer(initialState, new SubmitValuesEndAction([]))
            expect(endState).toEqual(expectedState)
        })
        test('batch edits', () => {
            const initialState = new TableState({
                entities: entities,
                entityIndices: entityIndices,
                isSubmittingValues: true
            })
            const expectedState = new TableState({
                entities: entities,
                entityIndices: entityIndices,
                submitValuesErrorState: new ErrorState(
                    'Batch edits not implemented. Values are not changed.',
                    undefined,
                    'id-error-batch'
                )
            })
            const endState = tableReducer(
                initialState,
                new SubmitValuesEndAction([
                    [
                        entityTest0,
                        columnIdTest,
                        { value: 0.2, version: 5, idPersistent: 'id-value-0' }
                    ],
                    [
                        entityTest1,
                        columnIdTest,
                        { value: 3.2, version: 5, idPersistent: 'id-value-1' }
                    ]
                ])
            )
            expect(endState).toEqual(expectedState)
        })
        test('clear error state', () => {
            const initialState = new TableState({
                entities: entities,
                entityIndices: entityIndices,
                submitValuesErrorState: new ErrorState('test error')
            })
            const expectedState = new TableState({
                entities: entities,
                entityIndices: entityIndices
            })
            const endState = tableReducer(
                initialState,
                new SubmitValuesClearErrorAction()
            )
            expect(endState).toEqual(expectedState)
        })
    })
})
