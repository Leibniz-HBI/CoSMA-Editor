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
import {
    TagDefinition,
    TagSelectionState,
    TagType,
    newTagDefinition,
    newTagSelectionState
} from '../../column_menu/state'
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
import {
    TableState,
    displayTextColumn,
    displayTxtColumnId,
    newColumnState,
    newTableState
} from '../state'
import { TableSelectionState, tableSelectionSlice } from '../selection/slice'
import { userSlice } from '../../user/slice'
import { Provider } from 'react-redux'
import { useAppSelector } from '../../hooks'
import { selectColumnStates } from '../selectors'
import { Button, Col, Row } from 'react-bootstrap'
import { RemoteDataTable } from '../components/table'
import { tableReducer } from '../slice'
import {
    EditSessionParticipantType,
    EditSessionState,
    newEditSession,
    newEditSessionParticipant,
    newEditSessionState
} from '../../session/state'
import { newRemote } from '../../util/state'
import { editSessionReducer } from '../../session/slice'
import { EntityDetailsState, newEntityDetailsState } from '../../entity/state'
import { entityDetailsReducer } from '../../entity/slice'
import { tagSelectionSlice } from '../../column_menu/slice'
import { useTagDefinitionList } from '../../column_menu/hooks'
import { AuthState, newAuthState } from '../../auth/state'
import { authReducer } from '../../auth/slice'

const rectangle = { x: 0, y: 1, width: 2, height: 4 }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MockTable(props: any) {
    const columnStates = useAppSelector(selectColumnStates)
    const columnDefinitions = useTagDefinitionList(
        columnStates.map((columnState) => columnState.idTagDefinitionPersistent)
    )
    return (
        <div className="mock">
            <Col>
                <Row>
                    {columnDefinitions.map((columnDefinition, idx) => (
                        <Button onClick={() => props.onHeaderMenuClick(idx, rectangle)}>
                            {columnDefinition.value?.namePath.at(-1)}
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
            auth: newAuthState({
                user: newRemote(
                    newUserInfo({
                        ...userTest,
                        permissionGroup: UserPermissionGroup.CONTRIBUTOR,
                        email: 'mail@test.de',
                        namesPersonal: 'names',
                        columns: [tagDefTest]
                    })
                )
            }),
            user: newUserState({}),
            table: newTableState({}),
            tagSelection: initialTagSelectionState,
            notification: newNotificationManager({}),
            tableSelection: { cols: [], rows: [], rowSelectionOrder: [] },
            editSession: newEditSessionState({}),
            entityDetails: newEntityDetailsState({})
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
        expect(state.auth.user.value?.columns).toEqual([])
    })
    // TODO check menu entries
    expect(fetchMock.mock.calls.length).toEqual(3)
    expect(fetchMock.mock.calls.at(-1)).toEqual([
        'http://127.0.0.1/api/user/tag_definitions/column_id_test',
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
    expect(
        store.getState().table.ownershipChangeTagDefinitionIdPersistent
    ).not.toBeUndefined()
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
    addResponseSequence(fetchMock, [[200, { entity_list: [] }]])
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
const displayTxtColumnState = newColumnState({
    idTagDefinitionPersistent: displayTxtColumnId
})
const columnState = newColumnState({ idTagDefinitionPersistent: idTagDefPersistent })

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: {
        notification: NotificationManager
        table: TableState
        tableSelection: TableSelectionState
        tagSelection: TagSelectionState
        user: UserState
        auth: AuthState
        editSession: EditSessionState
        entityDetails: EntityDetailsState
    }
}

const initialTagSelectionState = newTagSelectionState({
    tagDefinitionsByIdPersistent: {
        [idTagDefPersistent]: newRemote(tagDefTest),
        [displayTxtColumnId]: newRemote(displayTextColumn)
    }
})
export function renderWithProviders(
    ui: React.ReactElement,
    fetchMock: jest.Mock,
    {
        preloadedState = {
            notification: newNotificationManager({}),
            table: newTableState({}),
            tableSelection: { rows: [], cols: [], rowSelectionOrder: [] },
            tagSelection: initialTagSelectionState,
            auth: newAuthState({
                user: newRemote(
                    newUserInfo({
                        ...userTest,
                        email: 'mail@test.org',
                        namesPersonal: 'names personal',
                        columns: [tagDefTest]
                    })
                )
            }),
            user: newUserState({}),
            editSession: newEditSessionState({
                currentEditSession: newRemote(
                    newEditSession({
                        idPersistent: 'id-session-test',
                        name: 'edit session for tests',
                        owner: newEditSessionParticipant({
                            type: EditSessionParticipantType.internal,
                            name: 'edit session owner test',
                            id: idUserTest
                        }),
                        participantList: [],
                        participantMap: {}
                    })
                )
            }),
            entityDetails: newEntityDetailsState({})
        },
        ...renderOptions
    }: ExtendedRenderOptions = {}
) {
    const store = configureStore({
        reducer: {
            notification: notificationReducer,
            tableSelection: tableSelectionSlice.reducer,
            table: tableReducer,
            tagSelection: tagSelectionSlice.reducer,
            auth: authReducer,
            user: userSlice.reducer,
            editSession: editSessionReducer,
            entityDetails: entityDetailsReducer
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
