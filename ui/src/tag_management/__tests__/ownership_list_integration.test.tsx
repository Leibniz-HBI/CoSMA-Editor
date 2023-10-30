/**
 * @jest-environment jsdom
 */
import {
    RenderOptions,
    getByText,
    render,
    screen,
    waitFor
} from '@testing-library/react'
import { TagType } from '../../column_menu/state'
import tagManagementReducer from '../slice'
import { configureStore } from '@reduxjs/toolkit'
import { PropsWithChildren } from 'react'
import { Provider } from 'react-redux'
import { TagManagementPage } from '../components'
import { TagManagementState } from '../state'
import { newRemote } from '../../util/state'

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: { tagManagement: TagManagementState }
}
export function renderWithProviders(
    ui: React.ReactElement,
    fetchMock: jest.Mock,
    {
        preloadedState = {
            tagManagement: {
                ownershipRequests: newRemote({ petitioned: [], received: [] }),
                putOwnershipRequest: newRemote(undefined)
            }
        },
        ...renderOptions
    }: ExtendedRenderOptions = {}
) {
    const store = configureStore({
        reducer: { tagManagement: tagManagementReducer },
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
describe('Ownership Request List', () => {
    const idUserTest = 'id-user-test'
    const usernameTest = 'user test'
    const idUserTest1 = 'id-user-test-1'
    const usernameTest1 = 'user test 1'
    const userInfoApiTest = {
        id_persistent: idUserTest,
        user_name: usernameTest,
        permission_group: 'CONTRIBUTOR'
    }
    const userInfoApiTest1 = {
        id_persistent: idUserTest1,
        user_name: usernameTest1,
        permission_group: 'EDITOR'
    }
    const idTagDefinitionTest = 'id-tag-def-test'
    const tagTypeTest = TagType.Inner
    const namePathTest = ['tag', 'path', 'test']
    const ownerTest = 'owner test'
    const idTagDefinitionTest1 = 'id-tag-def-test1'
    const tagTypeTest1 = TagType.Inner
    const namePathTest1 = ['tag', 'path', 'test1']
    const ownerTest1 = 'owner test 1'
    const tagDefinitionApiTest = {
        type: tagTypeTest,
        id_persistent: idTagDefinitionTest,
        id_parent_persistent: undefined,
        curated: false,
        name_path: namePathTest,
        version: 4,
        owner: ownerTest
    }
    const idOwnershipTest = 'id-ownership-test'
    const idOwnershipTest1 = 'id-ownership-test1'
    function addOwnershipRequestsQuery(fetchMock: jest.Mock) {
        addResponseSequence(fetchMock, [
            [
                200,
                {
                    received: [
                        {
                            petitioner: userInfoApiTest,
                            receiver: userInfoApiTest1,
                            tag_definition: {
                                name_path: namePathTest,
                                name: namePathTest[2],
                                id_persistent: idTagDefinitionTest,
                                version: 4,
                                owner: ownerTest,
                                type: tagTypeTest
                            },
                            id_persistent: idOwnershipTest
                        }
                    ],
                    petitioned: [
                        {
                            petitioner: userInfoApiTest1,
                            receiver: userInfoApiTest,
                            tag_definition: {
                                name_path: namePathTest1,
                                name: namePathTest1[2],
                                id_persistent: idTagDefinitionTest1,
                                version: 4,
                                owner: ownerTest1,
                                type: tagTypeTest1
                            },
                            id_persistent: idOwnershipTest1
                        }
                    ]
                }
            ]
        ])
    }
    test('get requests', async () => {
        const fetchMock = jest.fn()
        addOwnershipRequestsQuery(fetchMock)
        renderWithProviders(<TagManagementPage />, fetchMock)
        await waitFor(() => {
            const receivedLabel = screen.getByText('-> ' + namePathTest[2])
            const receivedEntry =
                receivedLabel.parentElement?.parentElement?.parentElement?.parentElement
            expect(receivedEntry).not.toBeUndefined()
            expect(receivedEntry).not.toBeNull()
            if (receivedEntry !== undefined && receivedEntry !== null) {
                getByText(receivedEntry, 'Accept')
                getByText(receivedEntry, usernameTest)
            }
            const petitionedLabel = screen.getByText('-> ' + namePathTest1[2])
            const petitionedEntry =
                petitionedLabel.parentElement?.parentElement?.parentElement
                    ?.parentElement
            expect(petitionedEntry).not.toBeUndefined()
            expect(petitionedEntry).not.toBeNull()
            if (petitionedEntry !== undefined && petitionedEntry !== null) {
                getByText(petitionedEntry, 'Withdraw')
                getByText(petitionedEntry, usernameTest)
            }
        })
        expect(fetchMock.mock.calls).toEqual([
            [
                'http://127.0.0.1:8000/cosmae/api/tags/definitions/permissions/ownership_requests',
                { credentials: 'include', method: 'GET' }
            ]
        ])
    })
    test('can accept', async () => {
        const fetchMock = jest.fn()
        addOwnershipRequestsQuery(fetchMock)
        addResponseSequence(fetchMock, [[200, tagDefinitionApiTest]])
        renderWithProviders(<TagManagementPage />, fetchMock)
        const acceptButton = await waitFor(() => {
            return screen.getByText('Accept')
        })
        acceptButton.click()
        await waitFor(() => {
            expect(screen.queryAllByText('Accept').length).toEqual(0)
        })
        expect(fetchMock.mock.calls).toEqual([
            [
                'http://127.0.0.1:8000/cosmae/api/tags/definitions/permissions/ownership_requests',
                { credentials: 'include', method: 'GET' }
            ],
            [
                `http://127.0.0.1:8000/cosmae/api/tags/definitions/permissions/owner/${idOwnershipTest}/accept`,
                { credentials: 'include', method: 'POST' }
            ]
        ])
    })
    test('can withdraw', async () => {
        const fetchMock = jest.fn()
        addOwnershipRequestsQuery(fetchMock)
        addResponseSequence(fetchMock, [[200, {}]])
        renderWithProviders(<TagManagementPage />, fetchMock)
        const acceptButton = await waitFor(() => {
            return screen.getByText('Withdraw')
        })
        acceptButton.click()
        await waitFor(() => {
            expect(screen.queryAllByText('Withdraw').length).toEqual(0)
        })
        expect(fetchMock.mock.calls).toEqual([
            [
                'http://127.0.0.1:8000/cosmae/api/tags/definitions/permissions/ownership_requests',
                { credentials: 'include', method: 'GET' }
            ],
            [
                `http://127.0.0.1:8000/cosmae/api/tags/definitions/permissions/owner/${idOwnershipTest1}`,
                { credentials: 'include', method: 'DELETE' }
            ]
        ])
    })
})
