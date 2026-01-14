/**
 * @vitest-environment jsdom
 */

import { waitFor, screen } from '@testing-library/react'
import {
    ColumnType,
    newColumn,
    newColumnSelectionState
} from '../state'
import {
    NotificationType,
    newNotification,
} from '../../util/notification/slice'
import { newRemote } from '../../util/state'

import { useColumn } from '../hooks'
import {
    displayTextColumn,
    displayTxtColumnId,
    justificationColumn,
    justificationColumnId
} from '../../table/state'
import { addResponseSequence, expectFetchCallList } from '../../util/tests/response'
import { renderWithProviders } from '../../util/tests/provider'

function TestComponent({ idPersistent }: { idPersistent: string }) {
    const column = useColumn(idPersistent)
    let label = 'undefined'

    if (column.isLoading) {
        label = 'loading'
    }
    if (column.value !== undefined) {
        label = column.value.namePath.at(-1) ?? 'empty name'
    }
    return <div>{label}</div>
}

const idColumn = 'id-column-test'
const nameColumn = 'column name'
const columnTest = newColumn({
    namePath: [nameColumn],
    idPersistent: idColumn,
    columnType: ColumnType.String,
    idParentPersistent: undefined,
    hidden: false,
    version: 0,
    curated: true
})
test('success', async () => {
    const fetchMock = vi.fn()
    addResponseSequence(fetchMock, [
        [
            200,
            {
                column_list: [
                    {
                        name_path: [nameColumn],
                        id_persistent: idColumn,
                        id_parent_persistent: undefined,
                        type: 'STRING',
                        curated: true,
                        hidden: false,
                        version: 0
                    }
                ]
            }
        ]
    ])
    const { store } = renderWithProviders(
        <TestComponent idPersistent={idColumn} />,
        fetchMock
    )
    await waitFor(() => {
        screen.getByText('loading')
    })
    await waitFor(() => {
        screen.getByText(nameColumn)
    })
    await expectFetchCallList(fetchMock.mock.calls, [
        [
            'http://127.0.0.1:8000/cosmae/api/columns/details',
            {
                method: 'POST',
                credentials: 'include',
                body: { id_persistent_list: [idColumn] }
            }
        ]
    ])
    expect(store.getState().columnSelection).toEqual(
        newColumnSelectionState({
            columnsByIdPersistent: {
                [displayTxtColumnId]: newRemote(displayTextColumn),
                [justificationColumnId]: newRemote(justificationColumn),
                [idColumn]: newRemote(columnTest)
            }
        })
    )
})

test('error', async () => {
    const fetchMock = vi.fn()
    const testError = 'Could not get column definition details.'
    addResponseSequence(fetchMock, [[500, { msg: testError }]])
    const { store } = renderWithProviders(
        <TestComponent idPersistent={idColumn} />,
        fetchMock
    )
    await waitFor(() => {
        screen.getByText('loading')
    })
    await waitFor(() => {
        screen.getByText('undefined')
    })
    const state = store.getState()
    expect(state.columnSelection).toEqual(
        newColumnSelectionState({
            columnsByIdPersistent: {
                [displayTxtColumnId]: newRemote(displayTextColumn),
                [justificationColumnId]: newRemote(justificationColumn),
                [idColumn]: newRemote(undefined)
            }
        })
    )
    expect(state.notification.notificationList).toEqual([
        newNotification({
            msg: testError,
            type: NotificationType.Error,
            id: expect.anything()
        })
    ])
})
