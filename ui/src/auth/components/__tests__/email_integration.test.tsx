/**
 * @vitest-environment jsdom
 */
import { waitFor } from '@testing-library/react'
import {
    NotificationType
} from '../../../util/notification/slice'
import { Mock, vi, expect } from 'vitest'
import { EmailVerification } from '../email_verification'
import { useNavigate } from 'react-router-dom'
import { newRemote } from '../../../util/state'
import { addResponseSequence, expectFetchCallList} from '../../../util/tests/response'
import { renderWithProviders } from '../../../util/tests/provider'

vi.mock('react-router-dom', () => {
    const mockNavigate = vi.fn()
    return {
        useNavigate: vi.fn().mockReturnValue(mockNavigate),
        useLoaderData: vi.fn().mockReturnValue('1ab2cd3ef4')
    }
})

beforeEach(() => {})
afterEach(() => {
    vi.clearAllMocks()
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
    await expectFetchCallList(fetchMock.mock.calls, [
        ['http://127.0.0.1:8000/_allauth/browser/v1/config'],
        [
            'http://127.0.0.1:8000/_allauth/browser/v1/auth/email/verify',
            {
                credentials: 'include',
                method: 'POST',
                body: { key: testKey },
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
                meta: { is_authenticated: false },
                status: 401,
                data: { flows: [{ id: 'login' }, { id: 'signup' }] }
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
    await expectFetchCallList(fetchMock.mock.calls, [
        ['http://127.0.0.1:8000/_allauth/browser/v1/config'],
        [
            'http://127.0.0.1:8000/_allauth/browser/v1/auth/email/verify',
            {
                credentials: 'include',
                method: 'POST',
                body: { key: testKey },
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
                meta: { is_authenticated: false },
                status: 400,
                errors: [{ message: errorTest }],
                data: { flows: [{ id: 'login' }, { id: 'signup' }] }
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
    await expectFetchCallList(fetchMock.mock.calls, [
        ['http://127.0.0.1:8000/_allauth/browser/v1/config'],
        [
            'http://127.0.0.1:8000/_allauth/browser/v1/auth/email/verify',
            {
                credentials: 'include',
                method: 'POST',
                body: { key: testKey },
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
