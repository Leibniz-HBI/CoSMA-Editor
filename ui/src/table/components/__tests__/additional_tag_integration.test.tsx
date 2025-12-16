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
import { Button } from 'react-bootstrap'
import { newColumnSelectionState } from '../../../column_menu/state'
import {
    UserPermissionGroup,
    newPublicUserInfo,
    newUserInfo
} from '../../../user/state'
import {
    displayTextColumn,
    displayTxtColumnId,
    justificationColumn,
    justificationColumnId,
    newColumnState,
    newTableState
} from '../../state'
import {
    newEntity,
    newEntityDetails,
    newEntityDetailsState
} from '../../../entity/state'
import { waitFor, screen } from '@testing-library/react'
import { showColumnAddMenu } from '../../slice'
import { RemoteDataTable } from '../table'
import { newRemote } from '../../../util/state'
import {
    EditSessionParticipantType,
    newEditSession,
    newEditSessionParticipant,
    newEditSessionState
} from '../../../session/state'
import { useAppDispatch } from '../../../hooks'
import { newAuthState } from '../../../auth/state'
import { emptyState, renderWithProviders } from '../../../util/tests/provider'
import { addResponseSequence, expectFetchCallList } from '../../../util/tests/response'
import { act } from 'react'

test('get descendant column success', async () => {
    const fetchMock = vi.fn()
    addEntitiesResponse(fetchMock)
    addHierarchyAndDescendantsResponse(fetchMock)
    addValueResponse(fetchMock)
    addUserProfileResponse(fetchMock)
    const { store } = renderWithProviders(<RemoteDataTable />, fetchMock, initialState)
    await openColumnModal()
    await selectColumn()
    await waitFor(() => {
        const state = store.getState()
        expect(state.notification.notificationList).toEqual([])
        expect(state.table).toEqual(
            newTableState({
                entityIdList: [idPersistent0, idPersistent1],
                isLoading: false,
                columnIndices: {
                    display_txt_id: 0,
                    [justificationColumnId]: 1,
                    [idColumnPersistent]: 2
                },
                columnStates: [
                    displayTxtColumnState,
                    justificationColumnState,
                    columnColumnState
                ],
                showEntityJustifications: true
            })
        )
    })
    await expectFetchCallList(fetchMock.mock.calls, [
        [
            'http://127.0.0.1:8000/cosmae/api/entities/filter',
            {
                credentials: 'include',
                body: { offset: 0, limit: 1000 },
                headers: { 'Content-Type': 'application/json' },
                method: 'POST'
            }
        ],
        [
            'http://127.0.0.1:8000/cosmae/api/entities/filter',
            {
                credentials: 'include',
                body: { offset: next_offset, limit: 1000 },
                headers: { 'Content-Type': 'application/json' },
                method: 'POST'
            }
        ],
        [
            'http://127.0.0.1:8000/cosmae/api/columns/children',
            {
                body: {},
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                method: 'POST'
            }
        ],
        [
            'http://127.0.0.1:8000/cosmae/api/columns/children',
            {
                body: {
                    id_parent_persistent: idColumnParentPersistent
                },
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                method: 'POST'
            }
        ],
        [
            'http://127.0.0.1:8000/cosmae/api/columns/children',
            {
                body: {
                    id_parent_persistent: idColumnPersistent
                },
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                method: 'POST'
            }
        ],
        [
            `http://127.0.0.1:8000/cosmae/api/columns/${idColumnParentPersistent}/descendants`,
            { credentials: 'include' }
        ],
        [
            'http://127.0.0.1:8000/cosmae/api/values/chunk',
            {
                credentials: 'include',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: {
                    id_column_persistent: idColumnPersistent,
                    offset: 0,
                    limit: 5000
                }
            }
        ],
        [
            'http://127.0.0.1:8000/cosmae/api/user/columns/append/column_id_test',
            {
                credentials: 'include',
                method: 'POST'
            }
        ]
    ])
})

