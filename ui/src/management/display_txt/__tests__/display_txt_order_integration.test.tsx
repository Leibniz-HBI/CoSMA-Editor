/**
 * @vitest-environment jsdom
 */
import { vi, Mock } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { emptyState, renderWithProviders } from '../../../util/tests/provider'
import { addResponseSequence, expectFetchCallList } from '../../../util/tests/response'
import { DisplayTxtManagementComponent } from '../components'

const preloadedState = { ...emptyState },
    initialState = { preloadedState }

const idColumn0 = 'id-column-test-0'
const nameColumn0 = 'column def 0'
const idColumn1 = 'id-column-test-1'
const nameColumn1 = 'column def 1'
const idColumn2 = 'id-column-test-2'
const nameColumn2 = 'column def 2'

function initialResponseSequence(mock: Mock) {
    addResponseSequence(mock, [
        [
            200,
            {
                column_list: [
                    {
                        id_persistent: idColumn2,
                        name_path: [nameColumn2],
                        name: nameColumn2,
                        curated: true,
                        version: 2,
                        type: 'STRING'
                    }
                ]
            }
        ],
        [
            200,
            {
                column_list: [
                    {
                        id_persistent: idColumn0,
                        name_path: [nameColumn0],
                        name: nameColumn0,
                        curated: true,
                        version: 0,
                        type: 'STRING'
                    },
                    {
                        id_persistent: idColumn1,
                        name_path: [nameColumn1],
                        name: nameColumn1,
                        curated: false,
                        version: 1,
                        type: 'STRING'
                    },
                    {
                        id_persistent: idColumn2,
                        name_path: [nameColumn2],
                        name: nameColumn2,
                        curated: true,
                        version: 2,
                        type: 'STRING'
                    }
                ]
            }
        ],
        [200, { column_list: [] }],
        [200, { column_list: [] }],
        [200, { column_list: [] }]
    ])
}

const expectedGetRequests = [
    [
        'http://127.0.0.1:8000/cosmae/api/manage/display_txt/order',
        { credentials: 'include' }
    ],
    [
        'http://127.0.0.1:8000/cosmae/api/columns/children',
        {
            credentials: 'include',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: {}
        }
    ],
    [
        'http://127.0.0.1:8000/cosmae/api/columns/children',
        {
            credentials: 'include',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: { id_parent_persistent: idColumn0 }
        }
    ],
    [
        'http://127.0.0.1:8000/cosmae/api/columns/children',
        {
            credentials: 'include',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: { id_parent_persistent: idColumn1 }
        }
    ],
    [
        'http://127.0.0.1:8000/cosmae/api/columns/children',
        {
            credentials: 'include',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: { id_parent_persistent: idColumn2 }
        }
    ]
]
test('get', async () => {
    const fetchMock = vi.fn()
    initialResponseSequence(fetchMock)
    renderWithProviders(<DisplayTxtManagementComponent />, fetchMock, initialState)
    await waitFor(() => {
        screen.getByText(nameColumn0)
        screen.getByText(nameColumn1)
        const column2Texts = screen.getAllByText(nameColumn2)
        expect(column2Texts.length).toEqual(2)
    })
    await expectFetchCallList(fetchMock.mock.calls, expectedGetRequests)
})
test('append and remove', async () => {
    const fetchMock = vi.fn()
    initialResponseSequence(fetchMock)
    addResponseSequence(fetchMock, [[200, {}]])
    addResponseSequence(fetchMock, [[200, {}]])
    renderWithProviders(<DisplayTxtManagementComponent />, fetchMock, initialState)
    await waitFor(() => {
        const column0Text = screen.getByText(nameColumn0)
        const listEntry =
            column0Text.parentElement?.parentElement?.parentElement?.parentElement
                ?.parentElement
        expect(listEntry?.className).toEqual(
            'd-flex flex-row justify-content-between list-group-item'
        )
        ;(listEntry?.children[listEntry.children.length - 1] as HTMLElement)?.click()
    })

    await waitFor(() => {
        const column0Texts = screen.getAllByText(nameColumn2)
        expect(column0Texts.length).toEqual(2)
        const listElement = column0Texts[0]?.parentElement?.parentElement?.parentElement
        expect(listElement?.className).toEqual('justify-content-between row')
        ;(
            listElement?.children[listElement.children.length - 1] as HTMLElement
        )?.click()
    })
    await waitFor(() => {
        screen.getByText(nameColumn2)
    })
    await expectFetchCallList(fetchMock.mock.calls, [
        ...expectedGetRequests,
        [
            'http://127.0.0.1:8000/cosmae/api/manage/display_txt/order/append',
            {
                method: 'POST',
                credentials: 'include',
                body: { id_column_persistent: idColumn0 }
            }
        ],
        [
            `http://127.0.0.1:8000/cosmae/api/manage/display_txt/order/${idColumn2}`,
            {
                method: 'DELETE',
                credentials: 'include'
            }
        ]
    ])
})
