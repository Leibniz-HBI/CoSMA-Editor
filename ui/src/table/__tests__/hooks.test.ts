/*eslint @typescript-eslint/no-unused-vars: ["error", { "varsIgnorePattern": "^_" }]*/
import {
    BooleanCell,
    BubbleCell,
    GridCellKind,
    NumberCell,
    TextCell
} from '@glideapps/glide-data-grid'
import { mkCell, useCellContentCalback, useRemoteTableData } from '../hooks'
import { CellValue, ColumnState, TableState } from '../state'
import { useThunkReducer } from '../../util/state'
import { ColumnType, newColumnDefinition } from '../../column_menu/state'
import { GetColumnAsyncAction } from '../async_actions'
import {
    ChangeColumnIndexAction,
    HideColumnAddMenuAction,
    HideHeaderMenuAction,
    RemoveSelectedColumnAction,
    SetColumnWidthAction,
    ShowColumnAddMenuAction,
    ShowHeaderMenuAction
} from '../actions'
import { UserInfo, UserPermissionGroup } from '../../user/state'
import { LoadingType } from '../draw'

jest.mock('../../util/state', () => {
    const original = jest.requireActual('../../util/state')
    return {
        ...original,
        useThunkReducer: jest.fn().mockImplementation()
    }
})
describe('create cell', () => {
    const cellTest = { version: 5, idPersistent: 'id-value-persitent-1234' }
    test('text no values', () => {
        const cellContent: CellValue[] = []
        const columnType = ColumnType.String
        const cell = mkCell(columnType, cellContent) as TextCell
        expect(cell.kind).toEqual('text' as GridCellKind)
        expect(cell.data).toEqual('')
        expect(cell.allowOverlay).toBeTruthy()
        expect(cell.displayData).toBe('')
    })
    test('text  undefined value', () => {
        const cellContent = [{ ...cellTest, value: undefined }]
        const columnType = ColumnType.String
        const cell = mkCell(columnType, cellContent) as TextCell
        expect(cell.kind).toEqual('text' as GridCellKind)
        expect(cell.data).toEqual('')
        expect(cell.allowOverlay).toBeTruthy()
        expect(cell.displayData).toBe('')
    })
    test('text type', () => {
        const cellContent = [{ ...cellTest, value: 'value' }]
        const columnType = ColumnType.String
        const cell = mkCell(columnType, cellContent) as TextCell
        expect(cell.kind).toEqual('text' as GridCellKind)
        expect(cell.data).toEqual('value')
        expect(cell.allowOverlay).toBeTruthy()
        expect(cell.displayData).toBe('value')
    })
    test('boolean type true', () => {
        const cellContent = [{ ...cellTest, value: true }]
        const columnType = ColumnType.Inner
        const cell = mkCell(columnType, cellContent) as BooleanCell
        expect(cell.kind).toEqual('boolean' as GridCellKind)
        expect(cell.data).toEqual(true)
        expect(cell.allowOverlay).toBeFalsy()
    })
    test('boolean type undefined', () => {
        const cellContent: CellValue[] = []
        const columnType = ColumnType.Inner
        const cell = mkCell(columnType, cellContent) as BooleanCell
        expect(cell.kind).toEqual('boolean' as GridCellKind)
        expect(cell.data).toEqual(undefined)
        expect(cell.allowOverlay).toBeFalsy()
    })
    test('bubble type', () => {
        const cellContent = [
            { ...cellTest, value: 'value0' },
            { ...cellTest, value: 'value1' }
        ]
        const columnType = ColumnType.String
        const cell = mkCell(columnType, cellContent) as BubbleCell
        expect(cell.kind).toEqual('bubble' as GridCellKind)
        expect(cell.data).toEqual(['value0', 'value1'])
        expect(cell.allowOverlay).toBeTruthy()
    })
    test('number', () => {
        const cellContent = [{ ...cellTest, value: 2.3 }]
        const columnType = ColumnType.Float
        const cell = mkCell(columnType, cellContent) as NumberCell
        expect(cell.kind).toEqual('number' as GridCellKind)
        expect(cell.data).toEqual(2.3)
        expect(cell.allowOverlay).toBeTruthy()
    })
})
describe('column types', () => {
    const entityId0 = 'id_entity_test_0'
    const entityId1 = 'id_entity_test_1'
    const entityIdList = [entityId0, entityId1]
    const entityIndices = new Map(
        entityIdList.map((idEnitity, idx) => [idEnitity, idx])
    )
    const columnId = 'id_column_test'
    const columnIndices = new Map(Object.entries({ id_column_test: 0 }))
    test('text column', () => {
        const state = new TableState({
            columnStates: [
                new ColumnState({
                    name: 'text column',
                    idPersistent: columnId,
                    columnType: ColumnType.String,
                    isLoading: false,
                    cellContents: [
                        [
                            {
                                value: 'value 0',
                                version: 42,
                                idPersistent: 'id-value-test-42'
                            }
                        ],
                        [
                            {
                                value: 'value 1',
                                version: 43,
                                idPersistent: 'id-value-test-43'
                            }
                        ]
                    ]
                })
            ],
            columnIndices: columnIndices,
            entities: entityIdList,
            entityIndices: entityIndices,
            isLoading: false
        })
        const cellContentFunction = useCellContentCalback(state)
        expect(cellContentFunction([0, 0])).toEqual({
            kind: 'text' as GridCellKind,
            allowOverlay: true,
            displayData: 'value 0',
            data: 'value 0'
        })
        expect(cellContentFunction([0, 1])).toEqual({
            kind: 'text' as GridCellKind,
            allowOverlay: true,
            displayData: 'value 1',
            data: 'value 1'
        })
    })
    test('inner column', () => {
        const state = new TableState({
            columnStates: [
                new ColumnState({
                    name: 'text column',
                    idPersistent: columnId,
                    columnType: ColumnType.Inner,
                    isLoading: false,
                    cellContents: [
                        [
                            {
                                value: true,
                                version: 44,
                                idPersistent: 'id-value-test-44'
                            }
                        ],
                        []
                    ]
                })
            ],
            columnIndices: columnIndices,
            entities: entityIdList,
            isLoading: false
        })
        const cellContentFunction = useCellContentCalback(state)
        expect(cellContentFunction([0, 0])).toEqual({
            kind: 'boolean' as GridCellKind,
            allowOverlay: false,
            data: true
        })
        expect(cellContentFunction([0, 1])).toEqual({
            kind: 'boolean' as GridCellKind,
            allowOverlay: false,
            displayData: undefined,
            data: undefined
        })
    })
    test('loading Cell', () => {
        const state = new TableState({
            columnStates: [
                new ColumnState({
                    name: 'text column',
                    idPersistent: columnId,
                    columnType: ColumnType.Inner,
                    isLoading: true
                })
            ],
            columnIndices: columnIndices,
            entities: entityIdList,
            isLoading: false
        })
        const cellContentFunction = useCellContentCalback(state)
        expect(cellContentFunction([0, 0])).toEqual({
            kind: 'custom' as GridCellKind,
            data: new LoadingType(),
            allowOverlay: true,
            style: 'faded'
        })
        expect(cellContentFunction([0, 1])).toEqual({
            kind: 'custom' as GridCellKind,
            data: new LoadingType(),
            allowOverlay: true,
            style: 'faded'
        })
    })
})
const userInfoPromiseWithNoColumns = () =>
    Promise.resolve(
        new UserInfo({
            userName: 'user-name-test',
            idPersistent: 'id-user-test',
            email: 'test@domain.org',
            namesPersonal: 'names personal test',
            columns: [],
            permissionGroup: UserPermissionGroup.APPLICANT
        })
    )
