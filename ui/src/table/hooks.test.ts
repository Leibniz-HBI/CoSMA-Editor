/*eslint @typescript-eslint/no-unused-vars: ["error", { "varsIgnorePattern": "^_" }]*/
import {
    BooleanCell,
    BubbleCell,
    GridCellKind,
    TextCell
} from '@glideapps/glide-data-grid'
import { mkCell, useCellContentCalback, useRemoteTableData } from './hooks'
import { ColumnState, TableState } from './state'
import { useThunkReducer } from '../util/state'
import { ColumnDefinition, ColumnType } from '../column_menu/state'
import { GetColumnAsyncAction } from './async_actions'
import {
    ChangeColumnIndexAction,
    HideColumnAddMenuAction,
    HideHeaderMenuAction,
    RemoveSelectedColumnAction,
    SetColumnWidthAction,
    ShowColumnAddMenuAction,
    ShowHeaderMenuAction
} from './actions'

jest.mock('../util/state', () => {
    const original = jest.requireActual('../util/state')
    return {
        ...original,
        useThunkReducer: jest.fn().mockImplementation()
    }
})
describe('create cell', () => {
    test('text no values', () => {
        const cellContent = {}
        const columnType = ColumnType.String
        const cell = mkCell(cellContent, columnType) as TextCell
        expect(cell.kind).toEqual('text' as GridCellKind)
        expect(cell.data).toEqual('')
        expect(cell.allowOverlay).toBeFalsy()
        expect(cell.displayData).toBe('')
    })
    test('text  undefined value', () => {
        const cellContent = { values: [undefined] }
        const columnType = ColumnType.String
        const cell = mkCell(cellContent, columnType) as TextCell
        expect(cell.kind).toEqual('text' as GridCellKind)
        expect(cell.data).toEqual('')
        expect(cell.allowOverlay).toBeFalsy()
        expect(cell.displayData).toBe('')
    })
    test('text type', () => {
        const cellContent = { values: ['value'] }
        const columnType = ColumnType.String
        const cell = mkCell(cellContent, columnType) as TextCell
        expect(cell.kind).toEqual('text' as GridCellKind)
        expect(cell.data).toEqual(cellContent.values[0])
        expect(cell.allowOverlay).toBeFalsy()
        expect(cell.displayData).toBe(cellContent.values[0])
    })
    test('boolean type true', () => {
        const cellContent = { values: ['true'] }
        const columnType = ColumnType.Inner
        const cell = mkCell(cellContent, columnType) as BooleanCell
        expect(cell.kind).toEqual('boolean' as GridCellKind)
        expect(cell.data).toEqual(true)
        expect(cell.allowOverlay).toBeFalsy()
    })
    test('boolean type undefined', () => {
        const cellContent = {}
        const columnType = ColumnType.Inner
        const cell = mkCell(cellContent, columnType) as BooleanCell
        expect(cell.kind).toEqual('boolean' as GridCellKind)
        expect(cell.data).toEqual(false)
        expect(cell.allowOverlay).toBeFalsy()
    })
    test('bubble type', () => {
        const cellContent = { values: ['value0', 'value1'] }
        const columnType = ColumnType.String
        const cell = mkCell(cellContent, columnType) as BubbleCell
        expect(cell.kind).toEqual('bubble' as GridCellKind)
        expect(cell.data).toEqual(cellContent.values)
        expect(cell.allowOverlay).toBeFalsy()
    })
})
describe('column types', () => {
    const entityId0 = 'id_entity_test_0'
    const entityId1 = 'id_entity_test_1'
    const entityIdList = [entityId0, entityId1]
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
                    cellContents: {
                        id_entity_test_0: { values: ['value 0'] },
                        id_entity_test_1: { values: ['value 1'] }
                    }
                })
            ],
            columnIndices: columnIndices,
            entities: entityIdList,
            isLoading: false
        })
        const cellContentFunction = useCellContentCalback(state)
        expect(cellContentFunction([0, 0])).toEqual({
            kind: 'text' as GridCellKind,
            allowOverlay: false,
            displayData: 'value 0',
            data: 'value 0'
        })
        expect(cellContentFunction([0, 1])).toEqual({
            kind: 'text' as GridCellKind,
            allowOverlay: false,
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
                    cellContents: {
                        id_entity_test_0: { values: ['true'] }
                    }
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
            displayData: true,
            data: true
        })
        expect(cellContentFunction([0, 1])).toEqual({
            kind: 'boolean' as GridCellKind,
            allowOverlay: false,
            displayData: false,
            data: false
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
            kind: 'loading' as GridCellKind,
            allowOverlay: true,
            style: 'faded'
        })
        expect(cellContentFunction([0, 1])).toEqual({
            kind: 'loading' as GridCellKind,
            allowOverlay: true,
            style: 'faded'
        })
    })
})
describe('table hooks', () => {
    const columnNameTest = 'column name test'
    const columnIdTest = 'column_id_test'
    const columnNameTest1 = 'column name test 1'
    const columnIdTest1 = 'column_id_test_1'
    const urlTest = 'http://test.url'
    test('early exit when already loading column', async () => {
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
        const [remoteCallbacks] = useRemoteTableData(urlTest, [])
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
        const [remoteCallbacks] = useRemoteTableData(urlTest, [])
        remoteCallbacks.loadTableDataCallback()
        expect(dispatch.mock.calls.length).toBe(0)
    })
    test('column callback dispatches correct action', () => {
        const dispatch = jest.fn()
        ;(useThunkReducer as jest.Mock).mockReturnValue([
            new TableState({
                isLoading: true
            }),
            dispatch
        ])
        const columnDefinitionTest = new ColumnDefinition({
            namePath: ['column_test'],
            idPersistent: 'id_column_test',
            idParentPersistent: undefined,
            columnType: ColumnType.String,
            version: 0
        })
        const [_a, localCallbacks] = useRemoteTableData(urlTest, [])
        localCallbacks.addColumnCallback(columnDefinitionTest)
        expect(dispatch.mock.calls[0][0]).toEqual(
            new GetColumnAsyncAction(urlTest, columnDefinitionTest)
        )
    })
    test('showColumnAddMenuCallback dispatches correct action', () => {
        const dispatch = jest.fn()
        ;(useThunkReducer as jest.Mock).mockReturnValue([
            new TableState({
                isLoading: true
            }),
            dispatch
        ])
        const [_a, localCallbacks] = useRemoteTableData(urlTest, [])
        localCallbacks.showColumnAddMenuCallback()
        expect(dispatch.mock.calls[0][0]).toEqual(new ShowColumnAddMenuAction())
    })
    test('hideColumnAddMenuCallback dispatches correct action', () => {
        const dispatch = jest.fn()
        ;(useThunkReducer as jest.Mock).mockReturnValue([
            new TableState({
                isLoading: true
            }),
            dispatch
        ])
        const [_a, localCallbacks] = useRemoteTableData(urlTest, [])
        localCallbacks.hideColumnAddMenuCallback()
        expect(dispatch.mock.calls[0][0]).toEqual(new HideColumnAddMenuAction())
    })
    test('showHeaderMenuCallback dispatches correct action', () => {
        const dispatch = jest.fn()
        ;(useThunkReducer as jest.Mock).mockReturnValue([
            new TableState({
                isLoading: true
            }),
            dispatch
        ])
        const [_a, localCallbacks] = useRemoteTableData(urlTest, [])
        const rectangleTest = { x: 2, y: 5, width: 10, height: 20 }
        localCallbacks.showHeaderMenuCallback(0, rectangleTest)
        expect(dispatch.mock.calls[0][0]).toEqual(
            new ShowHeaderMenuAction(0, rectangleTest)
        )
    })
    test('hideHeaderMenuCallback dispatches correct action', () => {
        const dispatch = jest.fn()
        ;(useThunkReducer as jest.Mock).mockReturnValue([
            new TableState({
                isLoading: true
            }),
            dispatch
        ])
        const [_a, localCallbacks] = useRemoteTableData(urlTest, [])
        localCallbacks.hideHeaderMenuCallback()
        expect(dispatch.mock.calls[0][0]).toEqual(new HideHeaderMenuAction())
    })
    test('removeColumallback dispatches correct action', () => {
        const dispatch = jest.fn()
        ;(useThunkReducer as jest.Mock).mockReturnValue([
            new TableState({
                isLoading: true
            }),
            dispatch
        ])
        const [_a, localCallbacks] = useRemoteTableData(urlTest, [])
        localCallbacks.removeColumnCallback()
        expect(dispatch.mock.calls[0][0]).toEqual(new RemoveSelectedColumnAction())
    })
    test('setColumnWidthCallback dispatches correct action', () => {
        const dispatch = jest.fn()
        ;(useThunkReducer as jest.Mock).mockReturnValue([
            new TableState({
                isLoading: true
            }),
            dispatch
        ])
        const [_a, localCallbacks] = useRemoteTableData(urlTest, [])
        const newSizeTest = 500
        const colIndexTest = 15
        localCallbacks.setColumnWidthCallback(
            { width: 5, title: 'Column Test' },
            newSizeTest,
            colIndexTest,
            800
        )
        expect(dispatch.mock.calls[0][0]).toEqual(
            new SetColumnWidthAction(colIndexTest, newSizeTest)
        )
    })
    test('switchCallback dispatches correct action', () => {
        const dispatch = jest.fn()
        ;(useThunkReducer as jest.Mock).mockReturnValue([
            new TableState({
                isLoading: true
            }),
            dispatch
        ])
        const [_a, localCallbacks] = useRemoteTableData(urlTest, [])
        localCallbacks.switchColumnsCallback(5, 7)
        expect(dispatch.mock.calls[0][0]).toEqual(new ChangeColumnIndexAction(5, 7))
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
        const [_a, localCallbacks] = useRemoteTableData(urlTest, [])
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
