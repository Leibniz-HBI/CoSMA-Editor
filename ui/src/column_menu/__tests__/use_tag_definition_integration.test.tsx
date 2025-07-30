/**
 * @vitest-environment jsdom
 */

import { RenderOptions, render, waitFor, screen } from '@testing-library/react'
import {
    ColumnSelectionState,
    ColumnType,
    newColumn,
    newColumnSelectionState
} from '../state'
import { configureStore } from '@reduxjs/toolkit'
import { columnSelectionReducer} from '../slice'
import React, { PropsWithChildren } from 'react'
import { Provider } from 'react-redux'
import {
    NotificationManager,
    NotificationType,
    newNotification,
    newNotificationManager,
    notificationReducer
} from '../../util/notification/slice'
import { newRemote } from '../../util/state'

import { useColumn } from '../hooks'
import {
    displayTextColumn,
    displayTxtColumnId,
    justificationColumn,
    justificationColumnId
} from '../../table/state'
import { Mock } from 'vitest'

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
    expect(fetchMock.mock.calls).toEqual([
        [
            'http://127.0.0.1:8000/cosmae/api/columns/details',
            {
                method: 'POST',
                credentials: 'include',
                body: JSON.stringify({ id_persistent_list: [idColumn] })
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

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: {
        columnSelection: ColumnSelectionState
        notification: NotificationManager
    }
}

export function renderWithProviders(
    ui: React.ReactElement,
    fetchMock: Mock,
    {
        preloadedState = {
            columnSelection: newColumnSelectionState({}),
            notification: newNotificationManager({})
        },
        ...renderOptions
    }: ExtendedRenderOptions = {}
) {
    const store = configureStore({
        reducer: {
            columnSelection: columnSelectionReducer,
            notification: notificationReducer
        },
        middleware: (getDefaultMiddleware) =>
            getDefaultMiddleware({ thunk: { extraArgument: fetchMock } }),
        preloadedState
    })
    function Wrapper({ children }: PropsWithChildren<object>): JSX.Element {
        return <Provider store={store}>{children}</Provider>
    }

    // Return an object with the store and all of RTL's query functions
    return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) }
}
function addResponseSequence(mock: Mock, responses: [number, unknown][]) {
    for (const tpl of responses) {
        const [status_code, rsp] = tpl
        mock.mockImplementationOnce(
            vi.fn(async () => {
                await new Promise((promise) => setTimeout(promise, 50))
                return {
                    status: status_code,
                    json: () => Promise.resolve(rsp)
                }
            }) as Mock
        )
    }
}
