/**
 * @jest-environment jsdom
 */
import { RenderOptions, render, screen, waitFor } from '@testing-library/react'
import { TagType, newTagDefinition } from '../../column_menu/state'
import {
    UserPermissionGroup,
    UserState,
    newUserState,
    newPublicUserInfo
} from '../../user/state'
import userReducer from '../../user/slice'
import tagManagementReducer from '../slice'
import { configureStore } from '@reduxjs/toolkit'
import { PropsWithChildren } from 'react'
import { Provider } from 'react-redux'
import { ChangeOwnershipModal } from '../components'
import userEvent from '@testing-library/user-event'
import { TagManagementState } from '../state'
import { Remote, newRemote } from '../../util/state'
import {
    NotificationManager,
    NotificationType,
    notificationReducer
} from '../../util/notification/slice'

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: {
        user: UserState
        tagManagement: TagManagementState
        notification: NotificationManager
    }
}
export function renderWithProviders(
    ui: React.ReactElement,
    fetchMock: jest.Mock,
    {
        preloadedState = {
            user: newUserState({}),
            tagManagement: {
                ownershipRequests: newRemote({ petitioned: [], received: [] }),
                putOwnershipRequest: newRemote(undefined)
            },
            notification: { notificationList: [], notificationMap: {} }
        },
        ...renderOptions
    }: ExtendedRenderOptions = {}
) {
    const store = configureStore({
        reducer: {
            user: userReducer,
            tagManagement: tagManagementReducer,
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
function addResponseSequence(mock: jest.Mock, responses: [number, unknown][]) {
    for (const tpl of responses) {
        const [status_code, rsp] = tpl
        mock.mockImplementationOnce(
            jest.fn(() =>
                Promise.resolve({
                    status: status_code,
                    json: () => Promise.resolve(rsp)
                })
            ) as jest.Mock
        )
    }
}
describe('Ownership search', () => {
    const idUserTest = 'id-user-test'
    const usernameTest = 'user test'
    const permissionGroupTest = UserPermissionGroup.CONTRIBUTOR
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
    const idTagDefinitionTest = 'id-tag-def-test'
    const tagTypeTest = TagType.Inner
    const namePathTest = ['tag', 'path', 'test']
    const ownerTest = {
        username: usernameTest,
        idPersistent: idUserTest,
        permissionGroup: permissionGroupTest
    }
    const tagDefinitionTest = newTagDefinition({
        columnType: tagTypeTest,
        idPersistent: idTagDefinitionTest,
        idParentPersistent: undefined,
        curated: false,
        namePath: namePathTest,
        version: 4,
        owner: ownerTest,
        hidden: false
    })
    const stateWithUserSearchResults = {
        user: newUserState({
            userSearchResults: new Remote([userInfoTest, userInfoTest1])
        }),
        tagManagement: {
            ownershipRequests: newRemote({ petitioned: [], received: [] }),
            putOwnershipRequest: newRemote(undefined)
        },
        notification: { notificationList: [], notificationMap: {} }
    }
    const testError = 'You do not own this tag.'
    test('search', async () => {
        const fetchMock = jest.fn()
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
                tagDefinition={tagDefinitionTest}
                onClose={jest.fn()}
                updateTagDefinitionChangeCallback={jest.fn()}
            />,
            fetchMock
        )
        const user = userEvent.setup()
        const search = screen.getByRole('textbox')
        await user.type(search, 'ä%')
        await waitFor(() => {
            screen.getByText(usernameTest)
            screen.getByText(usernameTest1)
        })
        expect(fetchMock.mock.calls).toEqual([
            [
                'http://127.0.0.1:8000/cosmae/api/user/search/%C3%A4%25',
                { credentials: 'include', method: 'GET' }
            ]
        ])
    })
    test('can select user', async () => {
        const fetchMock = jest.fn()
        addResponseSequence(fetchMock, [
            [
                200,
                {
                    id_persistent: idTagDefinitionTest,
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
        const changeMock = jest.fn()
        renderWithProviders(
            <ChangeOwnershipModal
                tagDefinition={tagDefinitionTest}
                onClose={jest.fn()}
                updateTagDefinitionChangeCallback={changeMock}
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
                'M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z'
            )
            expect((paths[1] as Element).getAttribute('d')).toEqual(
                'M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z'
            )
        })
        expect(fetchMock.mock.calls).toEqual([
            [
                `http://127.0.0.1:8000/cosmae/api/tags/definitions/permissions/${idTagDefinitionTest}/owner/${idUserTest1}`,
                { credentials: 'include', method: 'POST' }
            ]
        ])
        expect(changeMock.mock.calls).toEqual([[tagDefinitionTest]])
    })
    test('dispatches error', async () => {
        const fetchMock = jest.fn()
        addResponseSequence(fetchMock, [
            [
                400,
                {
                    msg: testError
                }
            ]
        ])
        const changeMock = jest.fn()
        const { store } = renderWithProviders(
            <ChangeOwnershipModal
                tagDefinition={tagDefinitionTest}
                onClose={jest.fn()}
                updateTagDefinitionChangeCallback={changeMock}
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
                'M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z'
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
        expect(fetchMock.mock.calls).toEqual([
            [
                `http://127.0.0.1:8000/cosmae/api/tags/definitions/permissions/${idTagDefinitionTest}/owner/${idUserTest1}`,
                { credentials: 'include', method: 'POST' }
            ]
        ])
        expect(changeMock.mock.calls).toEqual([])
    })
    test('close', async () => {
        const fetchMock = jest.fn()
        const closeMock = jest.fn()
        renderWithProviders(
            <ChangeOwnershipModal
                tagDefinition={tagDefinitionTest}
                onClose={closeMock}
                updateTagDefinitionChangeCallback={jest.fn()}
            />,
            fetchMock
        )
        const closeButton = screen.getByRole('button')
        closeButton.click()
        expect(closeMock.mock.calls).toEqual([[]])
    })
})
