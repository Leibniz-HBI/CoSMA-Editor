/**
 * @vitest-environment jsdom
 */
import { configureStore } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'
import { PropsWithChildren } from 'react'
import { RenderOptions, render, screen, waitFor } from '@testing-library/react'
import {
    UserPermissionGroup,
    UserState,
    newUserInfo,
    newUserState
} from '../../../user/state'
import userReducer from '../../../user/slice'
import { AuthProvider } from '../provider'
import userEvent from '@testing-library/user-event'
import { newRemote } from '../../../util/state'
import {
    NotificationManager,
    NotificationType,
    notificationReducer
} from '../../../util/notification/slice'
import {
    EditSessionParticipantType,
    EditSessionState,
    newEditSession,
    newEditSessionParticipant,
    newEditSessionState
} from '../../../session/state'
import { act } from 'react-dom/test-utils'
import { editSessionReducer } from '../../../session/slice'
import { AuthState, AuthStep, newAuthState } from '../../state'
import { authReducer } from '../../slice'
import { vi, Mock } from 'vitest'

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: {
        auth: AuthState
        user: UserState
        notification: NotificationManager
        editSession: EditSessionState
    }
}

const idErrorTest = 'id-error-test'
vi.mock('uuid', () => {
    return {
        v4: () => idErrorTest
    }
})

