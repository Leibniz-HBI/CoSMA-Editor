/**
 * @jest-environment jsdom
 */
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
import {
    EditSessionEditorButton,
    EditSessionOwnerList,
    EditSessionParticipantList
} from '../components'
import { newRemote } from '../../util/state'
import {
    newNotification,
    newNotificationManager,
    NotificationManager,
    notificationReducer,
    NotificationType
} from '../../util/notification/slice'
import userEvent from '@testing-library/user-event'
import { newUserInfo, UserPermissionGroup } from '../../user/state'
import { AuthState, newAuthState } from '../../auth/state'
import { authReducer } from '../../auth/slice'

test('change session success', async () => {
    const fetchMock = jest.fn()
    addResponseSequence(fetchMock, [
        [200, sessionListApi],
        [200, sessionApi2]
    ])

    const { store } = renderWithProviders(
        <EditSessionEditorButton popoverPlacement="right" tooltipPlacement="right" />,
        fetchMock
    )
    await selectSession()
    await waitFor(() => {
        expect(store.getState().editSession.editSessionOwnerList).toEqual(
            successSessionList
        )
        expect(store.getState().editSession.currentEditSession.value).toEqual(session2)
    })
    expect(fetchMock.mock.calls).toEqual([
        ['http://127.0.0.1/api/edit_sessions/owner', { credentials: 'include' }],
        [
            'http://127.0.0.1/api/user/edit_session',
            {
                credentials: 'include',
                body: JSON.stringify({ id_edit_session_persistent: idSession2 }),
                method: 'POST'
            }
        ]
    ])
})
describe('select edit session', () => {
    test('error retrieving sessions', async () => {
        const fetchMock = jest.fn()
        const testError = 'Could not get sessions'
        addResponseSequence(fetchMock, [[500, { msg: testError }]])
        const { store } = renderWithProviders(
            <EditSessionEditorButton popoverPlacement="top" tooltipPlacement="top" />,
            fetchMock
        )
        await selectOwnerTab()
        await waitFor(() => {
            expect(store.getState().notification.notificationList).toEqual([
                newNotification({
                    msg: testError,
                    type: NotificationType.Error,
                    id: expect.anything()
                })
            ])
        })
        expect(fetchMock.mock.calls).toEqual([
            ['http://127.0.0.1/api/edit_sessions/owner', { credentials: 'include' }]
        ])
        expect(store.getState().editSession).toEqual(initialSessionState)
    })

    test('error setting session', async () => {
        const fetchMock = jest.fn()
        const testError = 'Could not get sessions'
        addResponseSequence(fetchMock, [
            [200, sessionListApi],
            [500, { msg: testError }]
        ])
        const { store } = renderWithProviders(
            <EditSessionEditorButton tooltipPlacement="left" popoverPlacement="left" />,
            fetchMock
        )
        await selectSession()
        await waitFor(() => {
            expect(store.getState().notification.notificationList).toEqual([
                newNotification({
                    msg: testError,
                    type: NotificationType.Error,
                    id: expect.anything()
                })
            ])
        })
        expect(fetchMock.mock.calls).toEqual([
            ['http://127.0.0.1/api/edit_sessions/owner', { credentials: 'include' }],
            [
                'http://127.0.0.1/api/user/edit_session',
                {
                    credentials: 'include',
                    body: JSON.stringify({ id_edit_session_persistent: idSession2 }),
                    method: 'POST'
                }
            ]
        ])
        expect(store.getState().editSession).toEqual({
            ...initialSessionState,
            editSessionOwnerList: successSessionList,
            editSessionOwnerMap: { [idSession1]: 0, [idSession2]: 1 }
        })
    })
})

