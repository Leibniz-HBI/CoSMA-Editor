import { describe, expect, test } from '@jest/globals'
import { TagType } from '../../column_menu/state'
import { newNotification } from '../../util/notification/slice'
import {
    SetEntityLoadingAction,
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
    EntityChangeOrCreateSuccessAction,
    EntityChangeOrCreateErrorAction,
    ShowEntityAddDialogAction
} from '../actions'
import { tableReducer } from '../reducer'
import { ColumnState, TableState, newEntity } from '../state'
import { Remote } from '../../util/state'
describe('reducer tests', () => {
    const columnNameTest = 'column test name'
    const columnIdTest = 'column_id_test'
    const columnNameTest1 = 'test column 1'
    const columnIdTest1 = 'column_id_test_1'
    const tagDefTest = {
        namePath: [columnNameTest],
        idPersistent: columnIdTest,
        columnType: TagType.String,
        curated: true,
        hidden: false,
        version: 0
    }
    const tagDefTest1 = {
        namePath: [columnNameTest1],
        idPersistent: columnIdTest1,
        columnType: TagType.Inner,
        curated: false,
        hidden: false,
        version: 0
    }
    const columnsTest = [
        new ColumnState({
            tagDefinition: tagDefTest1
        }),
        new ColumnState({ tagDefinition: tagDefTest })
    ]
    const cellContentsTest = [
        [{ value: '0 0', idPersistent: 'id-data-0-0', version: 6000 }],
        [{ value: '1 0', idPersistent: 'id-data-1-0', version: 6010 }],
        [{ value: '3 0', idPersistent: 'id-data-3-0', version: 6030 }]
    ]
    const cellContentsTest1 = [
        [{ value: '0 1', idPersistent: 'id-data-0-1', version: 6001 }],
        [{ value: '1 1', idPersistent: 'id-data-1-1', version: 6011 }],
        [{ value: '3 1', idPersistent: 'id-data-3-1', version: 6031 }]
    ]
    const columnsWithDataTest = [
        new ColumnState({
            tagDefinition: tagDefTest,
            cellContents: new Remote(cellContentsTest)
        }),
        new ColumnState({
            tagDefinition: tagDefTest1,
            cellContents: new Remote(cellContentsTest1)
        })
    ]
    test('init to loading', () => {
        const state = new TableState({})
        const end_state = tableReducer(state, new SetEntityLoadingAction())
        const expected_state = new TableState({ isLoading: true })
        expect(end_state).toEqual(expected_state)
    })
    test('loading to success', () => {
        const state = new TableState({ isLoading: true })
        const entities = [
            newEntity({
                idPersistent: 'entity0',
                displayTxt: 'entity test 0',
                version: 100,
                disabled: false
            }),
            newEntity({
                idPersistent: 'entity1',
                displayTxt: 'entity test 1',
                version: 101,
                disabled: false
            }),
            newEntity({
                idPersistent: 'entity3',
                displayTxt: 'entity test 3',
                version: 103,
                disabled: false
            })
        ]
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
            const action = new SetColumnLoadingAction(tagDefTest)
            const state = new TableState({})
            const expectedState = new TableState({
                columnIndices: new Map(Object.entries({ column_id_test: 0 })),
                columnStates: [
                    new ColumnState({
                        tagDefinition: tagDefTest,
                        cellContents: new Remote([], true)
                    })
                ]
            })
            const endState = tableReducer(state, action)
            expect(endState).toEqual(expectedState)
        })
        test('when already present', () => {
            const action = new SetColumnLoadingAction(tagDefTest1)
            const state = new TableState({
                columnIndices: new Map(Object.entries({ column_id_test_1: 0 })),
                columnStates: [
                    new ColumnState({
                        tagDefinition: tagDefTest1
                    })
                ]
            })
            const expectedState = new TableState({
                columnIndices: new Map(Object.entries({ column_id_test_1: 0 })),
                columnStates: [
                    new ColumnState({
                        tagDefinition: tagDefTest1,
                        cellContents: new Remote([], true)
                    })
                ]
            })
            const endState = tableReducer(state, action)
            expect(endState).toEqual(expectedState)
        })
        test('when other column is present', () => {
            const action = new SetColumnLoadingAction(tagDefTest)
            const state = new TableState({
                columnIndices: new Map(Object.entries({ column_id_test_1: 0 })),
                columnStates: [
                    new ColumnState({
                        tagDefinition: tagDefTest1,
                        cellContents: new Remote([], true)
                    })
                ]
            })
            const expectedState = new TableState({
                columnIndices: new Map(
                    Object.entries({ column_id_test_1: 0, column_id_test: 1 })
                ),
                columnStates: [
                    new ColumnState({
                        tagDefinition: tagDefTest1,
                        cellContents: new Remote([], true)
                    }),
                    new ColumnState({
                        tagDefinition: tagDefTest,
                        cellContents: new Remote([], true)
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
        const entityTest = newEntity({
            idPersistent: 'id_entity_test',
            displayTxt: 'display text entity test',
            version: 300,
            disabled: false
        })
        test('when loading', () => {
            const state = new TableState({
                columnIndices: new Map(Object.entries({ column_id_test: 0 })),
                entities: [entityTest],
                entityIndices: new Map([['id_entity_test', 0]]),
                columnStates: [
                    new ColumnState({
                        tagDefinition: tagDefTest,
                        cellContents: new Remote([], true)
                    })
                ]
            })
            const action = new AppendColumnAction(columnIdTest, columnDataTest)
            const expectedState = new TableState({
                columnIndices: new Map(Object.entries({ column_id_test: 0 })),
                entities: [entityTest],
                entityIndices: new Map([['id_entity_test', 0]]),
                columnStates: [
                    new ColumnState({
                        cellContents: new Remote([
                            [
                                {
                                    value: 'foo',
                                    idPersistent: 'id-value-test-2',
                                    version: 23
                                }
                            ]
                        ]),
                        tagDefinition: tagDefTest
                    })
                ]
            })
            const endState = tableReducer(state, action)
            expect(endState).toEqual(expectedState)
        })
        test('when other column is present', () => {
            const otherColumn = new ColumnState({
                tagDefinition: tagDefTest1
            })
            const state = new TableState({
                entities: [entityTest],
                entityIndices: new Map([['id_entity_test', 0]]),
                columnIndices: new Map(
                    Object.entries({ column_id_test: 0, column_id_test_1: 1 })
                ),
                columnStates: [
                    new ColumnState({
                        tagDefinition: tagDefTest
                    }),
                    otherColumn
                ]
            })
            const action = new AppendColumnAction(columnIdTest, columnDataTest)
            const expectedState = new TableState({
                entities: [entityTest],
                entityIndices: new Map([['id_entity_test', 0]]),
                columnIndices: new Map(
                    Object.entries({ column_id_test: 0, column_id_test_1: 1 })
                ),
                columnStates: [
                    new ColumnState({
                        tagDefinition: tagDefTest,
                        cellContents: new Remote([
                            [
                                {
                                    value: 'foo',
                                    idPersistent: 'id-value-test-2',
                                    version: 23
                                }
                            ]
                        ])
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
                selectedTagDefinition: tagDefTest,
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
                selectedTagDefinition: tagDefTest,
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
                selectedTagDefinition: columnsTest[0].tagDefinition,
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
                selectedTagDefinition: tagDefTest1,
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
            const expectedState = new TableState({
                columnStates: [
                    columnsTest[0],
                    new ColumnState({ ...columnsTest[1], width: 400 })
                ]
            })
            const endState = tableReducer(
                initialState,
                new SetColumnWidthAction(1, 400)
            )
            expect(endState).toEqual(expectedState)
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
        const entityIdTest0 = 'entity0'
        const entityIdTest1 = 'entity1'
        const entityIdTest3 = 'entity3'
        const entityTest0 = newEntity({
            idPersistent: entityIdTest0,
            displayTxt: 'display text test 0',
            version: 300,
            disabled: false
        })
        const entityTest1 = newEntity({
            idPersistent: entityIdTest1,
            displayTxt: 'display text test 1',
            version: 301,
            disabled: false
        })
        const entityTest3 = newEntity({
            idPersistent: entityIdTest3,
            displayTxt: 'display text test 3',
            version: 303,
            disabled: false
        })
        const entities = [entityTest0, entityTest1, entityTest3]
        const entityIndices = new Map(
            entities.map((entity, idx) => [entity.idPersistent, idx])
        )
        const columnsTestWithData = [
            new ColumnState({
                ...columnsTest[0],
                cellContents: new Remote([
                    [{ value: 2, idPersistent: 'id-value-test-5', version: 5 }],
                    [{ value: 4, idPersistent: 'id-value-test-6', version: 6 }],
                    [{ value: 6, idPersistent: 'id-value-test-7', version: 7 }]
                ])
            }),
            new ColumnState({
                ...columnsTest[1],
                cellContents: new Remote([
                    [{ value: 3, idPersistent: 'id-value-test-8', version: 8 }],
                    [{ value: 6, idPersistent: 'id-value-test-9', version: 9 }],
                    [{ value: 9, idPersistent: 'id-value-test-10', version: 10 }]
                ])
            })
        ]
        const versionedValueTest = {
            value: 8,
            idPersistent: 'id-value-test-7',
            version: 8
        }
        test('start submit value', () => {
            const initialState = new TableState({})
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
            const expectedState = new TableState({
                entities: entities,
                entityIndices: entityIndices
            })
            const endState = tableReducer(initialState, new SubmitValuesErrorAction())
            expect(endState).toEqual(expectedState)
        })
        test('change Value', () => {
            const columnIndices = new Map(
                columnsTestWithData.map((columnState, idx) => [
                    columnState.tagDefinition.idPersistent,
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
                        cellContents: new Remote([
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
                        ])
                    }),
                    new ColumnState({
                        ...columnsTest[1],
                        cellContents: new Remote([
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
                        ])
                    })
                ],
                columnIndices: columnIndices
            })
            const endState = tableReducer(
                initialState,
                new SubmitValuesEndAction([
                    [entityIdTest3, columnIdTest1, versionedValueTest]
                ])
            )
            expect(endState).toEqual(expectedState)
        })
        test('identity for unknown column id', () => {
            const columnIndices = new Map(
                columnsTestWithData.map((columnState, idx) => [
                    columnState.tagDefinition.idPersistent,
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
                    [entityIdTest3, 'unknown_column_id', versionedValueTest]
                ])
            )
            expect(endState).toBe(initialState)
        })
        test('identity for unknown entity id', () => {
            const columnIndices = new Map(
                columnsTestWithData.map((columnState, idx) => [
                    columnState.tagDefinition.idPersistent,
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
                entityIndices: entityIndices
            })
            const endState = tableReducer(
                initialState,
                new SubmitValuesEndAction([
                    [
                        entityIdTest0,
                        columnIdTest,
                        { value: 0.2, version: 5, idPersistent: 'id-value-0' }
                    ],
                    [
                        entityIdTest1,
                        columnIdTest,
                        { value: 3.2, version: 5, idPersistent: 'id-value-1' }
                    ]
                ])
            )
            expect(endState).toEqual(expectedState)
        })
        test('add entity success', () => {
            const initialState = new TableState({
                entities: entities,
                entityIndices: entityIndices,
                entityAddState: new Remote(false, true),
                columnStates: columnsWithDataTest
            })
            const newEntityId = 'id-new-entity-test'
            const newEntityDisplayTxt = 'Another Entity Test'
            const newEntityVersion = 2003
            const newEntityObject = newEntity({
                idPersistent: newEntityId,
                displayTxt: newEntityDisplayTxt,
                version: newEntityVersion,
                disabled: false
            })
            const expectedState = new TableState({
                entities: [entityTest0, entityTest1, entityTest3, newEntityObject],
                entityAddState: new Remote(true, false),
                columnStates: [
                    new ColumnState({
                        tagDefinition: tagDefTest,
                        cellContents: new Remote([
                            ...cellContentsTest,
                            [
                                {
                                    value: newEntityDisplayTxt,
                                    idPersistent: newEntityId,
                                    version: newEntityVersion
                                }
                            ]
                        ])
                    }),
                    new ColumnState({
                        tagDefinition: tagDefTest1,
                        cellContents: new Remote([...cellContentsTest1, []])
                    })
                ]
            })
            const endState = tableReducer(
                initialState,
                new EntityChangeOrCreateSuccessAction(newEntityObject)
            )
            expect(endState).toEqual(expectedState)
        })
        test('change entity success', () => {
            const initialState = new TableState({
                entities: entities,
                entityIndices: entityIndices,
                entityAddState: new Remote(false, true),
                columnStates: columnsWithDataTest
            })
            const newEntityDisplayTxt = 'Another Entity Test'
            const newEntityVersion = 2003
            const newEntityObject = newEntity({
                idPersistent: entityIdTest1,
                displayTxt: newEntityDisplayTxt,
                version: newEntityVersion,
                disabled: false
            })
            const expectedState = new TableState({
                entities: [entityTest0, newEntityObject, entityTest3],
                entityAddState: new Remote(true, false),
                columnStates: [
                    new ColumnState({
                        tagDefinition: tagDefTest,
                        cellContents: new Remote([
                            cellContentsTest[0],
                            [
                                {
                                    value: newEntityDisplayTxt,
                                    idPersistent: entityIdTest1,
                                    version: newEntityVersion
                                }
                            ],
                            cellContentsTest[2]
                        ])
                    }),
                    new ColumnState({
                        tagDefinition: tagDefTest1,
                        cellContents: new Remote(cellContentsTest1)
                    })
                ]
            })
            const endState = tableReducer(
                initialState,
                new EntityChangeOrCreateSuccessAction(newEntityObject)
            )
            expect(endState).toEqual(expectedState)
        })
    })
    test('entity change error', () => {
        const initialState = new TableState({ entityAddState: new Remote(false, true) })
        const expectedState = new TableState({
            entityAddState: new Remote(false, false, undefined)
        })
        const endState = tableReducer(
            initialState,
            new EntityChangeOrCreateErrorAction()
        )
        expect(endState).toEqual(expectedState)
    })
    test('show entity add menu', () => {
        const initialState = new TableState({ showEntityAddDialog: false })
        const expectedState = new TableState({ showEntityAddDialog: true })
        const endState = tableReducer(initialState, new ShowEntityAddDialogAction(true))
        expect(endState).toEqual(expectedState)
    })
    test('hide entity add menu', () => {
        const initialState = new TableState({ showEntityAddDialog: true })
        const expectedState = new TableState({ showEntityAddDialog: false })
        const endState = tableReducer(
            initialState,
            new ShowEntityAddDialogAction(false)
        )
        expect(endState).toEqual(expectedState)
    })
})
