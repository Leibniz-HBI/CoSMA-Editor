/**
 * @vitest-environment jsdom
 */

import { screen, waitFor } from '@testing-library/react'
import { newNotification, NotificationType } from '../../../util/notification/slice'
import { ManagementSshKeyComponent } from '../components'
import userEvent from '@testing-library/user-event'
import { addResponseSequence, expectFetchCallList } from '../../../util/tests/response'
import { renderWithProviders } from '../../../util/tests/provider'

describe('set SSH key', () => {
    test('success', async () => {
        const fetchMock = vi.fn()
        addResponseSequence(fetchMock, [
            [200, userSearchResponse],
            [200, userApi],
            [200, { status: 200 }]
        ])
        const { store } = renderWithProviders(<ManagementSshKeyComponent />, fetchMock)
        await submitSshKey(searchTermTest, sshKeyTest)
        await waitFor(() => {
            expect(store.getState().notification.notificationList).toEqual([
                newNotification({
                    msg: 'SSH Key added',
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
                'http://127.0.0.1:8000/cosmae/api/user/ssh',
                {
                    method: 'PUT',
                    credentials: 'include',
                    body: {
                        id_user_persistent: idUserTest,
                        key: sshKeyTest
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
            [500, { status: 500, errors: [{ message: testError }] }]
        ])
        const { store } = renderWithProviders(<ManagementSshKeyComponent />, fetchMock)
        await submitSshKey(searchTermTest, sshKeyTest)
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
                'http://127.0.0.1:8000/cosmae/api/user/ssh',
                {
                    method: 'PUT',
                    credentials: 'include',
                    body: {
                        id_user_persistent: idUserTest,
                        key: sshKeyTest
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

async function submitSshKey(
    userSearch: string,
    sshKey: string,
) {
    const user = userEvent.setup()
    const textBoxes = screen.getAllByRole('textbox')
    const searchBox = textBoxes[0]
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
    const keyInput = screen.getByLabelText('User SSH Key')
    await user.click(keyInput)
    await user.paste(sshKey)
    const button = screen.getByRole('button')
    await user.click(button)
}