function mkDefaultTagDefinitionCallbacks() {
    return {
        appendToDefaultTagDefinitionsCallback: jest.fn(),
        removeFromDefaultTagDefinitionListCallback: jest.fn(),
        changeDefaultTagDefinitionsCallback: jest.fn()
    }
}
describe('table hooks', () => {
    const columnNameTest = 'column name test'
    const columnIdTest = 'column_id_test'
    const columnNameTest1 = 'column name test 1'
    const columnIdTest1 = 'column_id_test_1'
    test('early exit when already loading column', async () => {
        const columnCallbacks = mkDefaultTagDefinitionCallbacks()
        const dispatch = jest.fn()
        ;(useThunkReducer as jest.Mock).mockReturnValue([
            new TableState({
                columnIndices: new Map(Object.entries({ column_id_test: 1 })),
                columnStates: [
                    new ColumnState({
                        name: columnNameTest1,
                        idPersistent: columnIdTest1,
                        columnType: ColumnType.Inner
                    }),
                    new ColumnState({
                        name: columnNameTest,
                        isLoading: true,
                        idPersistent: columnIdTest,
                        columnType: ColumnType.String
                    })
                ]
            }),
            dispatch
        ])
        const [remoteCallbacks] = useRemoteTableData(
            userInfoPromiseWithNoColumns,
            columnCallbacks
        )
        remoteCallbacks.loadTableDataCallback()
        expect(dispatch.mock.calls.length).toBe(0)
    })
    test('early exit when state is loading', async () => {
        const dispatch = jest.fn()
        ;(useThunkReducer as jest.Mock).mockReturnValue([
            new TableState({
                isLoading: true
            }),
            dispatch
        ])
        const [remoteCallbacks] = useRemoteTableData(
            userInfoPromiseWithNoColumns,
            mkDefaultTagDefinitionCallbacks()
        )
        remoteCallbacks.loadTableDataCallback()
        expect(dispatch.mock.calls.length).toBe(0)
    })
    test('column callback dispatches correct action', async () => {
        const dispatch = jest.fn()
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        dispatch.mockImplementation((_a) => Promise.resolve(() => undefined))
        ;(useThunkReducer as jest.Mock).mockReturnValue([
            new TableState({
                isLoading: true
            }),
            dispatch
        ])
        const columnDefinitionTest = newColumnDefinition({
            namePath: ['column_test'],
            idPersistent: 'id_column_test',
            idParentPersistent: undefined,
            columnType: ColumnType.String,
            curated: false,
            version: 0
        })
        const profileCallbacks = mkDefaultTagDefinitionCallbacks()
        const [_a, localCallbacks] = useRemoteTableData(
            userInfoPromiseWithNoColumns,
            profileCallbacks
        )
        localCallbacks.addColumnCallback(columnDefinitionTest)
        await new Promise((resolve) => setTimeout(resolve, 2000))
        expect(dispatch.mock.calls).toEqual([
            [new GetColumnAsyncAction(columnDefinitionTest)]
        ])
        expect(
            profileCallbacks.appendToDefaultTagDefinitionsCallback.mock.calls
        ).toEqual([[columnDefinitionTest.idPersistent]])
    })
    test('showColumnAddMenuCallback dispatches correct action', () => {
        const dispatch = jest.fn()
        ;(useThunkReducer as jest.Mock).mockReturnValue([
            new TableState({
                isLoading: true
            }),
            dispatch
        ])
        const [_a, localCallbacks] = useRemoteTableData(
            userInfoPromiseWithNoColumns,
            mkDefaultTagDefinitionCallbacks()
        )
        localCallbacks.showColumnAddMenuCallback()
        expect(dispatch.mock.calls).toEqual([[new ShowColumnAddMenuAction()]])
    })
    test('hideColumnAddMenuCallback dispatches correct action', () => {
        const dispatch = jest.fn()
        ;(useThunkReducer as jest.Mock).mockReturnValue([
            new TableState({
                isLoading: true
            }),
            dispatch
        ])
        const [_a, localCallbacks] = useRemoteTableData(
            userInfoPromiseWithNoColumns,
            mkDefaultTagDefinitionCallbacks()
        )
        localCallbacks.hideColumnAddMenuCallback()
        expect(dispatch.mock.calls).toEqual([[new HideColumnAddMenuAction()]])
    })
    test('showHeaderMenuCallback dispatches correct action', () => {
        const dispatch = jest.fn()
        ;(useThunkReducer as jest.Mock).mockReturnValue([
            new TableState({
                isLoading: true
            }),
            dispatch
        ])
        const [_a, localCallbacks] = useRemoteTableData(
            userInfoPromiseWithNoColumns,
            mkDefaultTagDefinitionCallbacks()
        )
        const rectangleTest = { x: 2, y: 5, width: 10, height: 20 }
        localCallbacks.showHeaderMenuCallback(0, rectangleTest)
        expect(dispatch.mock.calls).toEqual([
            [new ShowHeaderMenuAction(0, rectangleTest)]
        ])
    })
    test('hideHeaderMenuCallback dispatches correct action', () => {
        const dispatch = jest.fn()
        ;(useThunkReducer as jest.Mock).mockReturnValue([
            new TableState({
                isLoading: true
            }),
            dispatch
        ])
        const [_a, localCallbacks] = useRemoteTableData(
            userInfoPromiseWithNoColumns,
            mkDefaultTagDefinitionCallbacks()
        )
        localCallbacks.hideHeaderMenuCallback()
        expect(dispatch.mock.calls).toEqual([[new HideHeaderMenuAction()]])
    })
    test('removeColumn callback dispatches correct actions when colum header selected.', () => {
        const dispatch = jest.fn()
        ;(useThunkReducer as jest.Mock).mockReturnValue([
            new TableState({
                isLoading: true,
                selectedColumnHeaderByIdPersistent: 'id-column-test'
            }),
            dispatch
        ])
        const profileCallbacks = mkDefaultTagDefinitionCallbacks()
        const [_a, localCallbacks] = useRemoteTableData(
            userInfoPromiseWithNoColumns,
            profileCallbacks
        )
        localCallbacks.removeColumnCallback()
        expect(dispatch.mock.calls).toEqual([[new RemoveSelectedColumnAction()]])
        expect(
            profileCallbacks.removeFromDefaultTagDefinitionListCallback.mock.calls
        ).toEqual([['id-column-test']])
    })
    test('setColumnWidthCallback dispatches correct action', () => {
        const dispatch = jest.fn()
        ;(useThunkReducer as jest.Mock).mockReturnValue([
            new TableState({
                isLoading: true
            }),
            dispatch
        ])
        const [_a, localCallbacks] = useRemoteTableData(
            userInfoPromiseWithNoColumns,
            mkDefaultTagDefinitionCallbacks()
        )
        const newSizeTest = 500
        const colIndexTest = 15
        localCallbacks.setColumnWidthCallback(
            { width: 5, title: 'Column Test' },
            newSizeTest,
            colIndexTest,
            800
        )
        expect(dispatch.mock.calls).toEqual([
            [new SetColumnWidthAction(colIndexTest, newSizeTest)]
        ])
    })
    test('switchCallback dispatches correct action', () => {
        const dispatch = jest.fn()
        ;(useThunkReducer as jest.Mock).mockReturnValue([
            new TableState({
                isLoading: true
            }),
            dispatch
        ])
        const profileCallbacks = mkDefaultTagDefinitionCallbacks()
        const [_a, localCallbacks] = useRemoteTableData(
            userInfoPromiseWithNoColumns,
            profileCallbacks
        )
        localCallbacks.switchColumnsCallback(5, 7)
        expect(dispatch.mock.calls).toEqual([[new ChangeColumnIndexAction(5, 7)]])
        expect(profileCallbacks.changeDefaultTagDefinitionsCallback.mock.calls).toEqual(
            [[5, 7]]
        )
    })
    test('returns correct columnHeaderBoundsCallback', () => {
        const dispatch = jest.fn()
        const xTest = 3
        const yTest = 12
        const widthTest = 24
        const heightTest = 312
        const boundsTest = { x: xTest, y: yTest, width: widthTest, height: heightTest }
        ;(useThunkReducer as jest.Mock).mockReturnValue([
            new TableState({
                isLoading: true,
                selectedColumnHeaderBounds: boundsTest
            }),
            dispatch
        ])
        const [_a, localCallbacks] = useRemoteTableData(
            userInfoPromiseWithNoColumns,
            mkDefaultTagDefinitionCallbacks()
        )
        expect(localCallbacks.columnHeaderBoundsCallback()).toEqual({
            left: xTest,
            top: yTest,
            width: widthTest,
            height: heightTest,
            right: xTest + widthTest,
            bottom: yTest + heightTest
        })
    })
})
