/**
 * @vitest-environment jsdom
 */

import { screen, waitFor } from '@testing-library/react'
import { newNotification, NotificationType } from '../../../util/notification/slice'
import { Reset2faComponent } from '../components'
import userEvent from '@testing-library/user-event'
import { addResponseSequence, expectFetchCallList } from '../../../util/tests/response'
import { renderWithProviders } from '../../../util/tests/provider'

describe('set password', () => {
    test('success', async () => {
        const fetchMock = vi.fn()
        addResponseSequence(fetchMock, [
            [200, userSearchResponse],
            [200, userApi],
            [200, { status: 200 }]
        ])
        const { store } = renderWithProviders(<Reset2faComponent />, fetchMock)
        await submit2FaReset(searchTermTest)
        await waitFor(() => {
            expect(store.getState().notification.notificationList).toEqual([
                newNotification({
                    msg: '2FA removed for user.',
                    type: NotificationType.Success,
                    id: expect.anything()
                })
            ])
        })

        await expectFetchCallList(fetchMock.mock.calls, [
            [
                `http://127.0.0.1:8000/cosmae/api/user/search/${searchTermTest}`,
                { credentials: 'include', method: 'GET' }
            ],
            [
                `http://127.0.0.1:8000/cosmae/api/user/id/${idUserTest}`,
                { credentials: 'include' }
            ],
            [
                `http://127.0.0.1:8000/cosmae/api/user/2fa/${idUserTest}`,
                {
                    method: 'DELETE',
                    credentials: 'include',
                    path: {
                        id_user_persistent: idUserTest
                    }
                }
            ]
        ])
    })
    test('error', async () => {
        const fetchMock = vi.fn()
        const testError = 'Could not set SSH key in test'
        addResponseSequence(fetchMock, [
            [200, userSearchResponse],
            [200, userApi],
            [500, { status: 500, msg: testError }]
        ])
        const { store } = renderWithProviders(<Reset2faComponent />, fetchMock)
        await submit2FaReset(searchTermTest)
        await waitFor(() => {
            expect(store.getState().notification.notificationList).toEqual([
                newNotification({
                    msg: testError,
                    type: NotificationType.Error,
                    id: expect.anything()
                })
            ])
        })

        await expectFetchCallList(fetchMock.mock.calls, [
            [
                `http://127.0.0.1:8000/cosmae/api/user/search/${searchTermTest}`,
                { credentials: 'include', method: 'GET' }
            ],
            [
                `http://127.0.0.1:8000/cosmae/api/user/id/${idUserTest}`,
                { credentials: 'include' }
            ],
            [
                `http://127.0.0.1:8000/cosmae/api/user/2fa/${idUserTest}`,
                {
                    method: 'DELETE',
                    credentials: 'include',
                    path: {
                        id_user_persistent: idUserTest
                    }
                }
            ]
        ])
    })
})

const usernameTest = 'userTest'
const searchTermTest = usernameTest.slice(4)
const idUserTest = 'id-user-test'
const sshKeyTest = 'ssh-type a432 user@machine'

const userApi = {
    username: usernameTest,
    id_persistent: idUserTest,
    permission_group: 'CONTRIBUTOR'
}
const userSearchResponse = {
    results: [userApi]
}

async function submit2FaReset(userSearch: string) {
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
    const button = screen.getByRole('button')
    await user.click(button)
}
