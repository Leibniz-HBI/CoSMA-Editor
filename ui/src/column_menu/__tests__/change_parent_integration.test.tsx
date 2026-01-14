/**
 * @vitest-environment jsdom
 */

import { waitFor, screen, fireEvent } from '@testing-library/react'
import {
    Column,
    ColumnType,
    newColumn,
    newColumnHierarchyNode,
    newColumnSelectionState
} from '../state'
import {
    NotificationType,
    newNotification,
    newNotificationManager
} from '../../util/notification/slice'
import { ColumnSelector } from '../components/selection'
import { newRemote } from '../../util/state'
import { vi } from 'vitest'
import { addResponseSequence, expectFetchCallList } from '../../util/tests/response'
import { emptyState, renderWithProviders } from '../../util/tests/provider'

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

const initialState = {
    preloadedState: {
        ...emptyState,
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
        })
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
        fetchMock,
        initialState
    )
    await waitFor(() => dragColumn(nameCol, nameCol1))
    await waitFor(() => {
        const state = store.getState()
        expect(state.columnSelection).toEqual(
            newColumnSelectionState({
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
            })
        )
    })
    await waitFor(() => dragColumn(/-> column name/i, undefined))
    await waitFor(() => {
        const state = store.getState()
        expect(state.columnSelection).toEqual(
            newColumnSelectionState({
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
            })
        )
    })
    await expectFetchCallList(fetchMock.mock.calls, [
        [
            'http://127.0.0.1:8000/cosmae/api/columns',
            {
                method: 'POST',
                credentials: 'include',
                body: {
                    column_list: [
                        {
                            id_persistent: columnTest.idPersistent,
                            name: nameCol,
                            id_parent_persistent: columnTest1.idPersistent,
                            type: 'STRING',
                            version: columnTest.version
                        }
                    ]
                }
            }
        ],
        [
            'http://127.0.0.1:8000/cosmae/api/columns',
            {
                method: 'POST',
                credentials: 'include',
                body: {
                    column_list: [
                        {
                            id_persistent: columnTest.idPersistent,
                            name: nameCol,
                            type: 'STRING',
                            version: newVersion
                        }
                    ]
                }
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
        fetchMock,
        initialState
    )
    await waitFor(() => dragColumn(nameCol, nameCol1))
    await waitFor(() => {
        const state = store.getState()
        expect(state.columnSelection).toEqual(
            newColumnSelectionState({
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
            })
        )
        expect(state.notification).toEqual(
            newNotificationManager({
                notificationList: [
                    newNotification({
                        msg: testError,
                        type: NotificationType.Error,
                        id: expect.anything()
                    })
                ],
                notificationMap: expect.anything()
            })
        )
    })
    await expectFetchCallList(fetchMock.mock.calls, [
        [
            'http://127.0.0.1:8000/cosmae/api/columns',
            {
                method: 'POST',
                credentials: 'include',
                body: {
                    column_list: [
                        {
                            id_persistent: columnTest.idPersistent,
                            name: nameCol,
                            id_parent_persistent: columnTest1.idPersistent,
                            type: 'STRING',
                            version: columnTest.version
                        }
                    ]
                }
            }
        ]
    ])
})
