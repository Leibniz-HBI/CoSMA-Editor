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
    newNotification,
    newNotificationManager,
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
    status: 200,
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

const totpRequiredRsp = {
    status: 401,
    data: {
        flows: [{ id: 'mfa_authenticate', is_pending: true }]
    },
    meta: { is_authenticated: false }
}

const notAuthenticatedRsp = {
    status: 401,
    data: {
        flows: [{ id: 'login' }, { id: 'signup' }]
    },
    meta: { is_authenticated: false }
}

const authenticatorExistingRsp = {
    status: 200,
    data: {
        last_used_at: 1711555057.065702,
        created_at: 1711555057.065702,
        type: 'totp'
    }
}

const reauthenticateRsp = {
    status: 401,
    data: { flows: [{ id: 'reauthenticate' }] },
    meta: { is_authenticated: true }
}
const authStateSuccess = newAuthState({
    stepStack: newRemote([AuthStep.Authenticated]),
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
const reauthenticateState = newAuthState({
    stepStack: newRemote([AuthStep.Totp, AuthStep.Reauthentication]),
    totpUrl: newRemote(undefined)
})

function allauthErrorRsp(msg: string) {
    return {
        status: 400,
        errors: [{ message: msg }],
        meta: { is_authenticated: false }
    }
}
const loggedInText = 'You are logged in'
const authStepPartial = newAuthState({
    stepStack: newRemote([AuthStep.PartiallyAuthenticated]),
    userAuth: undefined
})
const authStateTotp = newAuthState({
    ...authStepPartial,
    stepStack: newRemote([AuthStep.Totp])
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
            [200, {}],
            [200, authUserApiRsp],
            [200, userInfoApi]
        ])
        const { store } = renderWithProviders(
            <AuthProvider children={<span>{loggedInText}</span>}></AuthProvider>,
            fetchMock
        )
        await waitFor(() => {
            expect(fetchMock.mock.calls.length).toEqual(3)
        })
        await waitFor(async () => {
            expect(screen.getByText(loggedInText)).toBeDefined()
        })
        expect(store.getState().auth).toEqual(authStateSuccess)
    })
    test('successful login to totp', async () => {
        const fetchMock = vi.fn()
        addResponseSequence(fetchMock, [
            [200, {}],
            [401, notAuthenticatedRsp],
            [401, totpRequiredRsp]
        ])
        const { store, container } = renderWithProviders(
            <AuthProvider children={<span>You are logged in</span>}></AuthProvider>,
            fetchMock
        )
        await performLogin(container)
        await waitFor(async () => {
            expect(
                screen.getByText(
                    'Please enter the current code from your authenticator app.'
                )
            ).toBeDefined()
        })
        await waitFor(() => {
            expect(fetchMock.mock.calls.length).toEqual(3)
        })
        expect(store.getState().auth).toEqual(authStateTotp)
    })
    test('login error with message', async () => {
        const fetchMock = vi.fn()
        addResponseSequence(fetchMock, [
            [200, {}],
            [401, notAuthenticatedRsp],
            [400, allauthErrorRsp(testError)]
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
        expect(screen.queryByText('You are logged in')).toBeNull()
    })
})
describe('totp', () => {
    const partialState = {
        preloadedState: {
            auth: authStepPartial,
            user: newUserState({}),
            notification: newNotificationManager({}),
            editSession: newEditSessionState({})
        }
    }
    const newTotpRsp = {
        meta: {
            secret: 'J4ZKKXTK7NOVU7EPUVY23LCDV4T2QZYM',
            totp_url:
                'otpauth://totp/Example:alice@fsf.org?secret=JBSWY3DPEHPK3PXP&issuer=Example'
        }
    }
    const mfaCode = '123456'
    const headers = {
        'Access-Control-Allow-Credentials': 'true',
        'Content-Type': 'application/json'
    }
    async function enterMfaCode() {
        const user = userEvent.setup()
        const textInput = await screen.findByRole('textbox')
        await act(async () => {
            await user.type(textInput, mfaCode)
        })
        const submitButton = await screen.findByRole('button', {
            name: 'Submit'
        })
        await act(async () => {
            await user.click(submitButton)
        })
    }
    test('new authenticator success', async () => {
        const fetchMock = vi.fn()
        addResponseSequence(fetchMock, [
            [404, newTotpRsp],
            [200, authUserApiRsp],
            [200, userInfoApi]
        ])
        const { store } = renderWithProviders(
            <AuthProvider children={<span>{loggedInText}</span>}></AuthProvider>,
            fetchMock,
            partialState
        )
        await enterMfaCode()
        await waitFor(() => {
            screen.getByText(loggedInText)
        })
        const state = store.getState()
        expect(state.auth).toEqual(authStateSuccess)
        expect(state.editSession).toEqual(
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
        expect(fetchMock.mock.calls).toEqual([
            [
                'http://127.0.0.1/auth/account/authenticators/totp',
                { credentials: 'include' }
            ],
            [
                'http://127.0.0.1/auth/account/authenticators/totp',
                {
                    credentials: 'include',
                    body: JSON.stringify({ code: mfaCode }),
                    headers: headers,
                    method: 'POST'
                }
            ],
            ['http://127.0.0.1/api/user/self', { credentials: 'include', headers }]
        ])
    })
    test('new totp error', async () => {
        const fetchMock = vi.fn()
        addResponseSequence(fetchMock, [
            [404, newTotpRsp],
            [401, { errors: [{ message: testError }] }]
        ])
        const { store } = renderWithProviders(
            <AuthProvider children={<span>You are logged in</span>}></AuthProvider>,
            fetchMock,
            partialState
        )
        await enterMfaCode()
        await waitFor(() => {
            expect(store.getState().notification).toEqual(
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
        expect(screen.queryByText('You are logged in')).toBeNull()
        screen.getByRole('textbox')
        expect(fetchMock.mock.calls).toEqual([
            [
                'http://127.0.0.1/auth/account/authenticators/totp',
                { credentials: 'include' }
            ],
            [
                'http://127.0.0.1/auth/account/authenticators/totp',
                {
                    credentials: 'include',
                    body: JSON.stringify({ code: mfaCode }),
                    headers: headers,
                    method: 'POST'
                }
            ]
        ])
    })
    test('new totp reauthenticate', async () => {
        const fetchMock = vi.fn()
        addResponseSequence(fetchMock, [
            [404, newTotpRsp],
            [401, reauthenticateRsp]
        ])
        const { store } = renderWithProviders(
            <AuthProvider children={<span>You are logged in</span>}></AuthProvider>,
            fetchMock,
            partialState
        )
        await enterMfaCode()
        await waitFor(() => {
            expect(store.getState().auth).toEqual({
                ...reauthenticateState,
                totpUrl: newRemote(expect.anything())
            })
        })
    })
    test('existing totp success', async () => {
        const fetchMock = vi.fn()
        addResponseSequence(fetchMock, [
            [200, authenticatorExistingRsp],
            [200, authUserApiRsp],
            [200, userInfoApi]
        ])
        const { store } = renderWithProviders(
            <AuthProvider children={<span>You are logged in</span>}></AuthProvider>,
            fetchMock,
            partialState
        )
        await enterMfaCode()
        await waitFor(() => {
            screen.getByText('You are logged in')
        })
        const state = store.getState()
        expect(state.auth).toEqual(authStateSuccess)
        expect(state.editSession).toEqual(
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
        expect(fetchMock.mock.calls).toEqual([
            [
                'http://127.0.0.1/auth/account/authenticators/totp',
                { credentials: 'include' }
            ],
            [
                'http://127.0.0.1/auth/auth/2fa/authenticate',
                {
                    credentials: 'include',
                    body: JSON.stringify({ code: mfaCode }),
                    headers: headers,
                    method: 'POST'
                }
            ],
            ['http://127.0.0.1/api/user/self', { credentials: 'include', headers }]
        ])
    })
    test('existing totp error', async () => {
        const fetchMock = vi.fn()
        addResponseSequence(fetchMock, [
            [200, authenticatorExistingRsp],
            [401, { errors: [{ message: testError }] }],
            [401, {}],
            [401, {}]
        ])
        const { store } = renderWithProviders(
            <AuthProvider children={<span>You are logged in</span>}></AuthProvider>,
            fetchMock,
            partialState
        )
        await enterMfaCode()
        await waitFor(() => {
            expect(store.getState().notification).toEqual(
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
        expect(screen.queryByText('You are logged in')).toBeNull()
        screen.getByRole('textbox')
        expect(fetchMock.mock.calls).toEqual([
            [
                'http://127.0.0.1/auth/account/authenticators/totp',
                { credentials: 'include' }
            ],
            [
                'http://127.0.0.1/auth/auth/2fa/authenticate',
                {
                    credentials: 'include',
                    body: JSON.stringify({ code: mfaCode }),
                    headers: headers,
                    method: 'POST'
                }
            ]
        ])
    })
    test('existing totp reauthenticate', async () => {
        const fetchMock = vi.fn()
        addResponseSequence(fetchMock, [
            [200, authenticatorExistingRsp],
            [401, reauthenticateRsp]
        ])
        const { store } = renderWithProviders(
            <AuthProvider children={<span>You are logged in</span>}></AuthProvider>,
            fetchMock,
            partialState
        )
        await enterMfaCode()
        await waitFor(() => {
            expect(store.getState().auth).toEqual(reauthenticateState)
        })
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
            [200, {}],
            [401, notAuthenticatedRsp],
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
            [200, {}],
            [401, notAuthenticatedRsp],
            [400, { errors: [{ message: 'registration error' }] }]
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
})
describe('reauthenticate', () => {
    const partialState = {
        preloadedState: {
            auth: reauthenticateState,
            user: newUserState({}),
            notification: newNotificationManager({}),
            editSession: newEditSessionState({})
        }
    }
    async function performReauthentication() {
        const user = userEvent.setup()
        const input = await screen.findByLabelText('Password')
        await user.type(input, passwordTest)
        const button = await screen.findByRole('button')
        await user.click(button)
    }
    test('success', async () => {
        const fetchMock = vi.fn()
        addResponseSequence(fetchMock, [[200, authUserApiRsp]])
        const { store } = renderWithProviders(
            <AuthProvider>
                <span>{loggedInText}</span>
            </AuthProvider>,
            fetchMock,
            partialState
        )
        await performReauthentication()
        await waitFor(() => {
            screen.findByText(
                'Please enter the current code from your authenticator app.'
            )
            const state = store.getState()
            expect(state.auth).toEqual({
                ...partialState.preloadedState.auth,
                stepStack: newRemote([AuthStep.Totp])
            })
            expect(state.notification.notificationList.length).toEqual(0)
        })
        expect(fetchMock.mock.calls).toEqual([
            [
                'http://127.0.0.1/auth/auth/reauthenticate',
                {
                    headers: {
                        'Access-Control-Allow-Credentials': 'true',
                        'Content-Type': 'application/json'
                    },
                    method: 'POST',
                    body: JSON.stringify({ password: passwordTest })
                }
            ]
        ])
    })
    test('error', async () => {
        const fetchMock = vi.fn()
        addResponseSequence(fetchMock, [
            [500, { status: 500, errors: [{ message: testError }] }]
        ])
        const { store } = renderWithProviders(
            <AuthProvider>
                <span>{loggedInText}</span>
            </AuthProvider>,
            fetchMock,
            partialState
        )
        await performReauthentication()
        await waitFor(() => {
            screen.findByText(
                'Please enter the current code from your authenticator app.'
            )
            const state = store.getState()
            expect(state.auth).toEqual(partialState.preloadedState.auth)
            expect(state.notification.notificationList).toEqual([
                newNotification({
                    msg: testError,
                    type: NotificationType.Error,
                    id: expect.anything()
                })
            ])
        })
        expect(fetchMock.mock.calls).toEqual([
            [
                'http://127.0.0.1/auth/auth/reauthenticate',
                {
                    headers: {
                        'Access-Control-Allow-Credentials': 'true',
                        'Content-Type': 'application/json'
                    },
                    method: 'POST',
                    body: JSON.stringify({ password: passwordTest })
                }
            ]
        ])
    })
})
