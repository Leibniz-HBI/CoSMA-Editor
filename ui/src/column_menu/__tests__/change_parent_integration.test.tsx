/**
 * @vitest-environment jsdom
 */

import {
    RenderOptions,
    render,
    waitFor,
    screen,
    fireEvent
} from '@testing-library/react'
import {
    Column,
    ColumnSelectionState,
    ColumnType,
    newColumn,
    newColumnHierarchyNode,
    newColumnSelectionState
} from '../state'
import { configureStore } from '@reduxjs/toolkit'
import { columnSelectionReducer } from '../slice'
import React, { PropsWithChildren } from 'react'
import { Provider } from 'react-redux'
import {
    NotificationManager,
    NotificationType,
    newNotification,
    newNotificationManager,
    notificationReducer
} from '../../util/notification/slice'
import { ColumnSelector } from '../components/selection'
import { newRemote } from '../../util/state'
import { vi, Mock } from 'vitest'

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: {
        columnSelection: ColumnSelectionState
        notification: NotificationManager
    }
}

const nameCol = 'column name'
const nameCol1 = 'column name 1'

const idCol = 'id-column-test'
const columnTest = newColumn({
    namePath: [nameCol],
    idPersistent: idCol,
    columnType: ColumnType.String,
    idParentPersistent: undefined,
    hidden: false,
    version: 4,
    curated: true
})
const idColumn1 = 'id-column-test-1'
const columnTest1 = newColumn({
    namePath: [nameCol1],
    idPersistent: idColumn1,
    columnType: ColumnType.String,
    idParentPersistent: undefined,
    hidden: false,
    version: 4,
    curated: true
})

export function renderWithProviders(
    ui: React.ReactElement,
    fetchMock: Mock,
    {
        preloadedState = {
            columnSelection: newColumnSelectionState({
                children: [
                    newColumnHierarchyNode({
                        name: nameCol,
                        idColumnPersistent: idCol
                    }),
                    newColumnHierarchyNode({
                        idColumnPersistent: idColumn1,
                        name: nameCol1,
                        isExpanded: true
                    })
                ],
                columnsByIdPersistent: {
                    [idCol]: newRemote(columnTest),
                    [idColumn1]: newRemote(columnTest1)
                }
            }),
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
            vi.fn(() =>
                Promise.resolve({
                    status: status_code,
                    json: () => Promise.resolve(rsp)
                })
            ) as Mock
        )
    }
}

function dragColumn(startName: string | RegExp, endName: string | undefined) {
    const start = screen.getByRole('button', { name: startName })
    let end = screen.getByTestId('no-parent-drop-zone')
    if (endName !== undefined) {
        end = screen.getByText(endName)
    }
    const dataTransferObject: { [key: string]: string } = {}
    const dataTransfer = {
        setData: (key: string, data: string) => (dataTransferObject[key] = data),
        getData: (key: string) => dataTransferObject[key]
    }
    fireEvent.dragStart(start, { dataTransfer })
    fireEvent.dragOver(end)
    fireEvent.drop(end, { dataTransfer })
    fireEvent.dragEnd(start)
}

function mkTailElement(_column: Column) {
    return <div />
}

