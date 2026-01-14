/**
 * @vitest-environment jsdom
 */
import { vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import {
    EditSessionParticipantType,
    newEditSession,
    newEditSessionParticipant,
    newEditSessionState
} from '../state'
import { userEvent } from '@testing-library/user-event'
import { newRemote } from '../../util/state'
import {
    newNotification,
    newNotificationManager,
    NotificationType
} from '../../util/notification/slice'
import { emptyState, renderWithProviders } from '../../util/tests/provider'
import { addResponseSequence, expectFetchCallList } from '../../util/tests/response'
import { EditSessionEditor } from '../components'

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
    const { store } = renderWithProviders(<EditSessionEditor />, fetchMock, {
        preloadedState
    })
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
    await expectFetchCallList(fetchMock.mock.calls, [
        [
            'http://127.0.0.1:8000/cosmae/api/edit_sessions/search',
            {
                body: {
                    search_term: 'name'
                },
                credentials: 'include',
                method: 'POST'
            }
        ],
        [
            `http://127.0.0.1:8000/cosmae/api/edit_sessions/${idSession}/participants`,
            {
                method: 'PUT',
                credentials: 'include',
                body: {
                    type_participant: 'INTERNAL',
                    id_participant: idAddedParticipant,
                    name_participant: nameAddedParticipant
                }
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
    const { store } = renderWithProviders(<EditSessionEditor />, fetchMock, {
        preloadedState
    })
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
    const { store } = renderWithProviders(<EditSessionEditor />, fetchMock, {
        preloadedState
    })
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
    await waitFor(() => {
        screen.getByText(nameParticipant1)
        screen.getByText(nameParticipant2)
    })
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
        screen.getByRole('button', {
            name: nameOtherSearchResult + ' Source: internal'
        })
        const button = screen.getByRole('button', {
            name: nameAddedParticipant + ' Source: internal'
        })
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

const idSession = 'id-session-test'
const idParticipant1 = 'id-participant-1'
const nameParticipant1 = 'Participant 1'
const idParticipant2 = 'id-participant-2'
const nameParticipant2 = 'Participant 2'

const preloadedState = {
    ...emptyState,
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
}
