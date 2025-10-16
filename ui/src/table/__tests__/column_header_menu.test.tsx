/**
 * @vitest-environment jsdom
 */
vi.mock('@glideapps/glide-data-grid', async () => {
    const actual = await vi.importActual('@glideapps/glide-data-grid')
    return {
        __esmodule: true,
        DataEditor: vi
            .fn()
            .mockImplementation((props: object) => <MockTable {...props} />),
        CompactSelection: actual.CompactSelection
    }
})
import { vi, Mock } from 'vitest'
import {
    Column,
    ColumnType,
    newColumn,
    newColumnSelectionState
} from '../../column_menu/state'
import {
    UserPermissionGroup,
    newPublicUserInfo,
    newUserInfo,
    newUserState
} from '../../user/state'
import { waitFor, screen } from '@testing-library/react'
import { newNotificationManager } from '../../util/notification/slice'
import {
    displayTextColumn,
    displayTxtColumnId,
    justificationColumn,
    justificationColumnId,
    newColumnState,
    newTableState
} from '../state'
import { useAppSelector } from '../../hooks'
import { selectColumnStates } from '../selectors'
import { Button, Col, Row } from 'react-bootstrap'
import { RemoteDataTable } from '../components/table'
import {
    EditSessionParticipantType,
    newEditSession,
    newEditSessionParticipant,
    newEditSessionState
} from '../../session/state'
import { newRemote } from '../../util/state'
import { newEntityDetailsState } from '../../entity/state'
import { useColumnDefinitionList } from '../../column_menu/hooks'
import { newAuthState } from '../../auth/state'
import { renderWithProviders } from '../../util/tests/provider'
import { addResponseSequence } from '../../util/tests/response'
import { newContributionState } from '../../contribution/slice'
import { newContributionEntityState } from '../../contribution/entity/state'
import { newColumnDefinitionsContributionState } from '../../contribution/columns/state'
import { newEntityMergeRequestConflictsState } from '../../merge_request/entity/conflicts/state'

const rectangle = { x: 0, y: 1, width: 2, height: 4 }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MockTable(props: any) {
    const columnStates = useAppSelector(selectColumnStates)
    const columnDefinitions = useColumnDefinitionList(
        columnStates.map((columnState) => columnState.idColumnPersistent)
    )
    return (
        <div className="mock">
            <Col>
                <Row>
                    {columnDefinitions.map((columnDefinition, idx) => (
                        <Button
                            onClick={() => props.onHeaderMenuClick(idx, rectangle)}
                            key={columnDefinition.value?.idPersistent}
                            role="button"
                        >
                            {columnDefinition.value?.namePath.at(-1)}
                        </Button>
                    ))}
                </Row>
            </Col>
        </div>
    )
}

test('renders all menu entries', async () => {
    const fetchMock = vi.fn()
    addEntitiesResponse(fetchMock)
    addValueResponse(fetchMock)
    const { store } = renderWithProviders(<RemoteDataTable />, fetchMock, initialState)
    await waitFor(() => {
        const name = screen.getByRole('button', { name: columnNameTest })
        const state = store.getState()
        expect(state.table.columnStates).toEqual([
            displayTxtColumnState,
            justificationColumnState,
            columnState
        ])
        name.click()
    })
    await waitFor(() => {
        screen.getByRole('button', { name: 'Hide Column' })
        screen.getByRole('button', { name: 'Change Owner' })
        screen.getByRole('button', { name: 'Curate Column' })
        screen.getByRole('button', { name: 'close header menu' })
    })
})

