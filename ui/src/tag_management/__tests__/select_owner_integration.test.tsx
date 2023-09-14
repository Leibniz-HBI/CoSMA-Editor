/**
 * @jest-environment jsdom
 */
import { RenderOptions, render, screen, waitFor } from '@testing-library/react'
import { ColumnDefinition, ColumnType } from '../../column_menu/state'
import {
    PublicUserInfo,
    UserPermissionGroup,
    UserState,
    mkUserState
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

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: { user: UserState; tagManagement: TagManagementState }
}
export function renderWithProviders(
    ui: React.ReactElement,
    fetchMock: jest.Mock,
    {
        preloadedState = {
            user: mkUserState({}),
            tagManagement: {
                ownershipRequests: newRemote({ petitioned: [], received: [] }),
                putOwnershipRequest: newRemote(undefined)
            }
        },
        ...renderOptions
    }: ExtendedRenderOptions = {}
) {
    const store = configureStore({
        reducer: { user: userReducer, tagManagement: tagManagementReducer },
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
    const userInfoTest = new PublicUserInfo({
        idPersistent: idUserTest,
        userName: usernameTest,
        permissionGroup: permissionGroupTest
    })
    const idUserTest1 = 'id-user-test-1'
    const usernameTest1 = 'user test 1'
    const permissionGroupTest1 = UserPermissionGroup.EDITOR
    const userInfoTest1 = new PublicUserInfo({
        idPersistent: idUserTest1,
        userName: usernameTest1,
        permissionGroup: permissionGroupTest1
    })
    const idTagDefinitionTest = 'id-tag-def-test'
    const tagTypeTest = ColumnType.Inner
    const namePathTest = ['tag', 'path', 'test']
    const ownerTest = 'owner test'
    const tagDefinitionTest: ColumnDefinition = {
        columnType: tagTypeTest,
        idPersistent: idTagDefinitionTest,
        idParentPersistent: undefined,
        curated: false,
        namePath: namePathTest,
        version: 4,
        owner: ownerTest
    }
    const stateWithUserSearchResults = {
        user: mkUserState({
            userSearchResults: new Remote([userInfoTest, userInfoTest1])
        }),
        tagManagement: {
            ownershipRequests: newRemote({ petitioned: [], received: [] }),
            putOwnershipRequest: newRemote(undefined)
        }
    }
    const stateWithUserSearchResultsAndError = {
        user: mkUserState({
            userSearchResults: new Remote([userInfoTest, userInfoTest1])
        }),
        tagManagement: {
            ownershipRequests: newRemote({ petitioned: [], received: [] }),
            putOwnershipRequest: newRemote(
                {
                    idTagDefinitionPersistent: idTagDefinitionTest,
                    idUserPersistent: idUserTest1
                },
                false,
                'You do not own this tag'
            )
        }
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
                            user_name: usernameTest,
                            id_persistent: idUserTest,
                            permission_group: 'CONTRIBUTOR'
                        },
                        {
                            user_name: usernameTest1,
                            id_persistent: idUserTest1,
                            permission_group: 'EDITOR'
                        }
                    ]
                }
            ]
        ])
        await renderWithProviders(
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
                    owner: ownerTest,
                    version: 4,
                    type: 'INNER',
                    curated: false
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
    test('shows error', async () => {
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
            const checkmarkSpan = screen.getByTestId('put-ownership-error')
            const paths = checkmarkSpan.childNodes[0].childNodes
            expect(paths.length).toEqual(1)
            expect((paths[0] as Element).getAttribute('d')).toEqual(
                'M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z'
            )
            screen.getByText('Error')
            screen.getByText(testError)
        })
        expect(fetchMock.mock.calls).toEqual([
            [
                `http://127.0.0.1:8000/cosmae/api/tags/definitions/permissions/${idTagDefinitionTest}/owner/${idUserTest1}`,
                { credentials: 'include', method: 'POST' }
            ]
        ])
        expect(changeMock.mock.calls).toEqual([])
    })
    test('can close error', async () => {
        const fetchMock = jest.fn()
        renderWithProviders(
            <ChangeOwnershipModal
                tagDefinition={tagDefinitionTest}
                onClose={jest.fn()}
                updateTagDefinitionChangeCallback={jest.fn()}
            />,
            fetchMock,
            {
                preloadedState: stateWithUserSearchResultsAndError
            }
        )
        screen.getByText('Error')
        const closeButtons = screen.getAllByRole('button')
        expect(closeButtons.length).toEqual(2)
        closeButtons[1].click()
        await waitFor(() => {
            expect(screen.queryAllByText('Error').length).toEqual(0)
        })
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
