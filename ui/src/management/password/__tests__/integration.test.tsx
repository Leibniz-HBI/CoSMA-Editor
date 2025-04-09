/**
 * @vitest-environment jsdom
 */

import { Mock } from 'vitest'
import { newUserState, UserState } from '../../../user/state'
import { render, RenderOptions, screen, waitFor } from '@testing-library/react'
import {
    newNotification,
    newNotificationManager,
    NotificationManager,
    notificationReducer,
    NotificationType
} from '../../../util/notification/slice'
import { configureStore } from '@reduxjs/toolkit'
import { userReducer } from '../../../user/slice'
import { PropsWithChildren } from 'react'
import { Provider } from 'react-redux'
import { ManagementPasswordComponent } from '../components'
import userEvent from '@testing-library/user-event'

describe('set password', () => {
    test('success', async () => {
        const fetchMock = vi.fn()
        addResponseSequence(fetchMock, [
            [200, userSearchResponse],
            [200, userApi],
            [200, { status: 200 }]
        ])
        const { store } = renderWithProviders(
            <ManagementPasswordComponent />,
            fetchMock
        )
        await submitPasswordForm(searchTermTest, passwordTest, passwordTest)
        await waitFor(() => {
            expect(store.getState().notification.notificationList).toEqual([
                newNotification({
                    msg: 'Password changed',
                    type: NotificationType.Success,
                    id: expect.anything()
                })
            ])
        })

        expect(fetchMock.mock.calls).toEqual([
            [
                `http://127.0.0.1:8000/cosmae/api/user/search/${searchTermTest}`,
                { credentials: 'include', method: 'GET' }
            ],
            [
                `http://127.0.0.1:8000/cosmae/api/user/${idUserTest}`,
                { credentials: 'include' }
            ],
            [
                'http://127.0.0.1:8000/cosmae/api/user/password',
                {
                    method: 'POST',
                    credentials: 'include',
                    body: JSON.stringify({
                        id_user_persistent: idUserTest,
                        new_password: passwordTest
                    })
                }
            ]
        ])
    })
    test('error', async () => {
        const fetchMock = vi.fn()
        const testError = 'Could not set password in test'
        addResponseSequence(fetchMock, [
            [200, userSearchResponse],
            [200, userApi],
            [500, { status: 500, errors: [{message: testError}] }]
        ])
        const { store } = renderWithProviders(
            <ManagementPasswordComponent />,
            fetchMock
        )
        await submitPasswordForm(searchTermTest, passwordTest, passwordTest)
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
            [
                `http://127.0.0.1:8000/cosmae/api/user/search/${searchTermTest}`,
                { credentials: 'include', method: 'GET' }
            ],
            [
                `http://127.0.0.1:8000/cosmae/api/user/${idUserTest}`,
                { credentials: 'include' }
            ],
            [
                'http://127.0.0.1:8000/cosmae/api/user/password',
                {
                    method: 'POST',
                    credentials: 'include',
                    body: JSON.stringify({
                        id_user_persistent: idUserTest,
                        new_password: passwordTest
                    })
                }
            ]
        ])
    })
})

const usernameTest = 'userTest'
const searchTermTest = usernameTest.slice(4)
const idUserTest = 'id-user-test'
const passwordTest = '1234ABcd?!'

const userApi = {
    username: usernameTest,
    id_persistent: idUserTest,
    permission_group: 'CONTRIBUTOR'
}
const userSearchResponse = {
    results: [userApi]
}

async function submitPasswordForm(
    userSearch: string,
    password: string,
    passwordRepeat: string
) {
    const user = userEvent.setup()
    const searchBox = screen.getByRole('textbox')
    await user.click(searchBox)
    await user.paste(userSearch)
    let searchResult = undefined
    await waitFor(async () => {
        searchResult = screen.getByText(usernameTest)
    })
    // can not click in wait for because result will disappear after click
    // making UI unstable
    if (searchResult !== undefined) {
        await user.click(searchResult)
    }
    const passwordInput = screen.getByLabelText('New Password')
    const repeatPasswordInput = screen.getByLabelText('Repeat Password')
    await user.click(passwordInput)
    await user.paste(password)
    await user.click(repeatPasswordInput)
    await user.paste(passwordRepeat)
    const button = screen.getByRole('button')
    await user.click(button)
}
interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: {
        user: UserState
        notification: NotificationManager
    }
}
export function renderWithProviders(
    ui: React.ReactElement,
    fetchMock: Mock,
    {
        preloadedState = {
            user: newUserState({}),
            notification: newNotificationManager({})
        },
        ...renderOptions
    }: ExtendedRenderOptions = {}
) {
    const store = configureStore({
        reducer: {
            user: userReducer,
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
