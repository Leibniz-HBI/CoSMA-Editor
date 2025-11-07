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
import { Col, Row } from 'react-bootstrap'
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
    newUserInfo
} from '../../../user/state'
import {
    TableState,
    displayTextColumn,
    displayTxtColumnId,
    justificationColumn,
    justificationColumnId,
    newColumnState,
    newTableState
} from '../../state'
import { Entity, newEntity, newEntityDetailsState } from '../../../entity/state'
import {
    NotificationManager,
    NotificationType,
    newNotification,
    newNotificationManager
} from '../../../util/notification/slice'
import { RenderOptions, waitFor, screen } from '@testing-library/react'
import { RemoteDataTable } from '../table'
import { TableSelectionState } from '../../selection/slice'
import { newRemote, RemoteInterface } from '../../../util/state'
import {
    EditSessionParticipantType,
    EditSessionState,
    newEditSession,
    newEditSessionParticipant,
    newEditSessionState
} from '../../../session/state'
import { EntityDetailsState } from '../../../entity/state'
import { AuthState, newAuthState } from '../../../auth/state'
import { emptyState, renderWithProviders } from '../../../util/tests/provider'
import { addResponseSequence, expectFetchCallList } from '../../../util/tests/response'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MockTable(props: any) {
    return (
        <div className="mock">
            <Col>
                {Array.from({ length: props.rows }, (_, idx: number) => idx).map(
                    (idxRow) => (
                        <Row>
                            {Array.from(
                                { length: props.columns.length },
                                (_, idx: number) => idx
                            ).map((idxCol) => {
                                const cell = props.getCellContent([idxCol, idxRow])
                                if (cell.kind == 'text') {
                                    return <Col>{cell.displayData}</Col>
                                }
                                return <Col></Col>
                            })}
                        </Row>
                    )
                )}
            </Col>
        </div>
    )
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
const columnTest: Column = newColumn({
    namePath: [columnNameTest],
    idPersistent: idColumnPersistent,
    idParentPersistent: idColumnParentPersistent,
    columnType: ColumnType.String,
    curated: false,
    owner: userTest,
    version: 2,
    hidden: false
})
const columnParentTest = newColumn({
    namePath: [columnNameParent],
    idPersistent: idColumnParentPersistent,
    columnType: ColumnType.Inner,
    curated: false,
    owner: userTest,
    version: 3,
    hidden: false
})

test('get entities success', async () => {
    const fetchMock = vi.fn()
    addEntitiesResponse(fetchMock)
    addValueResponse(fetchMock)
    const { store } = renderWithProviders(<RemoteDataTable />, fetchMock, initialState)
    await waitFor(() => {
        screen.getByText(displayTxt0)
        screen.getByText(displayTxt1)
        screen.getByText(value0)
        screen.getByText(value1)
    })
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
    await expectFetchCallList(fetchMock.mock.calls, [
        [
            'http://127.0.0.1:8000/cosmae/api/entities/filter',
            {
                credentials: 'include',
                body: { offset: 0, limit: 5000 },
                headers: { 'Content-Type': 'application/json' },
                method: 'POST'
            }
        ],
        [
            'http://127.0.0.1:8000/cosmae/api/entities/filter',
            {
                credentials: 'include',
                body: { offset: nextOffset, limit: 5000 },
                headers: { 'Content-Type': 'application/json' },
                method: 'POST'
            }
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
        ]
    ])
})
test('get entities and inner column success', async () => {
    const fetchMock = vi.fn()
    addEntitiesResponse(fetchMock)
    addValueResponse(fetchMock)
    const { store } = renderWithProviders(<RemoteDataTable />, fetchMock, initialState)
    await waitFor(() => {
        screen.getByText(displayTxt0)
        screen.getByText(displayTxt1)
        screen.getByText(value0)
        screen.getByText(value1)
    })
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
    await expectFetchCallList(fetchMock.mock.calls, [
        [
            'http://127.0.0.1:8000/cosmae/api/entities/filter',
            {
                credentials: 'include',
                body: { offset: 0, limit: 5000 },
                headers: { 'Content-Type': 'application/json' },
                method: 'POST'
            }
        ],
        [
            'http://127.0.0.1:8000/cosmae/api/entities/filter',
            {
                credentials: 'include',
                body: { offset: nextOffset, limit: 5000 },
                headers: { 'Content-Type': 'application/json' },
                method: 'POST'
            }
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
        ]
    ])
})

test('get chunked', async () => {
    const fetchMock = vi.fn()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const idEntityPersistentListList: any[][] = [[], [], []]
    for (let j = 0; j < 2; ++j) {
        for (let i = 0; i < 500; ++i) {
            idEntityPersistentListList[j].push(500 * j + i)
        }
    }
    idEntityPersistentListList[2].push(1001)
    addResponseSequence(fetchMock, [
        [
            200,
            {
                id_entity_persistent_list: idEntityPersistentListList[0],
                next_offset: 501
            }
        ],
        [
            200,
            {
                id_entity_persistent_list: idEntityPersistentListList[1],
                next_offset: 1001
            }
        ],
        [
            200,
            {
                id_entity_persistent_list: idEntityPersistentListList[2],
                next_offset: 1501
            }
        ],
        [200, { id_entity_persistent_list: [], next_offset: 0 }]
    ])
    const idValueChunk = 'test-value-id-0'
    const version = 12
    const valueResponse = {
        id_entity_persistent: 'test-id-0',
        id_column_persistent: idColumnPersistent,
        value: displayTxt0,
        id_persistent: idValueChunk,
        owner: {
            id_persistent: idUserTest,
            username: nameUserTest,
            permission_group: 'CONTRIBUTOR'
        },
        version: version
    }
    const valueResponse1 = {
        id_entity_persistent: 'test-id-1',
        id_column_persistent: idColumnPersistent,
        value: displayTxt1,
        id_persistent: 'test-value-id-1',
        owner: {
            id_persistent: idUserTest1,
            username: nameUserTest1,
            permission_group: 'CONTRIBUTOR'
        },
        version: 1
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const columns: any[] = []
    for (let i = 0; i < 5000; ++i) {
        columns.push({
            ...valueResponse,
            id_entity_persistent: i % 1000,
            version: i * 2 + 2
        })
    }
    addResponseSequence(fetchMock, [
        [200, { value_list: columns }],
        [
            200,
            {
                value_list: [valueResponse1]
            }
        ]
    ])
    const entityByIdPersistentMap: { [idPersistent: string]: RemoteInterface<Entity> } =
        {}
    idEntityPersistentListList.flat().forEach((idPersistent: string) => {
        entityByIdPersistentMap[idPersistent] = newRemote(
            newEntity({
                idPersistent: idPersistent,
                displayTxt: `entity ${idPersistent}`,
                displayTxtDetails: 'display_txt_details',
                version: 0,
                disabled: false
            })
        )
    })
    const { store } = renderWithProviders(<RemoteDataTable />, fetchMock, {
        preloadedState: {
            ...initialState.preloadedState,
            entityDetails: newEntityDetailsState({ entityByIdPersistentMap })
        }
    })

    await waitFor(() => {
        const state = store.getState()
        const idxLoadedColumn = 2
        expect(state.table.entityIdList?.length).toEqual(1001)
        expect(
            state.table.columnStates[idxLoadedColumn].cellContents.value.length
        ).toEqual(1001)
        for (let idx = 0; idx < 1000; ++idx) {
            expect(
                state.table.columnStates[idxLoadedColumn].cellContents.value[idx]
            ).toEqual([
                {
                    idPersistent: idValueChunk,
                    version: 8000 + idx * 2 + 2,
                    value: displayTxt0
                }
            ])
        }
        expect(
            state.table.columnStates[idxLoadedColumn].cellContents.value[1000].length
        ).toEqual(0)
    })
    expect(fetchMock.mock.calls.length).toEqual(6)
})

test('get entities error', async () => {
    const fetchMock = vi.fn()
    const entityError = 'Could not load entities'
    addResponseSequence(fetchMock, [[500, { msg: entityError }]])
    const { store } = renderWithProviders(<RemoteDataTable />, fetchMock)
    await waitFor(() => {
        const state = store.getState()
        expect(state.notification).toEqual(
            newNotificationManager({
                notificationList: [
                    newNotification({
                        msg: `Could not load entities chunk with offset 0. Reason: "${entityError}"`,
                        type: NotificationType.Error,
                        id: expect.anything()
                    })
                ],
                notificationMap: expect.anything()
            })
        )
        expect(state.table).toEqual(
            newTableState({
                isLoading: false,
                columnIndices: { display_txt_id: 0 },
                columnStates: [
                    newColumnState({
                        idColumnPersistent: displayTxtColumnId,
                        cellContents: newRemote([], true)
                    })
                ]
            })
        )
    })
    expect(fetchMock.mock.calls.length).toEqual(1)
})

test('get instances error', async () => {
    const fetchMock = vi.fn()
    const instancesError = 'Could not load instances'
    addEntitiesResponse(fetchMock)
    addResponseSequence(fetchMock, [[500, { msg: instancesError }]])
    const { store } = renderWithProviders(<RemoteDataTable />, fetchMock, initialState)
    await waitFor(() => {
        const state = store.getState()
        expect(state.notification).toEqual(
            newNotificationManager({
                notificationList: [
                    newNotification({
                        msg: `Could not load instances chunk 0. Reason: "${instancesError}"`,
                        type: NotificationType.Error,
                        id: expect.anything()
                    })
                ],
                notificationMap: expect.anything()
            })
        )
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
                    newColumnState({
                        idColumnPersistent: idColumnPersistent,
                        cellContents: newRemote([], true)
                    })
                ],
                showEntityJustifications: true
            })
        )
    })
    expect(fetchMock.mock.calls.length).toEqual(3)
})

