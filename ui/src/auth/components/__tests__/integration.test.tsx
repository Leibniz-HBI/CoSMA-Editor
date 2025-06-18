/**
 * @vitest-environment jsdom
 */
import { configureStore } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'
import { act, PropsWithChildren } from 'react'
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
import { editSessionReducer } from '../../../session/slice'
import { AuthState, AuthStep, newAuthState } from '../../state'
import { authReducer } from '../../slice'
import { vi, Mock } from 'vitest'
import { RegisterUserManagementComponent } from '../../../management/components'
const idErrorTest = 'id-error-test'
vi.mock('uuid', () => {
    return {
        v4: () => idErrorTest
    }
})

describe('login', () => {
    test('login on successful refresh', async () => {
        const fetchMock = vi.fn()
        addResponseSequence(fetchMock, [
            [200, {}],
            [200, authUserApiRsp],
            [200, userInfoApiResponse]
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
    test('successful login to totp input', async () => {
        const fetchMock = vi.fn()
        addResponseSequence(fetchMock, [
            [200, {}],
            [401, notAuthenticatedRsp],
            [401, totpInputRequiredRsp]
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
    test('successful login to totp registration', async () => {
        const fetchMock = vi.fn()
        addResponseSequence(fetchMock, [
            [200, {}],
            [401, notAuthenticatedRsp],
            [200, authUserApiRsp],
            [401, totpRegistrationRequiredRsp],
            [404, newTotpRsp]
        ])
        const { store, container } = renderWithProviders(
            <AuthProvider children={<span>You are logged in</span>}></AuthProvider>,
            fetchMock
        )
        await performLogin(container)
        await waitFor(async () => {
            expect(
                screen.getByText(
                    'Please register an authenticator app using the QR-Code'
                )
            ).toBeDefined()
        })
        await waitFor(() => {
            expect(fetchMock.mock.calls.length).toEqual(5)
        })
        expect(store.getState().auth).toEqual({
            ...authStateTotp,
            totpUrl: expect.anything()
        })
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
    const mfaCode = '123456'
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
            [200, userInfoApiResponse]
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
                'http://127.0.0.1:8000/_allauth/browser/v1/account/authenticators/totp',
                { credentials: 'include' }
            ],
            [
                'http://127.0.0.1:8000/_allauth/browser/v1/account/authenticators/totp',
                {
                    credentials: 'include',
                    body: JSON.stringify({ code: mfaCode }),
                    headers: headers,
                    method: 'POST'
                }
            ],
            [
                'http://127.0.0.1:8000/cosmae/api/user/self',
                { credentials: 'include', headers }
            ]
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
                'http://127.0.0.1:8000/_allauth/browser/v1/account/authenticators/totp',
                { credentials: 'include' }
            ],
            [
                'http://127.0.0.1:8000/_allauth/browser/v1/account/authenticators/totp',
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
            [200, userInfoApiResponse]
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
                'http://127.0.0.1:8000/_allauth/browser/v1/account/authenticators/totp',
                { credentials: 'include' }
            ],
            [
                'http://127.0.0.1:8000/_allauth/browser/v1/auth/2fa/authenticate',
                {
                    credentials: 'include',
                    body: JSON.stringify({ code: mfaCode }),
                    headers: headers,
                    method: 'POST'
                }
            ],
            [
                'http://127.0.0.1:8000/cosmae/api/user/self',
                { credentials: 'include', headers }
            ]
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
                'http://127.0.0.1:8000/_allauth/browser/v1/account/authenticators/totp',
                { credentials: 'include' }
            ],
            [
                'http://127.0.0.1:8000/_allauth/browser/v1/auth/2fa/authenticate',
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

describe('set password', () => {
    async function fillNewPasswordFrom() {
        await waitFor(async () => {
            const user = userEvent.setup()
            const oldPasswordInput = screen.getByLabelText('Old Password')
            const newPasswordInput = screen.getByLabelText('New Password')
            const repeatPasswordInput = screen.getByLabelText('Repeat Password')
            await user.type(oldPasswordInput, oldPassword)
            await user.type(newPasswordInput, newPassword)
            await user.type(repeatPasswordInput, newPassword)
            const submitButton = screen.getByRole('button', { name: 'Submit' })
            user.click(submitButton)
        })
    }
    const changePasswordResponse = {
        status: 401,
        data: { flows: [{ id: 'password_change', is_pending: true }] },
        meta: { is_authenticated: true }
    }
    const oldPassword = '1x2Y3z4*',
        newPassword = '4r5t6z8U#'
    test('when not logged in', async () => {
        const fetchMock = vi.fn()
        addResponseSequence(fetchMock, [
            [200, {}],
            [401, notAuthenticatedRsp],
            [200, authUserApiRsp],
            [401, changePasswordResponse],
            [200, { status: 200, data: {} }],
            [200, userInfoApiResponse]
        ])
        const { container } = renderWithProviders(
            <AuthProvider children={<span>You are logged in</span>}></AuthProvider>,
            fetchMock
        )
        await performLogin(container)
        await fillNewPasswordFrom()

        await waitFor(() => {})
        await waitFor(() => {
            screen.getByText('You are logged in')
        })
        expect(fetchMock.mock.calls.length).toEqual(6)
    })
    test('when already logged in', async () => {
        const fetchMock = vi.fn()
        addResponseSequence(fetchMock, [
            [200, {}],
            [200, authUserApiRsp],
            [401, changePasswordResponse],
            [200, { status: 200, data: {} }],
            [200, userInfoApiResponse]
        ])
        renderWithProviders(
            <AuthProvider children={<span>You are logged in</span>}></AuthProvider>,
            fetchMock
        )
        await fillNewPasswordFrom()

        await waitFor(() => {})
        await waitFor(() => {
            screen.getByText('You are logged in')
        })
        expect(fetchMock.mock.calls.length).toEqual(5)
    })
})

describe('registration', () => {
    async function performRegistration() {
        const user = userEvent.setup()
        await act(async () => {
            const textInputs = await waitFor(() => {
                const textInputs = screen.getAllByRole('textbox')
                expect(textInputs.length).toEqual(5)
                return textInputs
            })
            await user.type(textInputs[0], userNameTest)
            await user.type(textInputs[1], emailTest)
            await user.type(textInputs[2], namesPersonalTest)
            const passwordInput = screen.getByLabelText('Password')
            await user.type(passwordInput, passwordTest)
            const repeatPasswordInput = screen.getByLabelText('Repeat password')
            await user.type(repeatPasswordInput, passwordTest)
            await user.click(textInputs[4])
            await user.paste(sshKeyTest)
            const registerButton = screen.getByRole('button', { name: 'Register' })
            await user.click(registerButton)
        })
    }

    test('success', async () => {
        const fetchMock = vi.fn()
        addResponseSequence(fetchMock, [[200, authUserApiRsp]])
        const { store } = renderWithProviders(
            <RegisterUserManagementComponent />,
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
        expect(fetchMock.mock.calls).toEqual([
            [
                'http://127.0.0.1:8000/cosmae/api/manage/user',
                {
                    credentials: 'include',
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        username: userNameTest,
                        email: emailTest,
                        password: passwordTest,
                        names_personal: namesPersonalTest,
                        ssh_key: sshKeyTest
                    })
                }
            ]
        ])
    })
    test('error', async () => {
        const fetchMock = vi.fn()
        addResponseSequence(fetchMock, [
            [400, { errors: [{ message: 'registration error' }] }]
        ])
        const { store } = renderWithProviders(
            <RegisterUserManagementComponent />,
            fetchMock
        )
        await performRegistration()
        await waitFor(async () => {
            const state = store.getState()
            expect(state.auth.user).toEqual(newRemote(undefined))
            expect(state.user).toEqual(
                newUserState({
                    userSearchResults: newRemote([]),
                    userInfoByIdPersistent: {}
                })
            )
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
                'http://127.0.0.1:8000/_allauth/browser/v1/auth/reauthenticate',
                {
                    headers,
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
                'http://127.0.0.1:8000/_allauth/browser/v1/auth/reauthenticate',
                {
                    headers,
                    method: 'POST',
                    body: JSON.stringify({ password: passwordTest })
                }
            ]
        ])
    })
})

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: {
        auth: AuthState
        user: UserState
        notification: NotificationManager
        editSession: EditSessionState
    }
}

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
const sshKeyTest =
    'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOCRgyFQbGG49qSpof220k8XRD3GtsihohMkxGVuvnaU user@machine'
const namesPersonalTest = 'names personal test'
const testError = 'test error message'
const idPersistentTest = 'id-user-test'
const idEditSession = 'id-session-test'
const idAuthTest = 287
const nameEditSession = 'edit session for tests'
const headers = {
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json'
}
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
const userInfoApiResponse = {
    status: 200,
    data: {
        username: userNameTest,
        names_personal: namesPersonalTest,
        email: emailTest,
        names_family: '',
        column_list: [],
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
    },
    meta: { is_authenticated: true }
}

const totpRegistrationRequiredRsp = {
    status: 401,
    data: {
        flows: [{ id: 'mfa_register', is_pending: true }]
    },
    meta: { is_authenticated: false }
}

const totpInputRequiredRsp = {
    status: 401,
    data: {
        flows: [{ id: 'mfa_authenticate', is_pending: true }]
    },
    meta: { is_authenticated: false }
}

const newTotpRsp = {
    meta: {
        secret: 'J4ZKKXTK7NOVU7EPUVY23LCDV4T2QZYM',
        totp_url:
            'otpauth://totp/Example:alice@fsf.org?secret=JBSWY3DPEHPK3PXP&issuer=Example'
    }
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

async function performLogin(_container: HTMLElement) {
    const user = userEvent.setup()
    const textInput = await screen.findByRole('textbox')
    const passwordInput = screen.getByLabelText('Password')
    const button = screen.getByRole('button')
    await act(async () => {
        await user.type(textInput, 'username')
        await user.type(passwordInput, 'password')
        const loginButton = button
        expect(loginButton.textContent).toEqual('Login')
        await user.click(loginButton)
    })
}