test('get descendant column with history success', async () => {
    const fetchMock = vi.fn()
    addEntitiesResponse(fetchMock)
    addHierarchyAndDescendantsResponse(fetchMock)
    addValueResponse(fetchMock)
    addUserProfileResponse(fetchMock)
    const historyDate = new Date(2004, 3, 7)
    const historyDateString = historyDate.toISOString()
    const { store } = renderWithProviders(<RemoteDataTable />, fetchMock, {
        preloadedState: {
            ...initialState.preloadedState,
            table: {
                ...initialState.preloadedState.table,
                historyDateSinceEpoch: historyDate.getTime()
            }
        }
    })
    await openColumnModal()
    await selectColumn()
    await waitFor(() => {
        const state = store.getState()
        expect(state.notification.notificationList).toEqual([])
        expect(state.table).toEqual(
            newTableState({
                entityIdList: [idPersistent0, idPersistent1],
                isLoading: false,
                columnIndices: {
                    display_txt_id: 0,
                    [justificationColumnId]: 1,
                    [idColumnPersistent]: 2
                },
                historyDateSinceEpoch: historyDate.getTime(),
                columnStates: [
                    displayTxtColumnState,
                    justificationColumnState,
                    columnColumnState
                ],
                showEntityJustifications: true
            })
        )
    })
    await expectFetchCallList(fetchMock.mock.calls, [
        [
            'http://127.0.0.1:8000/cosmae/api/entities/filter',
            {
                credentials: 'include',
                body: {
                    up_until_time: historyDateString,
                    offset: 0,
                    limit: 1000
                },
                headers: { 'Content-Type': 'application/json' },
                method: 'POST'
            }
        ],
        [
            'http://127.0.0.1:8000/cosmae/api/entities/filter',
            {
                credentials: 'include',
                body: {
                    up_until_time: historyDateString,
                    offset: next_offset,
                    limit: 1000
                },
                headers: { 'Content-Type': 'application/json' },
                method: 'POST'
            }
        ],
        [
            'http://127.0.0.1:8000/cosmae/api/columns/children',
            {
                body: { up_until_time: historyDateString },
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                method: 'POST'
            }
        ],
        [
            'http://127.0.0.1:8000/cosmae/api/columns/children',
            {
                body: {
                    id_parent_persistent: idColumnParentPersistent,
                    up_until_time: historyDateString
                },
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                method: 'POST'
            }
        ],
        [
            'http://127.0.0.1:8000/cosmae/api/columns/children',
            {
                body: {
                    id_parent_persistent: idColumnPersistent,
                    up_until_time: historyDateString
                },
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                method: 'POST'
            }
        ],
        [
            `http://127.0.0.1:8000/cosmae/api/columns/${idColumnParentPersistent}/descendants?up_until_time=${historyDateString.replaceAll(
                ':',
                '%3A'
            )}`,
            { credentials: 'include' }
        ],
        [
            'http://127.0.0.1:8000/cosmae/api/values/chunk',
            {
                credentials: 'include',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: {
                    id_column_persistent: idColumnPersistent,
                    up_until_time: historyDateString,
                    offset: 0,
                    limit: 5000
                }
            }
        ],
        [
            'http://127.0.0.1:8000/cosmae/api/user/columns/append/column_id_test',
            {
                credentials: 'include',
                method: 'POST'
            }
        ]
    ])
})

async function openColumnModal() {
    await waitFor(() => {
        const button = screen.getByRole('button', { name: 'Modal' })
        act(() => {
            button.click()
        })
    })
}

async function selectColumn() {
    await waitFor(() => {
        screen.getByText(columnNameTest)
        const columnLabelParents = screen.getAllByText(columnNameParent)
        const tailElement =
            columnLabelParents[0].parentElement?.parentElement?.parentElement
                ?.parentElement?.parentElement?.children[1]
        expect(tailElement?.className).toEqual('icon')
        const closeButton = screen.getAllByRole('button', { name: 'Close' }).at(-1)
        act(() => {
            ;(tailElement as HTMLInputElement).click()
            closeButton?.click()
        })
    })
}

const idPersistent0 = 'test-id-0'
const idPersistent1 = 'test-id-1'
const version0 = 0
const version1 = 1
const displayTxt0 = 'test display txt 0'
const displayTxt1 = 'test display txt 1'
const justification0 = 'very prolific shit poster'
const justification1 = 'tremendously prolific shit poster'

const columnNameParent = 'column parent test'
const idColumnParentPersistent = 'column-id-parent-test'
const columnNameTest = 'column name test'
const idColumnPersistent = 'column_id_test'
const nameUserTest = 'user_test'
const idUserTest = 'id-user-test'
const userTest = newPublicUserInfo({
    idPersistent: idUserTest,
    username: nameUserTest,
    permissionGroup: UserPermissionGroup.CONTRIBUTOR
})
const nameUserTest1 = 'user_test1'
const idUserTest1 = 'id-user-test-1'
const idValue0 = 'test-value-id-0'
const idValue1 = 'test-value-id-1'
const value0 = 'value 0',
    value1 = 'value 1'
