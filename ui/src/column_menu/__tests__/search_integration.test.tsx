/**
 * @vitest-environment jsdom
 */
import { screen, waitFor } from '@testing-library/react'
import { userEvent, UserEvent } from '@testing-library/user-event'
import { emptyState, renderWithProviders } from '../../util/tests/provider'
import { ColumnMenu } from '../components/menu'
import { vi } from 'vitest'
import { addResponseSequence, expectFetchCallList } from '../../util/tests/response'
import { newRemote } from '../../util/state'
import { ColumnType, newColumn } from '../state'
import { act } from 'react'

test('search success and clear', async () => {
    const fetchMock = vi.fn()
    addResponseSequence(fetchMock, [
        [200, { column_list: [] }],
        [200, { id_persistent_list: [idColumn, idColumn1] }],
        [200, { column_list: [] }]
    ])
    const { store } = renderWithProviders(
        <ColumnMenu
            columnIndices={{}}
            loadColumnDataCallback={vi.fn()}
            hideColumnDataCallback={vi.fn()}
        />,
        fetchMock,
        initialState
    )
    const user = userEvent.setup()
    await performSearch(user, 'test')
    await waitFor(() => {
        screen.getByText(nameColumn)
        screen.getByText(nameColumn1)
    })
    await performSearch(user, '')
    await waitFor(async () => {
        await expectFetchCallList(fetchMock.mock.calls, [
            ['http://127.0.0.1:8000/cosmae/api/columns/children', {}],
            ['http://127.0.0.1:8000/cosmae/api/columns/search?term=test', {}]
        ])
    })
    await waitFor(
        async () => {
            expect(screen.queryByText(nameColumn)).toBeNull()
            expect(screen.queryByText(nameColumn1)).toBeNull()
        },
        { timeout: 1000 }
    )
    await expectFetchCallList(fetchMock.mock.calls, [
        ['http://127.0.0.1:8000/cosmae/api/columns/children', {}],
        ['http://127.0.0.1:8000/cosmae/api/columns/search?term=test', {}]
    ])
})

async function performSearch(user: UserEvent, term: string) {
    const searchInput = await waitFor(() => {
        return screen.getByRole('textbox')
    })
    await act(async () => {
        await user.click(searchInput)
        await user.keyboard('{Control>}a{/Control}')
        if (term.length === 0) {
            await user.keyboard('{Backspace}')
        } else {
            await user.paste(term)
        }
    })
}

const idColumn = 'id-column'
const idColumn1 = 'id-column-1'
const nameColumn = 'Column 0'
const nameColumn1 = 'Column 1'

const column = newColumn({
    idPersistent: idColumn,
    namePath: [nameColumn],
    columnType: 'STRING' as ColumnType,
    curated: true,
    version: 1,
    hidden: false
})
const column1 = newColumn({
    idPersistent: idColumn1,
    namePath: [nameColumn1],
    columnType: 'STRING' as ColumnType,
    curated: true,
    version: 1,
    hidden: false
})

const preloadedState = {
    ...emptyState,
    columnSelection: {
        ...emptyState.columnSelection,
        columnsByIdPersistent: {
            [idColumn]: newRemote(column),
            [idColumn1]: newRemote(column1)
        }
    }
}
const initialState = { preloadedState }
