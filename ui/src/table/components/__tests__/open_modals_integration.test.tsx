/*
 * @vitest-environment jsdom
 */
vi.mock('@glideapps/glide-data-grid', async () => {
    const actual = await vi.importActual('@glideapps/glide-data-grid')
    return {
        __esmodule: true,
        DataEditor: vi
            .fn()
            .mockImplementation((props: object) => <MockTable {...props} />),
        CompactSelection: actual.CompactSelection,
        GridCellKind: actual.GridCellKind
    }
})
import { vi, Mock } from 'vitest'
import { Button, Col, Row } from 'react-bootstrap'
import {
    Column,
    ColumnSelectionState,
    ColumnType,
    newColumn,
    newColumnSelectionState
} from '../../../column_menu/state'
import {
    UserPermissionGroup,
    UserState,
    newPublicUserInfo,
    newUserInfo,
    newUserState
} from '../../../user/state'
import {
    TableState,
    displayTextColumn,
    displayTxtColumnId,
    justificationColumn,
    justificationColumnId,
    newTableState
} from '../../state'
import {
    NotificationManager,
    newNotificationManager,
    notificationReducer
} from '../../../util/notification/slice'
import { RenderOptions, waitFor, render, screen } from '@testing-library/react'
import { tableReducer } from '../../slice'
import { configureStore } from '@reduxjs/toolkit'
import { PropsWithChildren } from 'react'
import { Provider } from 'react-redux'
import { RemoteDataTable } from '../table'
import { userSlice } from '../../../user/slice'
import { TableSelectionState, tableSelectionSlice } from '../../selection/slice'
import { selectShowSearch } from '../../selectors'
import { columnSelectionReducer } from '../../../column_menu/slice'
import { useAppSelector } from '../../../hooks'
import { EntityMergeRequestState } from '../../../merge_request/entity/state'
import { newRemote } from '../../../util/state'
import { entityMergeRequestsReducer } from '../../../merge_request/entity/slice'
import {
    EntityMergeRequestConflictsState,
    newEntityMergeRequestConflictsState
} from '../../../merge_request/entity/conflicts/state'
import { entityMergeRequestConflictSlice } from '../../../merge_request/entity/conflicts/slice'
import {
    EditSessionParticipantType,
    EditSessionState,
    newEditSession,
    newEditSessionParticipant,
    newEditSessionState
} from '../../../session/state'
import { editSessionReducer } from '../../../session/slice'
import { EntityDetailsState, newEntityDetailsState } from '../../../entity/state'
import { entityDetailsReducer } from '../../../entity/slice'
import { AuthState, newAuthState } from '../../../auth/state'
import { authReducer } from '../../../auth/slice'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MockTable(props: any) {
    const showSearch = useAppSelector(selectShowSearch)
    return (
        <div className="mock">
            <Col>
                <Row>{props.rightElement}</Row>
                <Row>
                    {showSearch ? (
                        <Button onClick={props.onSearchClose}>Hide Search</Button>
                    ) : (
                        <></>
                    )}
                </Row>
            </Col>
        </div>
    )
}

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: {
        notification: NotificationManager
        table: TableState
        tableSelection: TableSelectionState
        user: UserState
        auth: AuthState
        columnSelection: ColumnSelectionState
        entityMergeRequests: EntityMergeRequestState
        entityMergeRequestConflicts: EntityMergeRequestConflictsState
        entityDetails: EntityDetailsState
        editSession: EditSessionState
    }
}

