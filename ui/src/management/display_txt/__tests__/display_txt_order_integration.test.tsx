/**
 * @jest-environment jsdom
 */
import { configureStore } from '@reduxjs/toolkit'
import { TagSelectionState, newTagSelectionState } from '../../../column_menu/state'
import {
    NotificationManager,
    notificationReducer
} from '../../../util/notification/slice'
import { newRemote } from '../../../util/state'
import { DisplayTxtManagementState } from '../state'
import { RenderOptions, render, screen, waitFor } from '@testing-library/react'
import { displayTxtManagementReducer } from '../slice'
import { tagSelectionSlice } from '../../../column_menu/slice'
import { PropsWithChildren } from 'react'
import { Provider } from 'react-redux'
import { DisplayTxtManagementComponent } from '../components'

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: {
        displayTxtManagement: DisplayTxtManagementState
        tagSelection: TagSelectionState
        notification: NotificationManager
    }
}

export function renderWithProviders(
    ui: React.ReactElement,
    fetchMock: jest.Mock,
    {
        preloadedState = {
            displayTxtManagement: { tagDefinitions: newRemote([]) },
            tagSelection: newTagSelectionState({}),
            notification: { notificationList: [], notificationMap: {} }
        },
        ...renderOptions
    }: ExtendedRenderOptions = {}
) {
    const store = configureStore({
        reducer: {
            displayTxtManagement: displayTxtManagementReducer,
            tagSelection: tagSelectionSlice.reducer,
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

function addResponseSequence(mock: jest.Mock, responses: [number, unknown][]) {
    for (const tpl of responses) {
        const [status_code, rsp] = tpl
        mock.mockImplementationOnce(
            jest.fn(() =>
                Promise.resolve({
                    status: status_code,
                    json: () => Promise.resolve(rsp)
                })
            ) as jest.Mock
        )
    }
}
const idTagDef0 = 'id-tag-test-0'
const nameTagDef0 = 'tag def 0'
const idTagDef1 = 'id-tag-test-1'
const nameTagDef1 = 'tag def 1'
const idTagDef2 = 'id-tag-test-2'
const nameTagDef2 = 'tag def 2'

function initialResponseSequence(mock: jest.Mock) {
    addResponseSequence(mock, [
        [
            200,
            {
                tag_definitions: [
                    {
                        id_persistent: idTagDef2,
                        name_path: [nameTagDef2],
                        name: nameTagDef2,
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
                tag_definitions: [
                    {
                        id_persistent: idTagDef0,
                        name_path: [nameTagDef0],
                        name: nameTagDef0,
                        curated: true,
                        version: 0,
                        type: 'STRING'
                    },
                    {
                        id_persistent: idTagDef1,
                        name_path: [nameTagDef1],
                        name: nameTagDef1,
                        curated: false,
                        version: 1,
                        type: 'STRING'
                    },
                    {
                        id_persistent: idTagDef2,
                        name_path: [nameTagDef2],
                        name: nameTagDef2,
                        curated: true,
                        version: 2,
                        type: 'STRING'
                    }
                ]
            }
        ],
        [200, { tag_definitions: [] }],
        [200, { tag_definitions: [] }],
        [200, { tag_definitions: [] }]
    ])
}

const expectedGetRequests = [
    [
        'http://127.0.0.1:8000/cosmae/api/manage/display_txt/order',
        { credentials: 'include' }
    ],
    [
        'http://127.0.0.1:8000/cosmae/api/tags/definitions/children',
        {
            credentials: 'include',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_parent_persistent: undefined })
        }
    ],
    [
        'http://127.0.0.1:8000/cosmae/api/tags/definitions/children',
        {
            credentials: 'include',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_parent_persistent: idTagDef0 })
        }
    ],
    [
        'http://127.0.0.1:8000/cosmae/api/tags/definitions/children',
        {
            credentials: 'include',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_parent_persistent: idTagDef1 })
        }
    ],
    [
        'http://127.0.0.1:8000/cosmae/api/tags/definitions/children',
        {
            credentials: 'include',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_parent_persistent: idTagDef2 })
        }
    ]
]
test('get', async () => {
    const fetchMock = jest.fn()
    initialResponseSequence(fetchMock)
    renderWithProviders(<DisplayTxtManagementComponent />, fetchMock)
    await waitFor(() => {
        screen.getByText(nameTagDef0)
        screen.getByText(nameTagDef1)
        const tagDef2Texts = screen.getAllByText(nameTagDef2)
        expect(tagDef2Texts.length).toEqual(2)
    })
    expect(fetchMock.mock.calls).toEqual(expectedGetRequests)
})
test('append and remove', async () => {
    const fetchMock = jest.fn()
    initialResponseSequence(fetchMock)
    addResponseSequence(fetchMock, [[200, {}]])
    addResponseSequence(fetchMock, [[200, {}]])
    renderWithProviders(<DisplayTxtManagementComponent />, fetchMock)
    await waitFor(() => {
        const tagDef0Text = screen.getByText(nameTagDef0)
        const listEntry =
            tagDef0Text.parentElement?.parentElement?.parentElement?.parentElement
        expect(listEntry?.className).toEqual(
            'd-flex flex-row justify-content-between list-group-item'
        )
        ;(listEntry?.children[listEntry.children.length - 1] as HTMLElement)?.click()
    })

    await waitFor(() => {
        const tagDef0Texts = screen.getAllByText(nameTagDef2)
        expect(tagDef0Texts.length).toEqual(2)
        const listElement = tagDef0Texts[0]?.parentElement?.parentElement
        expect(listElement?.className).toEqual('justify-content-between row'),
            (
                listElement?.children[listElement.children.length - 1] as HTMLElement
            )?.click()
    })
    await waitFor(() => {
        screen.getByText(nameTagDef2)
    })
    expect(fetchMock.mock.calls).toEqual([
        ...expectedGetRequests,
        [
            'http://127.0.0.1:8000/cosmae/api/manage/display_txt/order/append',
            {
                method: 'POST',
                credentials: 'include',
                body: JSON.stringify({ id_tag_definition_persistent: idTagDef0 })
            }
        ],
        [
            `http://127.0.0.1:8000/cosmae/api/manage/display_txt/order/${idTagDef2}`,
            {
                method: 'DELETE',
                credentials: 'include'
            }
        ]
    ])
})
