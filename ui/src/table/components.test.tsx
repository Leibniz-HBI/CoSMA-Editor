/**
 * @jest-environment jsdom
 */
jest.mock('@glideapps/glide-data-grid', () => ({
    __esmodule: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    DataEditor: jest.fn().mockImplementation((props: any) => <MockTable />)
}))
import { describe } from '@jest/globals'
import { render, renderHook, screen } from '@testing-library/react'
import { DataTable, mkCell, useCellContentCalback } from './components'
import { TableState, ColumnState } from './state'
import {
    BooleanCell,
    BubbleCell,
    DataEditor,
    GridCellKind,
    TextCell
} from '@glideapps/glide-data-grid'
import { ColumnType } from '../column_menu/state'
import { ColumnAddButton } from '../column_menu/components'

const testColumns = [
    new ColumnState({
        idPersistent: 'test_column_0',
        name: 'test title 0',
        cellContents: {},
        columnType: ColumnType.String
    }),
    new ColumnState({
        idPersistent: 'test_column_1',
        name: 'test title 1',
        cellContents: {},
        columnType: ColumnType.String
    })
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
function MockTable(props: any) {
    return <div className="mock"></div>
}

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
        const cellContent = { values: [true] }
        const columnType = ColumnType.Boolean
        const cell = mkCell(cellContent, columnType) as BooleanCell
        expect(cell.kind).toEqual('boolean' as GridCellKind)
        expect(cell.data).toEqual(true)
        expect(cell.allowOverlay).toBeFalsy()
    })
    test('boolean type undefined', () => {
        const cellContent = {}
        const columnType = ColumnType.Boolean
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

describe('table from state', () => {
    test('should show error', () => {
        const state = new TableState({
            errorMsg: 'test error',
            isLoading: false
        })
        render(<DataTable state={state} />)
        screen.getByText('test error', { exact: false })
    })
    test('should show loading with empty args', () => {
        const state = new TableState({})
        const { container } = render(<DataTable state={state} />)
        const shimmers = container.getElementsByClassName('shimmer')
        expect(shimmers.length).toBe(1)
    })
    test('should show loading with loading set', () => {
        const state = new TableState({ isLoading: true })
        const { container } = render(<DataTable state={state} />)
        const shimmers = container.getElementsByClassName('shimmer')
        expect(shimmers.length).toBe(1)
    })
    test('calls table editor', () => {
        const state = new TableState({
            columnStates: testColumns,
            entities: ['', '', ''],
            isLoading: false
        })
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        const mockCecllContentFn = jest.fn()
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        const mockHeaderMenuFn = jest.fn()
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        const mockColumnAddMenuFn = jest.fn()
        const { container } = render(
            <DataTable
                state={state}
                cellContent={mockCecllContentFn}
                openHeaderMenuCallback={mockHeaderMenuFn}
                showColumnAddMenuCallback={mockColumnAddMenuFn}
            />
        )
        const outer = container.getElementsByClassName('cosmae-table-container-outer')
        expect(outer.length).toBe(1)
        const inner = outer[0].getElementsByClassName('cosmae-table-container-inner')
        expect(inner.length).toBe(1)
        const mock = inner[0].getElementsByClassName('mock')
        expect(mock.length).toBe(1)
        expect(`${(DataEditor as unknown as jest.Mock).mock.calls[0][0]}`).toEqual(
            `${{
                rows: 3,
                width: '100%',
                height: '100%',
                getCellContent: mockCecllContentFn,
                freezeColumns: 1,
                onHeaderMenuClick: mockHeaderMenuFn,
                rightElement: (
                    <ColumnAddButton>
                        <button onClick={mockColumnAddMenuFn}>+</button>
                    </ColumnAddButton>
                ),
                rightElementProps: {
                    fill: false,
                    sticky: true
                },
                columns: [
                    {
                        title: 'test title 0',
                        id: 'test_column_0',
                        width: 200,
                        hasMenu: false
                    },
                    {
                        title: 'test title 1',
                        id: 'test_column_1',
                        width: 200,
                        hasMenu: true
                    }
                ]
            }}`
        )
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
        const { result } = renderHook(() => useCellContentCalback(state))
        const cellContentFunction = result.current
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
    test('bool column', () => {
        const state = new TableState({
            columnStates: [
                new ColumnState({
                    name: 'text column',
                    idPersistent: columnId,
                    columnType: ColumnType.Boolean,
                    isLoading: false,
                    cellContents: {
                        id_entity_test_0: { values: [true] }
                    }
                })
            ],
            columnIndices: columnIndices,
            entities: entityIdList,
            isLoading: false
        })
        const { result } = renderHook(() => useCellContentCalback(state))
        const cellContentFunction = result.current
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
                    columnType: ColumnType.Boolean,
                    isLoading: true
                })
            ],
            columnIndices: columnIndices,
            entities: entityIdList,
            isLoading: false
        })
        const { result } = renderHook(() => useCellContentCalback(state))
        const cellContentFunction = result.current
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
