/**
 * @vitest-environment jsdom
 */
import {vi, Mock }  from 'vitest'
import { render, RenderOptions, screen, waitFor } from '@testing-library/react'
import {
    EditSessionParticipantType,
    EditSessionState,
    newEditSession,
    newEditSessionParticipant,
    newEditSessionState
} from '../state'
import { editSessionReducer } from '../slice'
import { configureStore } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'
import { PropsWithChildren } from 'react'
import { EditSessionEditor } from '../components'
import { userEvent } from '@testing-library/user-event'
import { newRemote } from '../../util/state'
import {
    newNotification,
    newNotificationManager,
    NotificationManager,
    notificationReducer,
    NotificationType
} from '../../util/notification/slice'

const nameAddedParticipant = 'added participant'
const idAddedParticipant = 'id-added-participant'
const nameOtherSearchResult = 'search result participant'
const idOtherSearchResult = 'id-search-result-participant'
const searchResults = {
    search_result_list: [
        {
            name_participant: nameOtherSearchResult,
            id_participant: idOtherSearchResult,
            type_participant: 'INTERNAL'
        },
        {
            name_participant: nameAddedParticipant,
            id_participant: idAddedParticipant,
            type_participant: 'INTERNAL'
        }
    ]
}
test('add participant success', async () => {
    const fetchMock = vi.fn()
    addResponseSequence(fetchMock, [
        [200, searchResults],
        [
            200,
            {
                name_participant: nameAddedParticipant,
                type_participant: 'INTERNAL',
                id_participant: idAddedParticipant
            }
        ]
    ])
    const { store } = renderWithProviders(<EditSessionEditor />, fetchMock)
    await searchParticipant()
    await waitFor(() => {
        expect(store.getState().editSession.participantSearchResults).toEqual(
            newRemote([
                newEditSessionParticipant({
                    id: idOtherSearchResult,
                    name: nameOtherSearchResult,
                    type: EditSessionParticipantType.internal
                }),
                newEditSessionParticipant({
                    id: idAddedParticipant,
                    name: nameAddedParticipant,
                    type: EditSessionParticipantType.internal
                })
            ])
        )
    })
    await selectSearchResult()
    await goBack()
    await waitFor(() => {
        screen.getByText(nameParticipant1)
        screen.getByText(nameParticipant2)
        screen.getByText(nameAddedParticipant)
        expect(
            store.getState().editSession.currentEditSession.value?.participantList
                .length
        ).toEqual(3)
    })
    expect(fetchMock.mock.calls).toEqual([
        [
            'http://127.0.0.1/api/edit_sessions/search',
            {
                body: JSON.stringify({
                    search_term: 'name'
                }),
                credentials: 'include',
                method: 'POST'
            }
        ],
        [
            `http://127.0.0.1/api/edit_sessions/${idSession}/participants`,
            {
                method: 'PUT',
                credentials: 'include',
                body: JSON.stringify({
                    type_participant: 'INTERNAL',
                    id_participant: idAddedParticipant,
                    name_participant: nameAddedParticipant
                })
            }
        ]
    ])
})

test('add participant error', async () => {
    const fetchMock = vi.fn()
    const testError = 'Error while adding participant'
    addResponseSequence(fetchMock, [
        [200, searchResults],
        [
            500,
            {
                msg: testError
            }
        ]
    ])
    const { store } = renderWithProviders(<EditSessionEditor />, fetchMock)
    await searchParticipant()
    await selectSearchResult()
    await waitFor(() => {
        expect(store.getState().notification.notificationList).toEqual([
            newNotification({
                msg: testError,
                type: NotificationType.Error,
                id: expect.anything()
            })
        ])
    })
})

test('search participant error', async () => {
    const fetchMock = vi.fn()
    const testError = 'Error while searching participants'
    addResponseSequence(fetchMock, [
        [
            500,
            {
                msg: testError
            }
        ]
    ])
    const { store } = renderWithProviders(<EditSessionEditor />, fetchMock)
    await searchParticipant()
    await waitFor(() => {
        expect(store.getState().notification.notificationList).toEqual([
            newNotification({
                msg: testError,
                type: NotificationType.Error,
                id: expect.anything()
            })
        ])
    })
})

async function searchParticipant() {
    screen.getByText(nameParticipant1)
    screen.getByText(nameParticipant2)
    const button = screen.getByRole('button', { name: 'Add Participant' })
    const user = userEvent.setup()
    await user.click(button)
    await waitFor(() => {
        const textInput = screen.getByRole('textbox')
        user.type(textInput, 'name')
    })
}

async function selectSearchResult() {
    await waitFor(() => {
        screen.getByRole('button', { name: nameOtherSearchResult + ' Source: internal' })
        const button = screen.getByRole('button', { name: nameAddedParticipant + ' Source: internal' })
        button.click()
    })
}

async function goBack() {
    await waitFor(() => {
        const backButton = screen.getAllByRole('button')[0]
        expect(backButton.textContent).toEqual('')
        backButton.click()
    })
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

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: {
        editSession: EditSessionState
        notification: NotificationManager
    }
}

const idSession = 'id-session-test'
export function renderWithProviders(
    ui: React.ReactElement,
    fetchMock: Mock,
    {
        preloadedState = {
            editSession: newEditSessionState({
                currentEditSession: newRemote(
                    newEditSession({
                        idPersistent: idSession,
                        name: 'edit session for test',
                        owner: newEditSessionParticipant({
                            type: EditSessionParticipantType.internal,
                            name: '',
                            id: 'id-owner'
                        }),
                        participantList: [
                            newEditSessionParticipant({
                                id: idParticipant1,
                                name: nameParticipant1,
                                type: EditSessionParticipantType.internal
                            }),
                            newEditSessionParticipant({
                                id: idParticipant2,
                                name: nameParticipant2,
                                type: EditSessionParticipantType.internal
                            })
                        ],
                        participantMap: {}
                    })
                )
            }),
            notification: newNotificationManager({})
        },
        ...renderOptions
    }: ExtendedRenderOptions = {}
) {
    const store = configureStore({
        reducer: {
            editSession: editSessionReducer,
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

const idParticipant1 = 'id-participant-1'
const nameParticipant1 = 'Participant 1'
const idParticipant2 = 'id-participant-2'
const nameParticipant2 = 'Participant 2'