describe('owner', () => {
    describe('create session', () => {
        test('success', async () => {
            const fetchMock = jest.fn()
            addResponseSequence(fetchMock, [
                [200, { edit_session_list: [] }],
                [200, sessionApi2]
            ])
            const selectEditSessionMock = jest.fn()
            const { store } = renderWithProviders(
                <EditSessionOwnerList
                    selectEditSessionCallback={selectEditSessionMock}
                />,
                fetchMock
            )
            await createSession()
            await waitFor(() => {
                expect(store.getState().editSession).toEqual(
                    newEditSessionState({
                        currentEditSession: newRemote(session2),
                        editSessionOwnerList: newRemote([session2]),
                        editSessionOwnerMap: { [idSession2]: 0 }
                    })
                )
            })
            expect(fetchMock.mock.calls).toEqual([
                [
                    'http://127.0.0.1/api/edit_sessions/owner',
                    { credentials: 'include' }
                ],
                [
                    'http://127.0.0.1/api/edit_sessions',
                    {
                        credentials: 'include',
                        method: 'PUT',
                        body: JSON.stringify({ name: nameSession2 })
                    }
                ]
            ])
        })
        test('error', async () => {
            const fetchMock = jest.fn()
            const testError = 'Could not create session'
            addResponseSequence(fetchMock, [
                [200, { edit_session_list: [] }],
                [500, { msg: testError }]
            ])
            const selectEditSessionMock = jest.fn()
            const { store } = renderWithProviders(
                <EditSessionOwnerList
                    selectEditSessionCallback={selectEditSessionMock}
                />,
                fetchMock
            )
            await createSession()
            await waitFor(() => {
                expect(store.getState().notification.notificationList).toEqual([
                    newNotification({
                        msg: testError,
                        type: NotificationType.Error,
                        id: expect.anything()
                    })
                ])
                expect(store.getState().editSession).toEqual(initialSessionState)
            })
        })
    })
})
describe('participant', () => {
    describe('remove from session', () => {
        test('success', async () => {
            const fetchMock = jest.fn()
            addResponseSequence(fetchMock, [
                [200, sessionListApi],
                [200, {}]
            ])
            const { store } = renderWithProviders(
                <EditSessionParticipantList />,
                fetchMock
            )
            await removeFromSession()
            await confirmRemoval()
            await waitFor(() => {
                expect(store.getState().editSession.editSessionParticipantList).toEqual(
                    newRemote([session2])
                )
            })
            expect(fetchMock.mock.calls).toEqual([
                [
                    'http://127.0.0.1/api/edit_sessions/participant',
                    { credentials: 'include' }
                ],
                [
                    `http://127.0.0.1/api/edit_sessions/${idSession2}/participants`,
                    {
                        credentials: 'include',
                        method: 'DELETE',
                        body: JSON.stringify({
                            id_participant: 'id-user',
                            type_participant: 'INTERNAL'
                        })
                    }
                ]
            ])
        })
        test('error deleting', async () => {
            const fetchMock = jest.fn()
            const testError = 'Could not remove participant'
            addResponseSequence(fetchMock, [
                [200, sessionListApi],
                [500, { msg: testError }]
            ])
            const { store } = renderWithProviders(
                <EditSessionParticipantList />,
                fetchMock
            )
            await removeFromSession()
            await confirmRemoval()
            await waitFor(() => {
                expect(store.getState().notification.notificationList).toEqual([
                    newNotification({
                        type: NotificationType.Error,
                        msg: testError,
                        id: expect.anything()
                    })
                ])
                expect(store.getState().editSession).toEqual({
                    ...initialSessionState,
                    editSessionParticipantList: successSessionList,
                    editSessionParticipantMap: { [idSession1]: 0, [idSession2]: 1 }
                })
            })
        })
        test('error retrieving sessions', async () => {
            const fetchMock = jest.fn()
            const testError = 'Could not remove participant'
            addResponseSequence(fetchMock, [[500, { msg: testError }]])
            const { store } = renderWithProviders(
                <EditSessionParticipantList />,
                fetchMock
            )
            await waitFor(() => {
                const state = store.getState()
                expect(state.notification.notificationList).toEqual([
                    newNotification({
                        msg: testError,
                        type: NotificationType.Error,
                        id: expect.anything()
                    })
                ])
                expect(state.editSession).toEqual({
                    ...initialSessionState
                })
            })
            expect(fetchMock.mock.calls).toEqual([
                [
                    'http://127.0.0.1/api/edit_sessions/participant',
                    { credentials: 'include' }
                ]
            ])
        })
        test('can cancel', async () => {
            const fetchMock = jest.fn()
            const testError = 'Could not remove participant'
            addResponseSequence(fetchMock, [
                [200, sessionListApi],
                [500, { msg: testError }]
            ])
            const { store } = renderWithProviders(
                <EditSessionParticipantList />,
                fetchMock
            )
            await removeFromSession()
            await waitFor(() => {
                const button = screen.getByRole('button', { name: 'Cancel' })
                button.click()
            })
            await waitFor(() => {
                screen.getByText(nameSession1)
                screen.getByText(nameSession2)
            })
            expect(store.getState().editSession).toEqual({
                ...initialSessionState,
                editSessionParticipantList: successSessionList,
                editSessionParticipantMap: { [idSession1]: 0, [idSession2]: 1 }
            })
        })
    })
})
async function openTabs() {
    await waitFor(async () => {
        const button = await screen.findByRole('button')
        button.click()
    })
}

async function selectOwnerTab() {
    await openTabs()
    await waitFor(async () => {
        const tab = await screen.findByText('Owner')
        tab.click()
    })
}

