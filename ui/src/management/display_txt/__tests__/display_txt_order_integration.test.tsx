/**
 * @vitest-environment jsdom
 */
import { vi, Mock } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import {
    ColumnSelectionState,
    newColumnSelectionState
} from '../../../column_menu/state'
import {
    NotificationManager,
    notificationReducer
} from '../../../util/notification/slice'
import { newRemote } from '../../../util/state'
import { DisplayTxtManagementState } from '../state'
import { RenderOptions, render, screen, waitFor } from '@testing-library/react'
import { displayTxtManagementReducer } from '../slice'
import { columnSelectionReducer } from '../../../column_menu/slice'
import { PropsWithChildren } from 'react'
import { Provider } from 'react-redux'
import { DisplayTxtManagementComponent } from '../components'

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: {
        displayTxtManagement: DisplayTxtManagementState
        columnSelection: ColumnSelectionState
        notification: NotificationManager
    }
}

export function renderWithProviders(
    ui: React.ReactElement,
    fetchMock: Mock,
    {
        preloadedState = {
            displayTxtManagement: { columns: newRemote([]) },
            columnSelection: newColumnSelectionState({}),
            notification: { notificationList: [], notificationMap: {} }
        },
        ...renderOptions
    }: ExtendedRenderOptions = {}
) {
    const store = configureStore({
        reducer: {
            displayTxtManagement: displayTxtManagementReducer,
            columnSelection: columnSelectionReducer,
            error: notificationReducer
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
            body: JSON.stringify({ id_parent_persistent: undefined })
        }
    ],
    [
        'http://127.0.0.1:8000/cosmae/api/columns/children',
        {
            credentials: 'include',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_parent_persistent: idColumn0 })
        }
    ],
    [
        'http://127.0.0.1:8000/cosmae/api/columns/children',
        {
            credentials: 'include',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_parent_persistent: idColumn1 })
        }
    ],
    [
        'http://127.0.0.1:8000/cosmae/api/columns/children',
        {
            credentials: 'include',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_parent_persistent: idColumn2 })
        }
    ]
]
test('get', async () => {
    const fetchMock = vi.fn()
    initialResponseSequence(fetchMock)
    renderWithProviders(<DisplayTxtManagementComponent />, fetchMock)
    await waitFor(() => {
        screen.getByText(nameColumn0)
        screen.getByText(nameColumn1)
        const column2Texts = screen.getAllByText(nameColumn2)
        expect(column2Texts.length).toEqual(2)
    })
    expect(fetchMock.mock.calls).toEqual(expectedGetRequests)
})
test('append and remove', async () => {
    const fetchMock = vi.fn()
    initialResponseSequence(fetchMock)
    addResponseSequence(fetchMock, [[200, {}]])
    addResponseSequence(fetchMock, [[200, {}]])
    renderWithProviders(<DisplayTxtManagementComponent />, fetchMock)
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
    expect(fetchMock.mock.calls).toEqual([
        ...expectedGetRequests,
        [
            'http://127.0.0.1:8000/cosmae/api/manage/display_txt/order/append',
            {
                method: 'POST',
                credentials: 'include',
                body: JSON.stringify({ id_column_persistent: idColumn0 })
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
