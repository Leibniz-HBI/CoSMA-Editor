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
import {screen, waitFor} from '@testing-library/react'
import { Button, Col, Row } from 'react-bootstrap'
import {
    Column,
    ColumnType,
    newColumn,
    newColumnSelectionState
} from '../../../column_menu/state'
import {
    UserPermissionGroup,
    newPublicUserInfo,
    newUserInfo
} from '../../../user/state'
import {
    displayTextColumn,
    displayTxtColumnId,
    justificationColumn,
    justificationColumnId
} from '../../state'
import { selectShowSearch } from '../../selectors'
import { useAppSelector } from '../../../hooks'
import { newRemote } from '../../../util/state'
import {
    EditSessionParticipantType,
    newEditSession,
    newEditSessionParticipant,
    newEditSessionState
} from '../../../session/state'
import { newAuthState } from '../../../auth/state'
import { emptyState, renderWithProviders } from '../../../util/tests/provider'
import { RemoteDataTable } from '../table'
import { addResponseSequence} from '../../../util/tests/response'

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


test('show and hide Search', async () => {
    const fetchMock = vi.fn()
    addInitialTable(fetchMock)
    const { store } = renderWithProviders(<RemoteDataTable />, fetchMock, preloadedState)
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
    const { store } = renderWithProviders(<RemoteDataTable />, fetchMock, preloadedState)
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
    const { store } = renderWithProviders(<RemoteDataTable />, fetchMock, preloadedState)
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
    const { store } = renderWithProviders(<RemoteDataTable />, fetchMock, preloadedState)
    await waitFor(() => {
        const state = store.getState()
        expect(state.table.showEntityMergingModal).toBeFalsy()
        const addButton = screen.getByRole('button', { name: 'Merge Entities' })
        addButton.click()
    })
    await waitFor(async () => {
        const state = store.getState()
        expect(state.table.showEntityMergingModal).toBeTruthy()
        const closeButton = await screen.findByRole('button', { name: 'Close' })
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

const initialState = {...emptyState,
            tableSelection: { rows: [0, 1], cols: [], rowSelectionOrder: [0, 1] },
            columnSelection: newColumnSelectionState({
                columnsByIdPersistent: {
                    [displayTxtColumnId]: newRemote(displayTextColumn),
                    [justificationColumnId]: newRemote(justificationColumn),
                    [idColumnPersistent]: newRemote(columnTest)
                }
            }),
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
}

const preloadedState= {preloadedState:initialState}
