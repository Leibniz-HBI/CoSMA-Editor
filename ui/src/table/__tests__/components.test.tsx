/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars */
jest.mock('@glideapps/glide-data-grid', () => ({
    __esmodule: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    DataEditor: jest.fn().mockImplementation((props: any) => <MockTable />)
}))
import { describe } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import { DataTable } from '../components'
import { ColumnState } from '../state'
import {
    DataEditor,
    GridCell,
    GridCellKind,
    GridColumn,
    Item
} from '@glideapps/glide-data-grid'
import { ColumnDefinition, ColumnType } from '../../column_menu/state'
import { LocalTableCallbacks, TableDataProps } from '../hooks'
import { ColumnAddButton } from '../../column_menu/components/misc'
import { ErrorState } from '../../util/error/slice'

const testColumns = [
    new ColumnState({
        idPersistent: 'test_column_0',
        name: 'test title 0',
        cellContents: [],
        columnType: ColumnType.String
    }),
    new ColumnState({
        idPersistent: 'test_column_1',
        name: 'test title 1',
        cellContents: [],
        columnType: ColumnType.String
    })
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
function MockTable(props: any) {
    return <div className="mock"></div>
}

describe('table from state', () => {
    const baseTableProps: TableDataProps = {
        entities: [],
        columnStates: [],
        columnIndices: new Map(),
        isLoading: false,
        frozenColumns: 1,
        isShowColumnAddMenu: false,
        loadDataErrorState: undefined,
        selectedColumnHeaderBounds: undefined
    }
    const baseTableCallbacks: LocalTableCallbacks = {
        addColumnCallback: (columnDefinition: ColumnDefinition) => {},
        cellContentCallback: (cell: Item) => {
            return {
                kind: 'text' as GridCellKind,
                allowOverlay: false,
                displayData: '',
                data: ''
            } as GridCell
        },
        showColumnAddMenuCallback: () => {},
        hideColumnAddMenuCallback: () => {},
        showHeaderMenuCallback(columnIdx, bounds) {},
        hideHeaderMenuCallback: () => {},
        columnHeaderBoundsCallback: () => {
            return { left: 0, right: 0, top: 0, bottom: 0, height: 0, width: 0 }
        },
        removeColumnCallback: () => {},
        setColumnWidthCallback: (
            column: GridColumn,
            newSize: number,
            colIndex: number,
            newSizeWithGrow: number
        ) => {},
        switchColumnsCallback: (startIndex, endIndex) => {},
        clearSubmitValueErrorCallback: () => {},
        csvLines: () => []
    }
    test('should show error', () => {
        const tableProps = {
            ...baseTableProps,
            loadDataErrorState: new ErrorState('test error')
        }
        render(
            <DataTable
                tableProps={tableProps}
                tableCallbacks={baseTableCallbacks}
                submitValueCallback={jest.fn()}
            />
        )
        screen.getByText('test error', { exact: false })
    })
    test('should show loading with loading set', () => {
        const tableProps = { ...baseTableProps, isLoading: true }
        const { container } = render(
            <DataTable
                tableProps={tableProps}
                tableCallbacks={baseTableCallbacks}
                submitValueCallback={jest.fn()}
            />
        )
        const shimmers = container.getElementsByClassName('shimmer')
        expect(shimmers.length).toBe(1)
    })
    test('calls table editor', () => {
        const props = {
            ...baseTableProps,
            columnStates: testColumns,
            entities: ['', '', ''],
            isLoading: false
        }
        const { container } = render(
            <DataTable
                tableProps={props}
                tableCallbacks={baseTableCallbacks}
                submitValueCallback={jest.fn()}
            />
        )
        const mock = container.getElementsByClassName('mock')
        expect(mock.length).toBe(1)
        expect(`${(DataEditor as unknown as jest.Mock).mock.calls[0][0]}`).toEqual(
            `${{
                rows: 3,
                width: '100%',
                height: '100%',
                getCellContent: baseTableCallbacks.cellContentCallback,
                freezeColumns: 1,
                onHeaderMenuClick: baseTableCallbacks.showHeaderMenuCallback,
                rightElement: (
                    <ColumnAddButton>
                        <button onClick={baseTableCallbacks.showColumnAddMenuCallback}>
                            +
                        </button>
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