test('no curation for unprivileged user', async () => {
    const fetchMock = vi.fn()
    addEntitiesResponse(fetchMock)
    addValueResponse(fetchMock)
    const { store } = renderWithProviders(<RemoteDataTable />, fetchMock, {
        preloadedState: {
            auth: newAuthState({
                user: newRemote(
                    newUserInfo({
                        ...userTest,
                        permissionGroup: UserPermissionGroup.CONTRIBUTOR,
                        email: 'mail@test.de',
                        namesPersonal: 'names',
                        columns: [columnTest]
                    })
                )
            }),
            contribution: newContributionState({}),
            contributionEntity: newContributionEntityState({}),
            contributionColumnDefinition: newColumnDefinitionsContributionState({}),
            displayTxtManagement: { columns: newRemote([]) },
            entityMergeRequestConflicts: newEntityMergeRequestConflictsState({}),
            user: newUserState({}),
            table: newTableState({}),
            columnSelection: initialColumnSelectionState,
            notification: newNotificationManager({}),
            tableSelection: { cols: [], rows: [], rowSelectionOrder: [] },
            editSession: newEditSessionState({}),
            entityDetails: newEntityDetailsState({})
        }
    })
    await waitFor(() => {
        const name = screen.getByRole('button', { name: columnNameTest })
        const state = store.getState()
        expect(state.table.columnStates).toEqual([
            displayTxtColumnState,
            justificationColumnState,
            columnState
        ])
        name.click()
    })
    await waitFor(() => {
        screen.getByRole('button', { name: 'Hide Column' })
        screen.getByRole('button', { name: 'Change Owner' })
        const curate = screen.queryByRole('button', { name: 'Curate Column' })
        expect(curate).toBeNull()
        screen.getByRole('button', { name: 'close header menu' })
    })
})

test('remove column from header menu', async () => {
    const fetchMock = vi.fn()
    addEntitiesResponse(fetchMock)
    addValueResponse(fetchMock)
    addResponseSequence(fetchMock, [[200, {}]])
    const { store } = renderWithProviders(<RemoteDataTable />, fetchMock, initialState)
    await waitFor(() => {
        const name = screen.getByRole('button', { name: columnNameTest })
        const state = store.getState()
        expect(state.table.columnStates).toEqual([
            displayTxtColumnState,
            justificationColumnState,
            columnState
        ])
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
        expect(state.table.columnStates).toEqual([displayTxtColumnState, justificationColumnState])
        expect(state.auth.user.value?.columns).toEqual([])
    })
    // TODO check menu entries
    expect(fetchMock.mock.calls.length).toEqual(3)
    expect(fetchMock.mock.calls.at(-1)).toEqual([
        'http://127.0.0.1:8000/cosmae/api/user/columns/column_id_test',
        { credentials: 'include', method: 'DELETE' }
    ])
})

test('change owner shows modal', async () => {
    const fetchMock = vi.fn()
    addEntitiesResponse(fetchMock)
    addValueResponse(fetchMock)
    const { store } = renderWithProviders(<RemoteDataTable />, fetchMock, initialState)
    await waitFor(() => {
        const name = screen.getByRole('button', { name: columnNameTest })
        name.click()
    })
    await waitFor(() => {
        const owner = screen.getByRole('button', { name: 'Change Owner' })
        owner.click()
    })
    await waitFor(() => {
        screen.getByText('Change Column Ownership')
    })
    expect(store.getState().table.ownershipChangeColumnIdPersistent).not.toBeUndefined()
})

function addEntitiesResponse(fetchMock: Mock) {
    addResponseSequence(fetchMock, [[200, { entity_list: [], next_offset: 0 }]])
}

function addValueResponse(fetchMock: Mock) {
    addResponseSequence(fetchMock, [[200, { value_list: [] }]])
}

const columnNameTest = 'column name test'
const idColumnPersistent = 'column_id_test'
const nameUserTest = 'user_test'
const idUserTest = 'id-user-test'
const userTest = newPublicUserInfo({
    idPersistent: idUserTest,
    username: nameUserTest,
    permissionGroup: UserPermissionGroup.COMMISSIONER
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
const justificationColumnState = newColumnState({
    idColumnPersistent: justificationColumnId
})
const displayTxtColumnState = newColumnState({
    idColumnPersistent: displayTxtColumnId
})
const columnState = newColumnState({ idColumnPersistent: idColumnPersistent })

const initialColumnSelectionState = newColumnSelectionState({
    columnsByIdPersistent: {
        [idColumnPersistent]: newRemote(columnTest),
        [justificationColumnId]: newRemote(justificationColumn),
        [displayTxtColumnId]: newRemote(displayTextColumn)
    }
})
const initialState = {
    preloadedState: {
        notification: newNotificationManager({}),
        table: newTableState({}),
        tableSelection: { rows: [], cols: [], rowSelectionOrder: [] },
        columnSelection: initialColumnSelectionState,
        contribution: newContributionState({}),
        contributionEntity: newContributionEntityState({}),
        contributionColumnDefinition: newColumnDefinitionsContributionState({}),
        displayTxtManagement: { columns: newRemote([]) },
        entityMergeRequestConflicts: newEntityMergeRequestConflictsState({}),
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
    }
}