const columnColumnState = newColumnState({
    idColumnPersistent: idColumnPersistent,
    cellContents: newRemote([
        [
            {
                value: value0,
                idPersistent: idValue0,
                version: 12
            }
        ],
        [
            {
                value: value1,
                idPersistent: idValue1,
                version: 1
            }
        ]
    ])
})
const displayTxtColumnState = newColumnState({
    idColumnPersistent: displayTxtColumnId,
    cellContents: newRemote([])
})
const justificationColumnState = newColumnState({
    idColumnPersistent: justificationColumnId,
    cellContents: newRemote([])
})

const next_offset = 4000
function addEntitiesResponse(fetchMock: Mock) {
    addResponseSequence(fetchMock, [
        [
            200,
            {
                id_entity_persistent_list: [idPersistent0, idPersistent1],
                next_offset
            }
        ],
        [
            200,
            {
                id_entity_persistent_list: [],
                next_offset: next_offset
            }
        ]
    ])
}

function addHierarchyAndDescendantsResponse(fetchMock: Mock) {
    addResponseSequence(fetchMock, [
        [
            200,
            {
                column_list: [
                    {
                        id_persistent: idColumnParentPersistent,
                        name_path: [columnNameParent],
                        name: columnNameParent,
                        curated: true,
                        version: 3,
                        hidden: false,
                        type: 'INNER'
                    }
                ]
            }
        ],
        [
            200,
            {
                column_list: [
                    {
                        id_persistent: idColumnPersistent,
                        id_parent_persistent: idColumnParentPersistent,
                        name_path: [columnNameParent, columnNameTest],
                        name: columnNameTest,
                        curated: true,
                        hidden: false,
                        version: 2,
                        type: 'STRING'
                    }
                ]
            }
        ],
        [200, { column_list: [] }],
        [200, { id_descendants_persistent_list: [idColumnPersistent] }]
    ])
}

function addValueResponse(fetchMock: Mock) {
    const valueResponse = {
        id_entity_persistent: idPersistent0,

        id_column_persistent: idColumnPersistent,
        value: value0,
        id_persistent: idValue0,
        owner: {
            id_persistent: idUserTest,
            username: nameUserTest,
            permission_group: 'CONTRIBUTOR'
        },
        version: 12
    }
    const valueResponse1 = {
        id_entity_persistent: idPersistent1,
        id_column_persistent: idColumnPersistent,
        value: value1,
        id_persistent: idValue1,
        owner: {
            id_persistent: idUserTest1,
            username: nameUserTest1,
            permission_group: 'CONTRIBUTOR'
        },
        version: 1
    }
    addResponseSequence(fetchMock, [
        [
            200,
            {
                value_list: [valueResponse, valueResponse1]
            }
        ]
    ])
}

function addUserProfileResponse(fetchMock: Mock) {
    addResponseSequence(fetchMock, [[200, {}]])
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
function MockTable(props: any) {
    const dispatch = useAppDispatch()
    return (
        <div className="mock">
            <Button
                onClick={() => {
                    dispatch(showColumnAddMenu())
                }}
            >
                Modal
            </Button>
        </div>
    )
}

const initialState = {
    preloadedState: {
        ...emptyState,
        columnSelection: newColumnSelectionState({
            columnsByIdPersistent: {
                [displayTxtColumnId]: newRemote(displayTextColumn),
                [justificationColumnId]: newRemote(justificationColumn)
            }
        }),
        entityDetails: newEntityDetailsState({
            entityByIdPersistentMap: {
                indexMap: {
                    [idPersistent0]: 0,
                    [idPersistent1]: 1
                },
                list: [
                    newRemote(
                        newEntity({
                            displayTxt: displayTxt0,
                            idPersistent: idPersistent0,
                            version: version0,
                            disabled: false,
                            justificationTxt: justification0,
                            displayTxtDetails: 'display_txt_detail'
                        })
                    ),
                    newRemote(
                        newEntity({
                            displayTxt: displayTxt1,
                            idPersistent: idPersistent1,
                            version: version1,
                            disabled: false,
                            justificationTxt: justification1,
                            displayTxtDetails: 'display_txt_detail'
                        })
                    )
                ]
            }
        }),
        auth: newAuthState({
            user: newRemote(
                newUserInfo({
                    ...userTest,
                    email: 'mail@test.org',
                    namesPersonal: 'names personal',
                    idColumnPersistentList: []
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
}
