/**
 * @jest-environment jsdom
 */
jest.mock('@glideapps/glide-data-grid', () => {
    const actual = jest.requireActual('@glideapps/glide-data-grid')
    return {
        __esmodule: true,
        DataEditor: jest
            .fn()
            .mockImplementation((props: object) => <MockTable {...props} />),
        CompactSelection: actual.CompactSelection
    }
})
import { configureStore } from '@reduxjs/toolkit'
import { TagDefinition, TagType, newTagDefinition } from '../../column_menu/state'
import {
    UserPermissionGroup,
    UserState,
    newPublicUserInfo,
    newUserInfo,
    newUserState
} from '../../user/state'
import { PropsWithChildren } from 'react'
import { RenderOptions, render, waitFor, screen } from '@testing-library/react'
import {
    NotificationManager,
    newNotificationManager,
    notificationReducer
} from '../../util/notification/slice'
import { TableState, displayTextColumn, newColumnState, newTableState } from '../state'
import { TableSelectionState, tableSelectionSlice } from '../selection/slice'
import { userSlice } from '../../user/slice'
import { Provider } from 'react-redux'
import { useAppSelector } from '../../hooks'
import { selectColumnStates } from '../selectors'
import { Button, Col, Row } from 'react-bootstrap'
import { RemoteDataTable } from '../components/table'
import { tableReducer } from '../slice'

const rectangle = { x: 0, y: 1, width: 2, height: 4 }
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
function MockTable(props: any) {
    const columnStates = useAppSelector(selectColumnStates)
    return (
        <div className="mock">
            <Col>
                <Row>
                    {columnStates.map((columnState, idx) => (
                        <Button onClick={() => props.onHeaderMenuClick(idx, rectangle)}>
                            {columnState.tagDefinition.namePath.at(-1)}
                        </Button>
                    ))}
                </Row>
            </Col>
        </div>
    )
}

test('renders all menu entries', async () => {
    const fetchMock = jest.fn()
    addEntitiesResponse(fetchMock)
    addTagInstanceResponse(fetchMock)
    const { store } = renderWithProviders(<RemoteDataTable />, fetchMock)
    await waitFor(() => {
        const name = screen.getByRole('button', { name: columnNameTest })
        const state = store.getState()
        expect(state.table.columnStates).toEqual([displayTxtColumnState, columnState])
        name.click()
    })
    await waitFor(() => {
        screen.getByRole('button', { name: 'Hide Column' })
        screen.getByRole('button', { name: 'Change Owner' })
        screen.getByRole('button', { name: 'Curate Tag Definition' })
        screen.getByRole('button', { name: 'close header menu' })
    })
})

test('no curation for unprivileged user', async () => {
    const fetchMock = jest.fn()
    addEntitiesResponse(fetchMock)
    addTagInstanceResponse(fetchMock)
    const { store } = renderWithProviders(<RemoteDataTable />, fetchMock, {
        preloadedState: {
            user: newUserState({
                userInfo: newUserInfo({
                    ...userTest,
                    permissionGroup: UserPermissionGroup.CONTRIBUTOR,
                    email: 'mail@test.de',
                    namesPersonal: 'names',
                    columns: [tagDefTest]
                })
            }),
            table: newTableState({}),
            notification: newNotificationManager({}),
            tableSelection: { cols: [], rows: [], rowSelectionOrder: [] }
        }
    })
    await waitFor(() => {
        const name = screen.getByRole('button', { name: columnNameTest })
        const state = store.getState()
        expect(state.table.columnStates).toEqual([displayTxtColumnState, columnState])
        name.click()
    })
    await waitFor(() => {
        screen.getByRole('button', { name: 'Hide Column' })
        screen.getByRole('button', { name: 'Change Owner' })
        const curate = screen.queryByRole('button', { name: 'Curate Tag Definition' })
        expect(curate).toBeNull()
        screen.getByRole('button', { name: 'close header menu' })
    })
})

