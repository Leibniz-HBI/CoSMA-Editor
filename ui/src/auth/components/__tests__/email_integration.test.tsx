/**
 * @vitest-environment jsdom
 */
import { RenderOptions, render, waitFor } from '@testing-library/react'
import { AuthState, newAuthState } from '../../state'
import { newUserState, UserState } from '../../../user/state'
import {
    NotificationManager,
    notificationReducer,
    NotificationType
} from '../../../util/notification/slice'
import { EditSessionState, newEditSessionState } from '../../../session/state'
import { configureStore } from '@reduxjs/toolkit'
import { Mock, vi } from 'vitest'
import { authReducer } from '../../slice'
import { editSessionReducer } from '../../../session/slice'
import { userReducer } from '../../../user/slice'
import { PropsWithChildren } from 'react'
import { Provider } from 'react-redux'
import { EmailVerification } from '../email_verification'
import { useNavigate } from 'react-router-dom'
import { newRemote } from '../../../util/state'

vi.mock('react-router-dom', () => {
    const mockNavigate = vi.fn()
    return {
        useNavigate: vi.fn().mockReturnValue(mockNavigate),
        useLoaderData: vi.fn().mockReturnValue('1ab2cd3ef4')
    }
})

beforeEach(()=>{
    (useNavigate() as Mock).mockClear()
})
test('successful confirmation while logged in', async () => {
    const fetchMock = vi.fn()
    addResponseSequence(fetchMock, [
        [200, {}],
        [
            200,
            {
                meta: { is_authenticating: true },
                status: 200,
                data: { email: emailTest, authUserApi }
            }
        ]
    ])
    const { store } = renderWithProviders(<EmailVerification />, fetchMock)
    await waitFor(() => {
        expect((useNavigate() as Mock).mock.calls).toEqual([['/']])
        const state = store.getState()
        expect(state.auth.emailVerified).toEqual(newRemote(true))
        expect(state.notification.notificationList).toEqual([
            {
                msg: 'Email successfully verified',
                type: NotificationType.Success,
                id: expect.anything()
            }
        ])
    })
    expect(fetchMock.mock.calls).toEqual([
        ['http://127.0.0.1/auth/config'],
        [
            'http://127.0.0.1/auth/auth/email/verify',
            {
                credentials: 'include',
                method: 'POST',
                body: JSON.stringify({ key: testKey }),
                headers: {
                    'Access-Control-Allow-Credentials': 'true',
                    'Content-Type': 'application/json'
                }
            }
        ]
    ])
})

test('successful confirmation while logged out', async () => {
    const fetchMock = vi.fn()
    addResponseSequence(fetchMock, [
        [200, {}],
        [
            401,
            {
                meta: { is_authenticated: false},
                status: 401,
                data: { flows: [{id:'login'},{id:'signup'}]}
            }
        ]
    ])
    const { store } = renderWithProviders(<EmailVerification />, fetchMock)
    await waitFor(() => {
        expect((useNavigate() as Mock).mock.calls).toEqual([['/']])
        const state = store.getState()
        expect(state.auth.emailVerified).toEqual(newRemote(true))
        expect(state.notification.notificationList).toEqual([
            {
                msg: 'Email successfully verified',
                type: NotificationType.Success,
                id: expect.anything()
            }
        ])
    })
    expect(fetchMock.mock.calls).toEqual([
        ['http://127.0.0.1/auth/config'],
        [
            'http://127.0.0.1/auth/auth/email/verify',
            {
                credentials: 'include',
                method: 'POST',
                body: JSON.stringify({ key: testKey }),
                headers: {
                    'Access-Control-Allow-Credentials': 'true',
                    'Content-Type': 'application/json'
                }
            }
        ]
    ])
})

test('shows error msg', async () => {
    const fetchMock = vi.fn()
    const errorTest = 'error in test'
    addResponseSequence(fetchMock, [
        [200, {}],
        [
            400,
            {
                meta: { is_authenticated: false},
                status: 400,
                errors: [{message:errorTest}]
            }
        ]
    ])
    const { store } = renderWithProviders(<EmailVerification />, fetchMock)
    await waitFor(() => {
        expect((useNavigate() as Mock).mock.calls).toEqual([['/']])
        const state = store.getState()
        expect(state.auth.emailVerified).toEqual(newRemote(false))
        expect(state.notification.notificationList).toEqual([
            {
                msg: errorTest,
                type: NotificationType.Error,
                id: expect.anything()
            }
        ])
    })
    expect(fetchMock.mock.calls).toEqual([
        ['http://127.0.0.1/auth/config'],
        [
            'http://127.0.0.1/auth/auth/email/verify',
            {
                credentials: 'include',
                method: 'POST',
                body: JSON.stringify({ key: testKey }),
                headers: {
                    'Access-Control-Allow-Credentials': 'true',
                    'Content-Type': 'application/json'
                }
            }
        ]
    ])
})

const testKey = '1ab2cd3ef4'
const userNameTest = 'test_user'
const emailTest = 'me@test.url'
const idAuthTest = 287
const authUserApi = {
    display: userNameTest,
    username: userNameTest,
    email: emailTest,
    id: idAuthTest
}
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