export function renderWithProviders(
    ui: React.ReactElement,
    fetchMock: Mock,
    {
        preloadedState = {
            notification: newNotificationManager({}),
            table: newTableState({}),
            tableSelection: { rows: [0, 1], cols: [], rowSelectionOrder: [0, 1] },
            columnSelection: newColumnSelectionState({
                columnsByIdPersistent: {
                    [displayTxtColumnId]: newRemote(displayTextColumn),
                    [justificationColumnId]: newRemote(justificationColumn),
                    [idColumnPersistent]: newRemote(columnTest)
                }
            }),
            entityMergeRequests: { entityMergeRequests: newRemote([]) },
            entityMergeRequestConflicts: newEntityMergeRequestConflictsState({}),
            user: newUserState({}),
            auth: newAuthState({
                user: newRemote(
                    newUserInfo({
                        ...userTest,
                        email: 'mail@test.org',
                        namesPersonal: 'names personal',
                        columns: [columnTest]
                    })
                )
            }),
            entityDetails: newEntityDetailsState({}),
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
            user: userSlice.reducer,
            auth: authReducer,
            columnSelection: columnSelectionReducer,
            entityMergeRequests: entityMergeRequestsReducer,
            entityMergeRequestConflicts: entityMergeRequestConflictSlice.reducer,
            entityDetails: entityDetailsReducer,
            editSession: editSessionReducer
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

test('show and hide Search', async () => {
    const fetchMock = vi.fn()
    addInitialTable(fetchMock)
    const { store } = renderWithProviders(<RemoteDataTable />, fetchMock)
    await waitFor(() => {
        const searchButton = screen.getByRole('button', { name: 'Search' })
        searchButton.click()
    })
    await waitFor(() => {
        const state = store.getState()
        expect(state.table.showSearch).toBeTruthy()
        const searchButton = screen.getByRole('button', { name: 'Hide Search' })
        searchButton.click()
    })
    await waitFor(() => {
        const state = store.getState()
        expect(state.table.showSearch).toBeFalsy()
    })
})

test('show and hide add entity modal', async () => {
    const fetchMock = vi.fn()
    addInitialTable(fetchMock)
    const { store } = renderWithProviders(<RemoteDataTable />, fetchMock)
    await waitFor(() => {
        const newEntityText = screen.queryByText('Add new Entity')
        expect(newEntityText).toBeNull()
        const addButton = screen.getByRole('button', { name: 'Add Entity' })
        addButton.click()
    })
    await waitFor(() => {
        const state = store.getState()
        expect(state.table.showEntityAddDialog).toBeTruthy()
        screen.getByText('Add new Entity')
        const closeButton = screen.getByRole('button', { name: 'Close' })
        closeButton.click()
    })
    await waitFor(() => {
        const state = store.getState()
        expect(state.table.showEntityAddDialog).toBeFalsy()
    })
})
test('show and hide add column modal', async () => {
    const fetchMock = vi.fn()
    addInitialTable(fetchMock)
    addResponseSequence(fetchMock, [[200, [{ column_list: [] }]]])
    const { store } = renderWithProviders(<RemoteDataTable />, fetchMock)
    await waitFor(() => {
        const addButton = screen.getByRole('button', { name: '+' })
        addButton.click()
    })
    await waitFor(() => {
        const state = store.getState()
        expect(state.table.showColumnAddMenu).toBeTruthy()
        const closeButton = screen.getByRole('button', { name: 'Close' })
        closeButton.click()
    })
    await waitFor(() => {
        const state = store.getState()
        expect(state.table.showEntityAddDialog).toBeFalsy()
    })
})

test('show and hide entity merging modal', async () => {
    const fetchMock = vi.fn()
    addInitialTable(fetchMock)
    addResponseSequence(fetchMock, [[200, [{ column_list: [] }]]])
    const { store } = renderWithProviders(<RemoteDataTable />, fetchMock)
    await waitFor(() => {
        const addButton = screen.getByRole('button', { name: 'Merge Entities' })
        addButton.click()
    })
    await waitFor(() => {
        const state = store.getState()
        expect(state.table.showEntityMergingModal).toBeTruthy()
        const closeButton = screen.getByRole('button', { name: 'Close' })
        closeButton.click()
    })

    await waitFor(() => {
        const state = store.getState()
        expect(state.table.showEntityMergingModal).toBeFalsy()
    })
})

const idPersistent0 = 'test-id-0'
const idPersistent1 = 'test-id-1'
const version0 = 0
const version1 = 1
const displayTxt0 = 'test display txt 0'
const displayTxt1 = 'test display txt 1'
const test_entity_rsp_0 = {
    display_txt: displayTxt0,
    display_txt_details: 'display_txt_detail',
    id_persistent: idPersistent0,
    version: version0,
    disabled: false
}
const test_entity_rsp_1 = {
    display_txt: displayTxt1,
    display_txt_details: 'display_txt_detail',
    id_persistent: idPersistent1,
    version: version1,
    disabled: false
}

/**
 * We do not care about data in this test file.
 * @param fetchMock
 */
function addInitialTable(fetchMock: Mock) {
    addResponseSequence(fetchMock, [
        [
            200,
            {
                entity_list: [test_entity_rsp_0, test_entity_rsp_1],
                next_offset: version1 + 1
            }
        ],
        [200, { entity_list: [], next_offset: 0 }],
        [200, { value_list: [] }]
    ])
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addResponseSequence(fetchMock: Mock, responses: [number, any][]) {
    for (const tpl of responses) {
        const [status_code, rsp] = tpl
        fetchMock.mockImplementationOnce(
            vi.fn(() =>
                Promise.resolve({
                    status: status_code,
                    json: () => Promise.resolve(rsp)
                })
            )
        )
    }
}

const columnNameTest = 'column name test'
const idColumnPersistent = 'column_id_test'
const nameUserTest = 'user_test'
const idUserTest = 'id-user-test'
const userTest = newPublicUserInfo({
    idPersistent: idUserTest,
    username: nameUserTest,
    permissionGroup: UserPermissionGroup.EDITOR
})
const columnTest: Column = newColumn({
    namePath: [columnNameTest],
    idPersistent: idColumnPersistent,
    idParentPersistent: undefined,
    columnType: ColumnType.String,
    curated: false,
    owner: userTest,
    version: 2,
    hidden: false
})