test('remove column from header menu', async () => {
    const fetchMock = jest.fn()
    addEntitiesResponse(fetchMock)
    addTagInstanceResponse(fetchMock)
    addResponseSequence(fetchMock, [[200, {}]])
    const { store } = renderWithProviders(<RemoteDataTable />, fetchMock)
    await waitFor(() => {
        const name = screen.getByRole('button', { name: columnNameTest })
        const state = store.getState()
        expect(state.table.columnStates).toEqual([displayTxtColumnState, columnState])
        name.click()
    })
    await waitFor(() => {
        const remove = screen.getByRole('button', { name: 'Hide Column' })
        remove.click()
    })
    await waitFor(() => {
        const remove = screen.queryByRole('button', { name: 'Hide Column' })
        expect(remove).toBeNull()
        const state = store.getState()
        expect(state.table.columnStates).toEqual([displayTxtColumnState])
        expect(state.user.userInfo?.columns).toEqual([])
    })
    // TODO check menu entries
    expect(fetchMock.mock.calls.length).toEqual(3)
    expect(fetchMock.mock.calls.at(-1)).toEqual([
        'http://127.0.0.1:8000/cosmae/api/user/tag_definitions/column_id_test',
        { credentials: 'include', method: 'DELETE' }
    ])
})

test('change owner shows modal', async () => {
    const fetchMock = jest.fn()
    addEntitiesResponse(fetchMock)
    addTagInstanceResponse(fetchMock)
    const { store } = renderWithProviders(<RemoteDataTable />, fetchMock)
    await waitFor(() => {
        const name = screen.getByRole('button', { name: columnNameTest })
        name.click()
    })
    await waitFor(() => {
        const owner = screen.getByRole('button', { name: 'Change Owner' })
        owner.click()
    })
    await waitFor(() => {
        screen.getByText('Change Tag Ownership')
    })
    expect(store.getState().table.ownershipChangeTagDefinition).not.toBeUndefined()
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addResponseSequence(fetchMock: jest.Mock, responses: [number, any][]) {
    for (const tpl of responses) {
        const [status_code, rsp] = tpl
        fetchMock.mockImplementationOnce(
            jest.fn(() =>
                Promise.resolve({
                    status: status_code,
                    json: () => Promise.resolve(rsp)
                })
            )
        )
    }
}

function addEntitiesResponse(fetchMock: jest.Mock) {
    addResponseSequence(fetchMock, [[200, { persons: [] }]])
}

function addTagInstanceResponse(fetchMock: jest.Mock) {
    addResponseSequence(fetchMock, [[200, { tag_instances: [] }]])
}

const columnNameTest = 'column name test'
const idTagDefPersistent = 'column_id_test'
const nameUserTest = 'user_test'
const idUserTest = 'id-user-test'
const userTest = newPublicUserInfo({
    idPersistent: idUserTest,
    username: nameUserTest,
    permissionGroup: UserPermissionGroup.COMMISSIONER
})
const tagDefTest: TagDefinition = newTagDefinition({
    namePath: [columnNameTest],
    idPersistent: idTagDefPersistent,
    idParentPersistent: undefined,
    columnType: TagType.String,
    curated: false,
    owner: userTest,
    version: 2,
    hidden: false
})
const displayTxtColumnState = newColumnState({ tagDefinition: displayTextColumn })
const columnState = newColumnState({ tagDefinition: tagDefTest })

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: {
        notification: NotificationManager
        table: TableState
        tableSelection: TableSelectionState
        user: UserState
    }
}

export function renderWithProviders(
    ui: React.ReactElement,
    fetchMock: jest.Mock,
    {
        preloadedState = {
            notification: newNotificationManager({}),
            table: newTableState({}),
            tableSelection: { rows: [], cols: [], rowSelectionOrder: [] },
            user: newUserState({
                userInfo: newUserInfo({
                    ...userTest,
                    email: 'mail@test.org',
                    namesPersonal: 'names personal',
                    columns: [tagDefTest]
                })
            })
        },
        ...renderOptions
    }: ExtendedRenderOptions = {}
) {
    const store = configureStore({
        reducer: {
            notification: notificationReducer,
            tableSelection: tableSelectionSlice.reducer,
            table: tableReducer,
            user: userSlice.reducer
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