async function selectSession() {
    await selectOwnerTab()
    await waitFor(async () => {
        await screen.findByRole('button', { name: nameSession1 })
        const button = await screen.findByRole('button', { name: nameSession2 })
        button.click()
    })
}

async function createSession() {
    await waitFor(async () => {
        const user = userEvent.setup()
        const textInput = await screen.findByRole('textbox')
        await user.type(textInput, nameSession2)
        const button = await screen.findByRole('button', { name: 'New Edit Session' })
        await user.click(button)
    })
}

async function removeFromSession() {
    await waitFor(() => {
        const sessionLabel = screen.getByText(nameSession2)
        const row = sessionLabel.parentElement
        const button = row?.children[1]
        const circleParent = button?.children[0]
        expect(circleParent?.children[0].getAttribute('d')).toEqual(
            'M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16'
        )
        expect(circleParent?.children[1].getAttribute('d')).toEqual(
            'M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708'
        )
        ;(button as HTMLInputElement)?.click()
    })
}

async function confirmRemoval() {
    await waitFor(() => {
        const button = screen.getByRole('button', { name: 'Remove' })
        button.click()
    })
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

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: {
        editSession: EditSessionState
        notification: NotificationManager
        auth: AuthState
    }
}

export function renderWithProviders(
    ui: React.ReactElement,
    fetchMock: jest.Mock,
    {
        preloadedState = {
            editSession: initialSessionState,
            notification: newNotificationManager({}),
            auth: newAuthState({
                user: newRemote(
                    newUserInfo({
                        username: 'user-test',
                        email: 'mail@test.org',
                        namesPersonal: ' name test',
                        permissionGroup: UserPermissionGroup.APPLICANT,
                        idPersistent: 'id-user'
                    })
                )
            })
        },
        ...renderOptions
    }: ExtendedRenderOptions = {}
) {
    const store = configureStore({
        reducer: {
            editSession: editSessionReducer,
            notification: notificationReducer,
            auth: authReducer
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
const idParticipant3 = 'id-participant-3'
const nameParticipant3 = 'Participant 3'

const idSession1 = 'id-session-test'
const nameSession1 = 'edit session for test'
const idSession2 = 'id-session-test-2'
const nameSession2 = 'second edit session for test'
const idOwner = 'id-owner'

const initialSessionState = newEditSessionState({
    currentEditSession: newRemote(
        newEditSession({
            idPersistent: idSession1,
            name: nameSession1,
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

const sessionApi2 = {
    name: nameSession2,
    id_persistent: idSession2,
    owner: {
        id_participant: idParticipant1,
        type_participant: 'INTERNAL'
    },
    participant_list: [
        {
            name_participant: nameParticipant1,
            id_participant: idParticipant1,
            type_participant: 'INTERNAL'
        },
        {
            name_participant: nameParticipant3,
            id_participant: idParticipant3,
            type_participant: 'INTERNAL'
        }
    ]
}
const sessionListApi = {
    edit_session_list: [
        {
            name: nameSession1,
            id_persistent: idSession1,
            owner: {
                id_participant: idParticipant1,
                type_participant: 'INTERNAL'
            },
            participant_list: [
                {
                    name_participant: nameParticipant1,
                    id_participant: idParticipant1,
                    type_participant: 'INTERNAL'
                },
                {
                    name_participant: nameParticipant2,
                    id_participant: idParticipant2,
                    type_participant: 'INTERNAL'
                }
            ]
        },
        sessionApi2
    ]
}

const session2 = newEditSession({
    idPersistent: idSession2,
    name: nameSession2,
    owner: newEditSessionParticipant({
        id: idParticipant1,
        type: EditSessionParticipantType.internal
    }),
    participantList: [
        newEditSessionParticipant({
            name: nameParticipant1,
            id: idParticipant1,
            type: EditSessionParticipantType.internal
        }),
        newEditSessionParticipant({
            name: nameParticipant3,
            id: idParticipant3,
            type: EditSessionParticipantType.internal
        })
    ],
    participantMap: { [idParticipant1]: 0, [idParticipant3]: 1 }
})
const successSessionList = newRemote([
    newEditSession({
        idPersistent: idSession1,
        name: nameSession1,
        owner: newEditSessionParticipant({
            id: idParticipant1,
            type: EditSessionParticipantType.internal
        }),
        participantList: [
            newEditSessionParticipant({
                name: nameParticipant1,
                id: idParticipant1,
                type: EditSessionParticipantType.internal
            }),
            newEditSessionParticipant({
                name: nameParticipant2,
                id: idParticipant2,
                type: EditSessionParticipantType.internal
            })
        ],
        participantMap: { [idParticipant1]: 0, [idParticipant2]: 1 }
    }),
    session2
])
