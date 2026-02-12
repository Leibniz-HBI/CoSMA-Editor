/**
 * @vitest-environment jsdom
 */
import { vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { ColumnType, newColumn, newColumnSelectionState } from '../../column_menu/state'
import { UserPermissionGroup, newUserState, newPublicUserInfo } from '../../user/state'
import { ChangeOwnershipModal } from '../components'
import userEvent from '@testing-library/user-event'
import { newRemote } from '../../util/state'
import { NotificationType } from '../../util/notification/slice'
import {
    displayTextColumn,
    displayTxtColumnId,
    justificationColumn,
    justificationColumnId
} from '../../table/state'
import { addResponseSequence, expectFetchCallList } from '../../util/tests/response'
import { emptyState, renderWithProviders } from '../../util/tests/provider'

const idUserTest = 'id-user-test'
const usernameTest = 'user test'
const permissionGroupTest = UserPermissionGroup.CONTRIBUTOR
const idTColumnTest = 'id-column-test'
const columnTypeTest = ColumnType.Inner
const namePathTest = ['column', 'path', 'test']
const ownerTest = {
    username: usernameTest,
    idPersistent: idUserTest,
    permissionGroup: permissionGroupTest
}
const columnTest = newColumn({
    columnType: columnTypeTest,
    idPersistent: idTColumnTest,
    idParentPersistent: undefined,
    curated: false,
    namePath: namePathTest,
    version: 4,
    owner: ownerTest,
    hidden: false
})
const initialColumnSelectionState = newColumnSelectionState({
    columnsByIdPersistent: {
        [displayTxtColumnId]: newRemote(displayTextColumn),
        [justificationColumnId]: newRemote(justificationColumn),
        [idTColumnTest]: newRemote(columnTest)
    }
})

describe('Ownership search', () => {
    const userInfoTest = newPublicUserInfo({
        idPersistent: idUserTest,
        username: usernameTest,
        permissionGroup: permissionGroupTest
    })
    const idUserTest1 = 'id-user-test-1'
    const usernameTest1 = 'user test 1'
    const permissionGroupTest1 = UserPermissionGroup.EDITOR
    const userInfoTest1 = newPublicUserInfo({
        idPersistent: idUserTest1,
        username: usernameTest1,
        permissionGroup: permissionGroupTest1
    })
    const stateWithUserSearchResults = {
        ...emptyState,
        user: newUserState({
            userSearchResults: newRemote([userInfoTest, userInfoTest1])
        }),
        columnManagement: {
            ownershipRequests: newRemote({ petitioned: [], received: [] }),
            putOwnershipRequest: newRemote(undefined)
        },
        columnSelection: initialColumnSelectionState,
        notification: { notificationList: [], notificationMap: {} }
    }
    const testError = 'You do not own this column.'
    test('search', async () => {
        const fetchMock = vi.fn()
        addResponseSequence(fetchMock, [
            [
                200,
                {
                    contains_complete_info: false,
                    results: [
                        {
                            username: usernameTest,
                            id_persistent: idUserTest,
                            permission_group: 'CONTRIBUTOR'
                        },
                        {
                            username: usernameTest1,
                            id_persistent: idUserTest1,
                            permission_group: 'EDITOR'
                        }
                    ]
                }
            ]
        ])
        renderWithProviders(
            <ChangeOwnershipModal
                idColumnPersistent={idTColumnTest}
                onClose={vi.fn()}
            />,
            fetchMock,
            {
                preloadedState: {
                    ...emptyState,
                    columnSelection: initialColumnSelectionState
                }
            }
        )
        const user = userEvent.setup()
        const search = screen.getByRole('textbox')
        await user.type(search, 'ä%')
        await waitFor(() => {
            screen.getByText(usernameTest)
            screen.getByText(usernameTest1)
        })
        await expectFetchCallList(fetchMock.mock.calls, [
            [
                'http://127.0.0.1:8000/cosmae/api/user/search/%C3%A4%25',
                { credentials: 'include', method: 'GET' }
            ]
        ])
    })
    test('can select user', async () => {
        const fetchMock = vi.fn()
        addResponseSequence(fetchMock, [
            [
                200,
                {
                    id_persistent: idTColumnTest,
                    name_path: namePathTest,
                    name: namePathTest[2],
                    owner: {
                        id_persistent: idUserTest,
                        username: usernameTest,
                        permission_group: 'CONTRIBUTOR'
                    },
                    version: 4,
                    type: 'INNER',
                    hidden: false,
                    curated: false,
                    disabled: false
                }
            ]
        ])
        renderWithProviders(
            <ChangeOwnershipModal
                idColumnPersistent={idTColumnTest}
                onClose={vi.fn()}
            />,
            fetchMock,
            {
                preloadedState: stateWithUserSearchResults
            }
        )
        const user = userEvent.setup()
        const user1text = screen.getByText(usernameTest1)
        await user.click(user1text)
        await waitFor(() => {
            const checkmarkSpan = screen.getByTestId('put-ownership-success')
            const paths = checkmarkSpan.childNodes[0].childNodes
            expect(paths.length).toEqual(2)
            expect((paths[0] as Element).getAttribute('d')).toEqual(
                'M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16'
            )
            expect((paths[1] as Element).getAttribute('d')).toEqual(
                'm10.97 4.97-.02.022-3.473 4.425-2.093-2.094a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05'
            )
        })
        await expectFetchCallList(fetchMock.mock.calls, [
            [
                `http://127.0.0.1:8000/cosmae/api/columns/permissions/${idTColumnTest}/owner/${idUserTest1}`,
                { credentials: 'include', method: 'POST' }
            ]
        ])
    })
    test('dispatches error', async () => {
        const fetchMock = vi.fn()
        addResponseSequence(fetchMock, [
            [
                400,
                {
                    msg: testError
                }
            ]
        ])
        const { store } = renderWithProviders(
            <ChangeOwnershipModal
                idColumnPersistent={idTColumnTest}
                onClose={vi.fn()}
            />,
            fetchMock,
            {
                preloadedState: stateWithUserSearchResults
            }
        )
        const user = userEvent.setup()
        const user1text = screen.getByText(usernameTest1)
        await user.click(user1text)
        await waitFor(() => {
            const checkmarkSpan = screen.getByTestId('put-ownership-error')
            const paths = checkmarkSpan.childNodes[0].childNodes
            expect(paths.length).toEqual(1)
            expect((paths[0] as Element).getAttribute('d')).toEqual(
                'M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293z'
            )
        })
        await waitFor(() => {
            const state = store.getState()
            const notifications = state.notification.notificationList
            expect(notifications.length).toEqual(1)
            const notification = notifications[0]
            expect(notification.type).toEqual(NotificationType.Error)
            expect(notification.msg).toEqual(testError)
        })
        await expectFetchCallList(fetchMock.mock.calls, [
            [
                `http://127.0.0.1:8000/cosmae/api/columns/permissions/${idTColumnTest}/owner/${idUserTest1}`,
                { credentials: 'include', method: 'POST' }
            ]
        ])
    })
    test('close', async () => {
        const fetchMock = vi.fn()
        const closeMock = vi.fn()
        renderWithProviders(
            <ChangeOwnershipModal
                idColumnPersistent={idTColumnTest}
                onClose={closeMock}
            />,
            fetchMock
        )
        const closeButton = screen.getByRole('button')
        closeButton.click()
        expect(closeMock.mock.calls).toEqual([[]])
    })
})