export function renderWithProviders(
    ui: React.ReactElement,
    fetchMock: Mock,
    {
        preloadedState = {
            user: newUserState({}),
            auth: newAuthState({}),
            notification: { notificationList: [], notificationMap: {} },
            editSession: newEditSessionState({})
        },
        ...renderOptions
    }: ExtendedRenderOptions = {}
) {
    const store = configureStore({
        reducer: {
            user: userReducer,
            auth: authReducer,
            notification: notificationReducer,
            editSession: editSessionReducer
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

const userNameTest = 'test_user'
const emailTest = 'me@test.url'
const passwordTest = 'pA$sw0rd-1234'
const namesPersonalTest = 'names personal test'
const testError = 'test error message'
const idPersistentTest = 'id-user-test'
const idEditSession = 'id-session-test'
const idAuthTest = 287
const nameEditSession = 'edit session for tests'
const authUserApiRsp = {
    data: {
        user: {
            display: userNameTest,
            username: userNameTest,
            email: emailTest,
            id: idAuthTest
        }
    },
    meta: { is_authenticated: true }
}
const userInfoApi = {
    username: userNameTest,
    names_personal: namesPersonalTest,
    email: emailTest,
    names_family: '',
    tag_definition_list: [],
    id_persistent: idPersistentTest,
    permission_group: 'CONTRIBUTOR',
    edit_session: {
        id_persistent: idEditSession,
        name: nameEditSession,
        owner: {
            id_participant: idPersistentTest,
            name_participant: userNameTest,
            type_participant: 'INTERNAL'
        },
        participant_list: []
    }
}
const authStateSuccess = newAuthState({
    step: newRemote(AuthStep.Authenticated),
    userAuth: {
        id: idAuthTest,
        username: userNameTest,
        display: userNameTest,
        email: emailTest
    },
    user: newRemote(
        newUserInfo({
            username: userNameTest,
            namesPersonal: namesPersonalTest,
            email: emailTest,
            namesFamily: '',
            columns: [],
            idPersistent: idPersistentTest,
            permissionGroup: UserPermissionGroup.CONTRIBUTOR
        })
    )
})
describe('login', () => {
    async function performLogin(container: HTMLElement) {
        const user = userEvent.setup()
        const textInput = await screen.findByRole('textbox')
        const passwordInput = screen.getByLabelText('Password')
        const buttons = container.getElementsByTagName('button')
        await act(async () => {
            await user.type(textInput, 'username')
            await user.type(passwordInput, 'password')
            const loginButton = buttons[1]
            expect(loginButton.textContent).toEqual('Login')
            await user.click(loginButton)
        })
    }
    test('login on successful refresh', async () => {
        const fetchMock = vi.fn()
        addResponseSequence(fetchMock, [
            [200, authUserApiRsp],
            [200, userInfoApi]
        ])
        const { store } = renderWithProviders(
            <AuthProvider children={<span>You are logged in</span>}></AuthProvider>,
            fetchMock
        )
        await waitFor(() => {
            expect(fetchMock.mock.calls.length).toEqual(2)
        })
        await waitFor(async () => {
            expect(screen.getByText('You are logged in')).toBeDefined()
        })
        expect(store.getState().auth).toEqual(authStateSuccess)
        expect(store.getState().editSession).toEqual(
            newEditSessionState({
                currentEditSession: newRemote(
                    newEditSession({
                        idPersistent: idEditSession,
                        name: nameEditSession,
                        owner: newEditSessionParticipant({
                            type: EditSessionParticipantType.internal,
                            name: userNameTest,
                            id: idPersistentTest
                        }),
                        participantList: [],
                        participantMap: {}
                    })
                )
            })
        )
    })
    test('successful login', async () => {
        const fetchMock = vi.fn()
        addResponseSequence(fetchMock, [
            [401, { msg: 'not authenticated' }],
            [200, {}],
            [200, authUserApiRsp],
            [200, userInfoApi]
        ])
        const { store, container } = renderWithProviders(
            <AuthProvider children={<span>You are logged in</span>}></AuthProvider>,
            fetchMock
        )
        await performLogin(container)
        await waitFor(() => {
            expect(fetchMock.mock.calls.length).toEqual(4)
        })
        await waitFor(async () => {
            expect(screen.getByText('You are logged in')).toBeDefined()
        })
        expect(store.getState().auth).toEqual(authStateSuccess)
    })
    test('login error with message', async () => {
        const fetchMock = vi.fn()
        addResponseSequence(fetchMock, [
            [401, {}],
            [200, {}],
            [200, authUserApiRsp],
            [400, { msg: testError }]
        ])
        const { store, container } = renderWithProviders(
            <AuthProvider children={<span>You are logged in</span>}></AuthProvider>,
            fetchMock
        )
        await performLogin(container)
        await waitFor(() => {
            const state = store.getState()
            expect(state.user).toEqual(newUserState({}))
            const notifications = state.notification.notificationList
            expect(notifications.length).toEqual(1)
            const notification = notifications[0]
            expect(notification.msg).toEqual(testError)
        })
        await waitFor(() => {
            expect(screen.queryByText('You are logged in')).toBeNull()
        })
    })
    test('login error without message', async () => {
        const fetchMock = vi.fn()
        addResponseSequence(fetchMock, [
            [401, {}],
            [200, {}],
            [200, authUserApiRsp],
            [400, {}]
        ])
        const { store, container } = renderWithProviders(
            <AuthProvider children={<span>You are logged in</span>}></AuthProvider>,
            fetchMock
        )
        performLogin(container)
        await waitFor(async () => {
            expect(store.getState().user).toEqual(newUserState({}))
        })
        await waitFor(() => {
            expect(screen.queryByText('You are logged in')).toBeNull()
        })
        await waitFor(
            async () => {
                const state = store.getState()
                expect(state.user).toEqual(newUserState({}))
                const notifications = state.notification.notificationList
                expect(notifications.length).toEqual(1)
                const notification = notifications[0]
                expect(notification.msg).toEqual('Unknown error')
            },
            { timeout: 2000 }
        )
    })
})

describe('registration', () => {
    async function performRegistration() {
        const user = userEvent.setup()
        await waitFor(
            async () => {
                const registrationButton = screen.getByRole('button', {
                    name: 'Registration'
                })
                await user.click(registrationButton)
            },
            { timeout: 2000 }
        )
        await act(async () => {
            const textInputs = await waitFor(() => {
                const textInputs = screen.getAllByRole('textbox')
                expect(textInputs.length).toEqual(4)
                return textInputs
            })
            await user.type(textInputs[0], 'username')
            await user.type(textInputs[1], 'mail@test.url')
            await user.type(textInputs[2], 'names personal')
            const passwordInput = screen.getByLabelText('Password')
            await user.type(passwordInput, passwordTest)
            const repeatPasswordInput = screen.getByLabelText('Repeat password')
            await user.type(repeatPasswordInput, passwordTest)
            const registerButton = screen.getByRole('button', { name: 'Register' })
            await user.click(registerButton)
        })
    }

    test('success', async () => {
        const fetchMock = vi.fn()
        addResponseSequence(fetchMock, [
            [401, { msg: 'not authenticated' }],
            [200, {}],
            [200, authUserApiRsp],
            [200, userInfoApi]
        ])
        const { store } = renderWithProviders(
            <AuthProvider children={<span>You are logged in</span>}></AuthProvider>,
            fetchMock
        )
        await performRegistration()
        await waitFor(async () => {
            const state = store.getState()
            expect(state.user).toEqual(newUserState({}))
            expect(state.notification).toEqual({
                notificationList: [
                    {
                        msg: 'Registration Successful',
                        type: NotificationType.Success,
                        id: expect.anything()
                    }
                ],
                notificationMap: expect.anything()
            })
        })
        await waitFor(() => {
            expect(store.getState().notification.notificationList.length).toEqual(1)
        })
    })
    test('error', async () => {
        const fetchMock = vi.fn()
        addResponseSequence(fetchMock, [
            [401, { msg: 'not authenticated' }],
            [200, {}],
            [400, { msg: 'registration error' }]
        ])
        const { store } = renderWithProviders(
            <AuthProvider children={<span>You are logged in</span>}></AuthProvider>,
            fetchMock
        )
        await performRegistration()
        await waitFor(async () => {
            expect(screen.queryByText('You are logged in')).toBeNull()
        })
        await waitFor(async () => {
            const state = store.getState()
            expect(state.auth.user).toEqual(newRemote(undefined))
            expect(state.user).toEqual({
                userSearchResults: newRemote([]),
                userInfoByIdPersistent: {}
            })
            const notifications = state.notification.notificationList
            expect(notifications.length).toEqual(1)
            const notification = notifications[0]
            expect(notification.msg).toEqual('registration error')
        })
    })
    test('error without message', async () => {
        const fetchMock = vi.fn()
        addResponseSequence(fetchMock, [
            [401, { msg: 'not authenticated' }],
            [200, {}],
            [400, {}]
        ])
        const { store } = renderWithProviders(
            <AuthProvider children={<span>You are logged in</span>}></AuthProvider>,
            fetchMock
        )
        await performRegistration()
        await waitFor(async () => {
            expect(screen.queryByText('You are logged in')).toBeNull()
        })
        await waitFor(async () => {
            const state = store.getState()
            expect(state.auth.user).toEqual(newRemote(undefined))
            expect(state.user).toEqual({
                userSearchResults: newRemote([]),
                userInfoByIdPersistent: {}
            })
            const notifications = state.notification.notificationList
            expect(notifications.length).toEqual(1)
            const notification = notifications[0]
            expect(notification.msg).toEqual('Unknown error')
        })
    })
})
