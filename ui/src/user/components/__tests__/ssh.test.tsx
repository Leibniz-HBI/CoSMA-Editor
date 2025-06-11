/**
 * @vitest-environment jsdom
 */
import { screen, waitFor } from '@testing-library/react'
import {
    addResponseSequence,
    expectError,
    expectNoNotification
} from '../../../util/tests/response'
import {
    idSshKey1,
    nameSshKey,
    nameSshKey1,
    noKeyApiResponse,
    renderWithProviders,
    sshKeyApi,
    sshKeyListApi,
    typeSshKey,
    typeSshKey1
} from '../../test_utils'
import { SshKeyPage } from '../ssh_key'
import userEvent from '@testing-library/user-event'

describe('get ssh key list', () => {
    test(' success', async () => {
        const fetchMock = vitest.fn()
        addResponseSequence(fetchMock, [[200, sshKeyListApi]])
        const { store } = renderWithProviders(<SshKeyPage />, fetchMock)
        await waitFor(() => {
            screen.getByText(nameSshKey)
            screen.getByText(nameSshKey1)
            screen.getByText(typeSshKey)
            screen.getByText(typeSshKey1)
        })
        expect(fetchMock.mock.calls).toEqual([
            ['http://127.0.0.1:8000/cosmae/api/user/ssh', { credentials: 'include' }]
        ])
        expect(store.getState().notification.notificationList).toEqual([])
    })
    test('error', async () => {
        const fetchMock = vitest.fn()
        const errorMsg = 'test error'
        addResponseSequence(fetchMock, [[500, { msg: errorMsg }]])
        const { store } = renderWithProviders(<SshKeyPage />, fetchMock)
        await waitFor(() => {
            expectError(store.getState(), errorMsg)
        })
    })
})
describe('add ssh key', () => {
    test('success', async () => {
        const fetchMock = vitest.fn()
        addResponseSequence(fetchMock, [
            [200, noKeyApiResponse],
            [200, sshKeyApi]
        ])
        const { store } = renderWithProviders(<SshKeyPage />, fetchMock)
        const user = userEvent.setup()
        const textBox = await waitFor(() => {
            return screen.getByRole('textbox')
        })
        await user.type(textBox, nameSshKey)
        const button = screen.getByRole('button')
        await user.click(button)
        await waitFor(() => {
            screen.getByText(nameSshKey)
            screen.getByText(typeSshKey)
        })
        expect(fetchMock.mock.calls).toEqual([
            ['http://127.0.0.1:8000/cosmae/api/user/ssh', { credentials: 'include' }],
            [
                'http://127.0.0.1:8000/cosmae/api/user/ssh',
                {
                    credentials: 'include',
                    method: 'PUT',
                    body: JSON.stringify({ key: nameSshKey })
                }
            ]
        ])
        expectNoNotification(store.getState())
    })
    test('error', async () => {
        const fetchMock = vitest.fn()
        const msg = 'test error'
        addResponseSequence(fetchMock, [
            [200, noKeyApiResponse],
            [500, { msg }]
        ])
        const { store } = renderWithProviders(<SshKeyPage />, fetchMock)
        const user = userEvent.setup()
        const textBox = await waitFor(() => {
            return screen.getByRole('textbox')
        })
        await user.type(textBox, nameSshKey)
        const button = screen.getByRole('button')
        await user.click(button)
        await waitFor(() => {
            expectError(store.getState(), msg)
        })
    })
})
describe('delete', () => {
    test('success', async () => {
        const fetchMock = vitest.fn()
        addResponseSequence(fetchMock, [
            [200, sshKeyListApi],
            [200, {}]
        ])
        const { store } = renderWithProviders(<SshKeyPage />, fetchMock)
        await waitFor(() => {
            const buttons = screen.getAllByRole('button')
            expect(buttons.length).toEqual(3)
            buttons[2].click()
        })
        await waitFor(() => {
            expect(screen.queryByText(nameSshKey1)).toBeNull()
            expect(screen.queryByText(typeSshKey1)).toBeNull()
            screen.getByText(typeSshKey)
            screen.getByText(nameSshKey)
        })
        expect(fetchMock.mock.calls).toEqual([
            ['http://127.0.0.1:8000/cosmae/api/user/ssh', { credentials: 'include' }],
            [
                'http://127.0.0.1:8000/cosmae/api/user/ssh/key/' + idSshKey1,
                { credentials: 'include', method: 'DELETE' }
            ]
        ])
        expectNoNotification(store.getState())
    })
    test('error', async () => {
        const fetchMock = vitest.fn()
        const msg = 'test error ssh deletion'
        addResponseSequence(fetchMock, [
            [200, sshKeyListApi],
            [500, { msg }]
        ])
        const { store } = renderWithProviders(<SshKeyPage />, fetchMock)
        await waitFor(() => {
            const buttons = screen.getAllByRole('button')
            expect(buttons.length).toEqual(3)
            buttons[2].click()
        })
        await waitFor(() => {
            screen.getByText(typeSshKey)
            screen.getByText(nameSshKey)
            screen.getByText(typeSshKey1)
            screen.getByText(nameSshKey1)
        })
        expect(fetchMock.mock.calls).toEqual([
            ['http://127.0.0.1:8000/cosmae/api/user/ssh', { credentials: 'include' }],
            [
                'http://127.0.0.1:8000/cosmae/api/user/ssh/key/' + idSshKey1,
                { credentials: 'include', method: 'DELETE' }
            ]
        ])
        expectError(store.getState(), msg)
    })
})