const displayTxtColumnState = newColumnState({
    idColumnPersistent: displayTxtColumnId,
    cellContents: newRemote([])
})
const justificationColumnState = newColumnState({
    idColumnPersistent: justificationColumnId,
    cellContents: newRemote([])
})

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

const nextOffset = 4452
function addEntitiesResponse(fetchMock: Mock) {
    addResponseSequence(fetchMock, [
        [
            200,
            {
                id_entity_persistent_list: [idPersistent0, idPersistent1],
                next_offset: nextOffset
            }
        ],
        [
            200,
            {
                id_entity_persistent_list: [],
                next_offset: nextOffset
            }
        ]
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

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: {
        notification: NotificationManager
        table: TableState
        tableSelection: TableSelectionState
        columnSelection: ColumnSelectionState
        user: UserState
        auth: AuthState
        editSession: EditSessionState
        entityDetails: EntityDetailsState
    }
}

const initialState = {
    preloadedState: {
        ...emptyState,
        columnSelection: newColumnSelectionState({
            columnsByIdPersistent: {
                [displayTxtColumnId]: newRemote(displayTextColumn),
                [justificationColumnId]: newRemote(justificationColumn),
                [idColumnPersistent]: newRemote(columnTest),
                [idColumnParentPersistent]: newRemote(columnParentTest)
            }
        }),
        entityDetails: newEntityDetailsState({
            entityByIdPersistentMap: {
                [idPersistent0]: newRemote(
                    newEntity({
                        displayTxt: displayTxt0,
                        idPersistent: idPersistent0,
                        version: version0,
                        disabled: false,
                        justificationTxt: justification0,
                        displayTxtDetails: 'display_txt_detail'
                    })
                ),
                [idPersistent1]: newRemote(
                    newEntity({
                        displayTxt: displayTxt1,
                        idPersistent: idPersistent1,
                        version: version1,
                        disabled: false,
                        justificationTxt: justification1,
                        displayTxtDetails: 'display_txt_detail'
                    })
                )
            }
        }),
        auth: newAuthState({
            user: newRemote(
                newUserInfo({
                    ...userTest,
                    email: 'mail@test.org',
                    namesPersonal: 'names personal',
                    idColumnPersistentList: [idColumnPersistent]
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
