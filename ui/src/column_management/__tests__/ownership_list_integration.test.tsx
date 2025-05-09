/**
 * @vitest-environment jsdom
 */
import { vi, Mock } from 'vitest'
import {
    RenderOptions,
    getByText,
    render,
    screen,
    waitFor
} from '@testing-library/react'
import { ColumnType } from '../../column_menu/state'
import columnManagementReducer from '../slice'
import { configureStore } from '@reduxjs/toolkit'
import { PropsWithChildren } from 'react'
import { Provider } from 'react-redux'
import { ColumnManagementPage } from '../components'
import { ColumnManagementState } from '../state'
import { newRemote } from '../../util/state'

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: { columnManagement: ColumnManagementState }
}
export function renderWithProviders(
    ui: React.ReactElement,
    fetchMock: Mock,
    {
        preloadedState = {
            columnManagement: {
                ownershipRequests: newRemote({ petitioned: [], received: [] }),
                putOwnershipRequest: newRemote(undefined)
            }
        },
        ...renderOptions
    }: ExtendedRenderOptions = {}
) {
    const store = configureStore({
        reducer: { columnManagement: columnManagementReducer },
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
describe('Ownership Request List', () => {
    const idUserTest = 'id-user-test'
    const usernameTest = 'user test'
    const idUserTest1 = 'id-user-test-1'
    const usernameTest1 = 'user test 1'
    const userInfoApiTest = {
        id_persistent: idUserTest,
        username: usernameTest,
        permission_group: 'CONTRIBUTOR'
    }
    const userInfoApiTest1 = {
        id_persistent: idUserTest1,
        username: usernameTest1,
        permission_group: 'EDITOR'
    }
    const idColumnTest = 'id-column-test'
    const columnTypeTest = ColumnType.Inner
    const namePathTest = ['column', 'path', 'test']
    const ownerTest = 'owner test'
    const idColumnTest1 = 'id-column-test1'
    const columnTypeTest1 = ColumnType.Inner
    const namePathTest1 = ['column', 'path', 'test1']
    const ownerTest1 = 'owner test 1'
    const columnDefinitionApiTest = {
        type: columnTypeTest,
        id_persistent: idColumnTest,
        id_parent_persistent: undefined,
        curated: false,
        name_path: namePathTest,
        version: 4,
        owner: ownerTest
    }
    const idOwnershipTest = 'id-ownership-test'
    const idOwnershipTest1 = 'id-ownership-test1'
    function addOwnershipRequestsQuery(fetchMock: Mock) {
        addResponseSequence(fetchMock, [
            [
                200,
                {
                    received: [
                        {
                            petitioner: userInfoApiTest,
                            receiver: userInfoApiTest1,
                            column: {
                                name_path: namePathTest,
                                name: namePathTest[2],
                                id_persistent: idColumnTest,
                                version: 4,
                                owner: ownerTest,
                                type: columnTypeTest
                            },
                            id_persistent: idOwnershipTest
                        }
                    ],
                    petitioned: [
                        {
                            petitioner: userInfoApiTest1,
                            receiver: userInfoApiTest,
                            column: {
                                name_path: namePathTest1,
                                name: namePathTest1[2],
                                id_persistent: idColumnTest1,
                                version: 4,
                                owner: ownerTest1,
                                type: columnTypeTest1
                            },
                            id_persistent: idOwnershipTest1
                        }
                    ]
                }
            ]
        ])
    }
    test('get requests', async () => {
        const fetchMock = vi.fn()
        addOwnershipRequestsQuery(fetchMock)
        renderWithProviders(<ColumnManagementPage />, fetchMock)
        await waitFor(() => {
            const receivedLabel = screen.getByText(namePathTest[2])
            const receivedEntry =
                receivedLabel.parentElement?.parentElement?.parentElement?.parentElement
                    ?.parentElement
            expect(receivedEntry).not.toBeUndefined()
            expect(receivedEntry).not.toBeNull()
            if (receivedEntry !== undefined && receivedEntry !== null) {
                getByText(receivedEntry, 'Accept')
                getByText(receivedEntry, usernameTest)
            }
            const petitionedLabel = screen.getByText(namePathTest1[2])
            const petitionedEntry =
                petitionedLabel.parentElement?.parentElement?.parentElement
                    ?.parentElement?.parentElement
            expect(petitionedEntry).not.toBeUndefined()
            expect(petitionedEntry).not.toBeNull()
            if (petitionedEntry !== undefined && petitionedEntry !== null) {
                getByText(petitionedEntry, 'Withdraw')
                getByText(petitionedEntry, usernameTest)
            }
        })
        expect(fetchMock.mock.calls).toEqual([
            [
                'http://127.0.0.1:8000/cosmae/api/columns/permissions/ownership_requests',
                { credentials: 'include', method: 'GET' }
            ]
        ])
    })
    test('can accept', async () => {
        const fetchMock = vi.fn()
        addOwnershipRequestsQuery(fetchMock)
        addResponseSequence(fetchMock, [[200, columnDefinitionApiTest]])
        renderWithProviders(<ColumnManagementPage />, fetchMock)
        const acceptButton = await waitFor(() => {
            return screen.getByText('Accept')
        })
        acceptButton.click()
        await waitFor(() => {
            expect(screen.queryAllByText('Accept').length).toEqual(0)
        })
        expect(fetchMock.mock.calls).toEqual([
            [
                'http://127.0.0.1:8000/cosmae/api/columns/permissions/ownership_requests',
                { credentials: 'include', method: 'GET' }
            ],
            [
                `http://127.0.0.1:8000/cosmae/api/columns/permissions/owner/${idOwnershipTest}/accept`,
                { credentials: 'include', method: 'POST' }
            ]
        ])
    })
    test('can withdraw', async () => {
        const fetchMock = vi.fn()
        addOwnershipRequestsQuery(fetchMock)
        addResponseSequence(fetchMock, [[200, {}]])
        renderWithProviders(<ColumnManagementPage />, fetchMock)
        const acceptButton = await waitFor(() => {
            return screen.getByText('Withdraw')
        })
        acceptButton.click()
        await waitFor(() => {
            expect(screen.queryAllByText('Withdraw').length).toEqual(0)
        })
        expect(fetchMock.mock.calls).toEqual([
            [
                'http://127.0.0.1:8000/cosmae/api/columns/permissions/ownership_requests',
                { credentials: 'include', method: 'GET' }
            ],
            [
                `http://127.0.0.1:8000/cosmae/api/columns/permissions/owner/${idOwnershipTest1}`,
                { credentials: 'include', method: 'DELETE' }
            ]
        ])
    })
})
