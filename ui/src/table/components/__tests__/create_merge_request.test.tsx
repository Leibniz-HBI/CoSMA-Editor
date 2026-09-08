/**
 * @vitest-environment jsdom
 */

import { Mock } from 'vitest'
import { addResponseSequence, expectFetchCallList } from '../../../util/tests/response'
import { emptyState, renderWithProviders } from '../../../util/tests/provider'
import { ColumnMergeRequestModal } from '../modals'
import { screen, waitFor, getByRole } from '@testing-library/react'

describe('create_merge_request', () => {
    test('success', async () => {
        const fetchMock = vi.fn()
        addInitialResponseSequence(fetchMock)
        addResponseSequence(fetchMock, [
            [
                200,
                {
                    id_persistent: 'id_merge_request_persistent'
                }
            ]
        ])
        const { store } = renderWithProviders(<ColumnMergeRequestModal />, fetchMock, {
            preloadedState
        })
        await setColumns(columnNameTest, columnNameTest1)
        await waitFor(() => {
            expect(store.getState().notification.notificationList).toEqual([
                {
                    msg: 'Merge request created successfully',
                    type: 'success',
                    id: expect.any(String)
                }
            ])
        })
        await expectFetchCallList(fetchMock.mock.calls, [
            [
                'http://127.0.0.1:8000/cosmae/api/columns/children',
                {
                    body: {},
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    method: 'POST'
                }
            ],
            [
                'http://127.0.0.1:8000/cosmae/api/columns/children',
                {
                    body: { id_parent_persistent: idColumnPersistent },
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    method: 'POST'
                }
            ],
            [
                'http://127.0.0.1:8000/cosmae/api/columns/children',
                {
                    body: { id_parent_persistent: idColumnPersistent1 },
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    method: 'POST'
                }
            ],
            [
                'http://127.0.0.1:8000/cosmae/api/merge_requests/new/' +
                    `${idColumnPersistent}/${idColumnPersistent1}`,
                {
                    method: 'PUT',
                    credentials: 'include'
                }
            ]
        ])
    })
    test('error', async () => {
        const fetchMock = vi.fn()
        addInitialResponseSequence(fetchMock)
        const testErrorMessage = 'test error message'
        addResponseSequence(fetchMock, [
            [
                500,
                {
                    msg: testErrorMessage
                }
            ]
        ])
        const { store } = renderWithProviders(<ColumnMergeRequestModal />, fetchMock, {
            preloadedState
        })
        await setColumns(columnNameTest, columnNameTest1)
        await waitFor(() => {
            expect(store.getState().notification.notificationList).toEqual([
                {
                    msg: testErrorMessage,
                    type: 'error',
                    id: expect.any(String)
                }
            ])
        })
    })
})

const idColumnPersistent = 'id_column_persistent',
    idColumnPersistent1 = 'id_column_persistent_1',
    columnNameTest = 'column_name_test',
    columnNameTest1 = 'column_name_test_1'

function addInitialResponseSequence(fetchMock: Mock) {
    addResponseSequence(fetchMock, [
        [
            200,
            {
                column_list: [
                    {
                        id_persistent: idColumnPersistent,
                        id_parent_persistent: null,
                        name_path: [columnNameTest],
                        name: columnNameTest,
                        curated: true,
                        hidden: false,
                        version: 2,
                        type: 'STRING'
                    },
                    {
                        id_persistent: idColumnPersistent1,
                        id_parent_persistent: null,
                        name_path: [columnNameTest1],
                        name: columnNameTest1,
                        curated: true,
                        hidden: false,
                        version: 2,
                        type: 'STRING'
                    }
                ]
            }
        ],
        [200, { column_list: [] }],
        [200, { column_list: [] }]
    ])
}

async function setColumns(
    nameOrigin: string | undefined,
    nameDestination: string | undefined
) {
    if (nameOrigin !== undefined) {
        const selectOriginButton = await waitFor(() =>
            screen.getByRole('button', { name: 'Select Origin' })
        )
        selectOriginButton.click()
        await selectColumn(nameOrigin)
    }
    if (nameDestination !== undefined) {
        const selectDestinationButton = await waitFor(() =>
            screen.getByRole('button', {
                name: 'Select Destination'
            })
        )
        selectDestinationButton.click()
        await selectColumn(nameDestination)
    }
    const createButton = screen.getByRole('button', { name: 'Create' })
    createButton.click()
}

async function selectColumn(name: string) {
    const labelText = await waitFor(() => screen.getByText(name))
    const parent =
        labelText.parentElement?.parentElement?.parentElement?.parentElement
            ?.parentElement
    if (parent !== undefined) {
        const button = getByRole(parent as HTMLElement, 'button', {
            name: 'Select'
        })
        button.click()
    }
    await waitFor(() => {
        const selectButton = screen.queryByRole('button', { name: 'Select' })
        expect(selectButton).toBeNull()
    })
}

const preloadedState = {
    ...emptyState,
    table: {
        ...emptyState.table,
        showMergeRequestForm: true
    }
}
