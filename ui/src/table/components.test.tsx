/**
 * @jest-environment jsdom
 */
jest.mock('@glideapps/glide-data-grid', () => ({
    __esmodule: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    DataEditor: jest.fn().mockImplementation((props: any) => <MockTable />)
}))
import { describe } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import { DataTable } from './components'
import { TableState } from './state'
import { DataEditor } from '@glideapps/glide-data-grid'

const testColumns = [
    {
        id: 'test_column_0',
        title: 'test title 0'
    },
    {
        id: 'test_column_1',
        title: 'test title 1'
    }
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
function MockTable(props: any) {
    return <div className="mock"></div>
}

describe('table from state', () => {
    test('should show error', () => {
        const state = new TableState({
            columns: [],
            errorMsg: 'test error',
            isLoading: false
        })
        render(<DataTable state={state} />)
        screen.getByText('test error', { exact: false })
    })
    test('should show loading with empty args', () => {
        const state = new TableState({ columns: [] })
        const { container } = render(<DataTable state={state} />)
        const shimmers = container.getElementsByClassName('shimmer')
        expect(shimmers.length).toBe(1)
    })
    test('should show loading with loading set', () => {
        const state = new TableState({ columns: [], isLoading: true })
        const { container } = render(<DataTable state={state} />)
        const shimmers = container.getElementsByClassName('shimmer')
        expect(shimmers.length).toBe(1)
    })
    test('renders table', () => {
        const state = new TableState({
            columns: testColumns,
            row_objects: [{}, {}, {}],
            isLoading: false
        })
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        const mock_fn = () => {}
        const { container } = render(<DataTable state={state} cellContent={mock_fn} />)
        const outer = container.getElementsByClassName('cosmae-table-container-outer')
        expect(outer.length).toBe(1)
        const inner = outer[0].getElementsByClassName('cosmae-table-container-inner')
        expect(inner.length).toBe(1)
        const mock = inner[0].getElementsByClassName('mock')
        expect(mock.length).toBe(1)
        expect((DataEditor as unknown as jest.Mock).mock.calls).toEqual([
            [
                {
                    rows: 3,
                    width: '100%',
                    height: '100%',
                    getCellContent: mock_fn,
                    columns: testColumns
                },
                {}
            ]
        ])
    })
})
