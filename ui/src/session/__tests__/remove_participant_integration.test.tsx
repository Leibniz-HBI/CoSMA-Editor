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
import { EditSessionEditor } from '../components'
import { newRemote } from '../../util/state'
import { newNotification, NotificationType } from '../../util/notification/slice'
import { emptyState, renderWithProviders } from '../../util/tests/provider'
import { addResponseSequence, expectFetchCallList } from '../../util/tests/response'

test('remove participant success', async () => {
    const fetchMock = vi.fn()
    addResponseSequence(fetchMock, [[200, {}]])
    const { store } = renderWithProviders(<EditSessionEditor />, fetchMock, {
        preloadedState
    })
    await removeParticipant()
    await confirmRemoval()
    await waitFor(() => {
        expect(store.getState().editSession.currentEditSession.value).toEqual(
            newEditSession({
                name: nameSession,
                idPersistent: idSession,
                owner: newEditSessionParticipant({
                    id: idOwner,
                    name: '',
                    type: EditSessionParticipantType.internal
                }),
                participantList: [
                    newEditSessionParticipant({
                        id: idParticipant2,
                        name: nameParticipant2,
                        type: EditSessionParticipantType.internal
                    })
                ],
                participantMap: { [idParticipant2]: 0 }
            })
        )
    })
    await expectFetchCallList(fetchMock.mock.calls, [
        [
            `http://127.0.0.1:8000/cosmae/api/edit_sessions/${idSession}/participants`,
            {
                method: 'DELETE',
                credentials: 'include',
                body: {
                    id_participant: idParticipant1,
                    type_participant: 'INTERNAL'
                }
            }
        ]
    ])
})
test('remove participant error', async () => {
    const fetchMock = vi.fn()
    const testError = 'Can not remove yourself'
    addResponseSequence(fetchMock, [[500, { msg: testError }]])
    const { store } = renderWithProviders(<EditSessionEditor />, fetchMock, {
        preloadedState
    })
    await removeParticipant()
    await confirmRemoval()
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

test('cancel removal', async () => {
    const fetchMock = vi.fn()
    addResponseSequence(fetchMock, [[200, {}]])
    const { store } = renderWithProviders(<EditSessionEditor />, fetchMock, {
        preloadedState
    })
    await removeParticipant()
    await cancelRemoval()
    await waitFor(() => {
        screen.getByText(nameParticipant2)
        expect(store.getState().editSession.currentEditSession.value).toEqual(
            newEditSession({
                name: nameSession,
                idPersistent: idSession,
                owner: newEditSessionParticipant({
                    id: idOwner,
                    name: '',
                    type: EditSessionParticipantType.internal
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
                participantMap: { [idParticipant1]: 0, [idParticipant2]: 1 }
            })
        )
        expect(fetchMock.mock.calls).toEqual([])
    })
})

async function removeParticipant() {
    await waitFor(() => {
        const buttons = screen.getAllByRole('button')
        const circleParent = buttons[0].children[0]
        expect(circleParent.children[0].getAttribute('d')).toEqual(
            'M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16'
        )
        expect(circleParent.children[1].getAttribute('d')).toEqual(
            'M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708'
        )
        buttons[0].click()
    })
}

async function confirmRemoval() {
    await waitFor(() => {
        const confirmButton = screen.getByRole('button', { name: 'Remove Participant' })
        confirmButton.click()
    })
}

async function cancelRemoval() {
    await waitFor(() => {
        const cancelButton = screen.getByRole('button', { name: 'Cancel' })
        cancelButton.click()
    })
}

const idParticipant1 = 'id-participant-1'
const nameParticipant1 = 'Participant 1'
const idParticipant2 = 'id-participant-2'
const nameParticipant2 = 'Participant 2'

const idSession = 'id-session-test'
const nameSession = 'edit session for test'
const idOwner = 'id-owner'

const preloadedState = {
    ...emptyState,
    editSession: newEditSessionState({
        currentEditSession: newRemote(
            newEditSession({
                idPersistent: idSession,
                name: nameSession,
                owner: newEditSessionParticipant({
                    type: EditSessionParticipantType.internal,
                    name: '',
                    id: idOwner
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
                participantMap: { [idParticipant1]: 0, [idParticipant2]: 1 }
            })
        )
    })
}