test('success', async function () {
    const fetchMock = vi.fn()
    const newVersion = 5,
        newVersion1 = 6
    addResponseSequence(fetchMock, [
        [
            200,
            {
                column_list: [
                    {
                        name_path: [nameCol1, nameCol],
                        id_persistent: idCol,
                        id_parent_persistent: idColumn1,
                        type: 'STRING',
                        curated: true,
                        hidden: false,
                        version: newVersion
                    }
                ]
            }
        ],
        [
            200,
            {
                column_list: [
                    {
                        name_path: [nameCol],
                        id_persistent: idCol,
                        id_parent_persistent: undefined,
                        type: 'STRING',
                        curated: true,
                        hidden: false,
                        version: newVersion1
                    }
                ]
            }
        ]
    ])
    const { store } = renderWithProviders(
        <ColumnSelector mkTailElement={mkTailElement} />,
        fetchMock
    )
    await waitFor(() => dragColumn(nameCol, nameCol1))
    await waitFor(() => {
        expect(store.getState()).toEqual({
            columnSelection: newColumnSelectionState({
                children: [
                    newColumnHierarchyNode({
                        idColumnPersistent: idColumn1,
                        name: nameCol1,
                        isExpanded: true,
                        children: [
                            newColumnHierarchyNode({
                                name: nameCol,
                                idColumnPersistent: idCol
                            })
                        ]
                    })
                ],
                columnsByIdPersistent: {
                    [idCol]: newRemote({
                        ...columnTest,
                        namePath: [nameCol1, nameCol],
                        idParentPersistent: idColumn1,
                        version: newVersion
                    }),
                    [idColumn1]: newRemote(columnTest1)
                }
            }),
            notification: newNotificationManager({})
        })
    })
    await waitFor(() => dragColumn(/-> column name/i, undefined))
    await waitFor(() => {
        expect(store.getState()).toEqual({
            columnSelection: newColumnSelectionState({
                children: [
                    newColumnHierarchyNode({
                        idColumnPersistent: idColumn1,
                        name: nameCol1,
                        isExpanded: true
                    }),
                    newColumnHierarchyNode({
                        name: nameCol,
                        idColumnPersistent: idCol
                    })
                ],
                columnsByIdPersistent: {
                    [idCol]: newRemote({
                        ...columnTest,
                        namePath: [nameCol],
                        version: newVersion1
                    }),
                    [idColumn1]: newRemote(columnTest1)
                }
            }),
            notification: newNotificationManager({})
        })
    })
    expect(fetchMock.mock.calls).toEqual([
        [
            'http://127.0.0.1:8000/cosmae/api/columns',
            {
                method: 'POST',
                credentials: 'include',
                body: JSON.stringify({
                    column_list: [
                        {
                            id_persistent: columnTest.idPersistent,
                            name: nameCol,
                            id_parent_persistent: columnTest1.idPersistent,
                            type: 'STRING',
                            version: columnTest.version
                        }
                    ]
                })
            }
        ],
        [
            'http://127.0.0.1:8000/cosmae/api/columns',
            {
                method: 'POST',
                credentials: 'include',
                body: JSON.stringify({
                    column_list: [
                        {
                            id_persistent: columnTest.idPersistent,
                            name: nameCol,
                            type: 'STRING',
                            version: newVersion
                        }
                    ]
                })
            }
        ]
    ])
})

test('error', async function () {
    const fetchMock = vi.fn()
    const testError = 'Could not change parent'
    addResponseSequence(fetchMock, [[500, { msg: testError }]])
    const { store } = renderWithProviders(
        <ColumnSelector mkTailElement={mkTailElement} />,
        fetchMock
    )
    await waitFor(() => dragColumn(nameCol, nameCol1))
    await waitFor(() => {
        expect(store.getState()).toEqual({
            columnSelection: newColumnSelectionState({
                children: [
                    newColumnHierarchyNode({
                        name: nameCol,
                        idColumnPersistent: idCol
                    }),
                    newColumnHierarchyNode({
                        idColumnPersistent: idColumn1,
                        name: nameCol1,
                        isExpanded: true
                    })
                ],
                columnsByIdPersistent: {
                    [idCol]: newRemote(columnTest),
                    [idColumn1]: newRemote(columnTest1)
                }
            }),
            notification: newNotificationManager({
                notificationList: [
                    newNotification({
                        msg: testError,
                        type: NotificationType.Error,
                        id: expect.anything()
                    })
                ],
                notificationMap: expect.anything()
            })
        })
    })
    expect(fetchMock.mock.calls).toEqual([
        [
            'http://127.0.0.1:8000/cosmae/api/columns',
            {
                method: 'POST',
                credentials: 'include',
                body: JSON.stringify({
                    column_list: [
                        {
                            id_persistent: columnTest.idPersistent,
                            name: nameCol,
                            id_parent_persistent: columnTest1.idPersistent,
                            type: 'STRING',
                            version: columnTest.version
                        }
                    ]
                })
            }
        ]
    ])
})
