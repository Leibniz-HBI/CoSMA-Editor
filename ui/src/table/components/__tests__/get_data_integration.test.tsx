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
import { Col, Row } from 'react-bootstrap'
import { TagDefinition, TagType, newTagDefinition } from '../../../column_menu/state'
import {
    UserPermissionGroup,
    UserState,
    newPublicUserInfo,
    newUserInfo,
    newUserState
} from '../../../user/state'
import {
    TableState,
    entityDetailsColumn,
    entityDetailsColumnId,
    newColumnState,
    newEntity,
    newTableState
} from '../../state'
import {
    NotificationManager,
    NotificationType,
    newNotification,
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
import { newRemote } from '../../../util/state'
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
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

const idPersistent0 = 'test-id-0'
const idPersistent1 = 'test-id-1'
const version0 = 0
const version1 = 1
const displayTxt0 = 'test display txt 0'
const displayTxt1 = 'test display txt 1'
const justification0 = 'very prolific shit poster'
const justification1 = 'tremendously prolific shit poster'
const test_person_rsp_0 = {
    display_txt: displayTxt0,
    display_txt_details: 'display_txt_detail',
    id_persistent: idPersistent0,
    version: version0,
    disabled: false,
    justification_txt: justification0
}
const test_person_rsp_1 = {
    display_txt: 'test display txt 1',
    display_txt_details: 'display_txt_detail',
    id_persistent: idPersistent1,
    version: version1,
    disabled: false,
    justification_txt: justification1
}

const entities_test = [
    newEntity({
        idPersistent: idPersistent0,
        displayTxt: 'test display txt 0',
        displayTxtDetails: 'display_txt_detail',
        version: version0,
        disabled: false,
        justificationTxt: justification0
    }),
    newEntity({
        idPersistent: idPersistent1,
        displayTxt: 'test display txt 1',
        displayTxtDetails: 'display_txt_detail',
        version: version1,
        disabled: false,
        justificationTxt: justification1
    })
]
const columnNameTest = 'column name test'
const idTagDefPersistent = 'column_id_test'
const nameUserTest = 'user_test'
const idUserTest = 'id-user-test'
const userTest = newPublicUserInfo({
    idPersistent: idUserTest,
    username: nameUserTest,
    permissionGroup: UserPermissionGroup.CONTRIBUTOR
})
const nameUserTest1 = 'user_test1'
const idUserTest1 = 'id-user-test-1'
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

const nameTagDefDisplayText = 'Display Text'
const idTagDefPersistentDisplayText = 'display_txt_id'
const displayTextTagDef: TagDefinition = newTagDefinition({
    namePath: [nameTagDefDisplayText],
    idPersistent: idTagDefPersistentDisplayText,
    columnType: TagType.String,
    curated: true,
    version: 0,
    hidden: false
})

test('get entities success', async () => {
    const fetchMock = jest.fn()
    addEntitiesResponse(fetchMock)
    addTagInstanceResponse(fetchMock)
    const { store } = renderWithProviders(<RemoteDataTable />, fetchMock)
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
            entities: entities_test,
            isLoading: false,
            columnIndices: {
                display_txt_id: 0,
                [entityDetailsColumnId]: 1,
                [idTagDefPersistent]: 2
            },
            columnStates: [
                displayTxtColumnState,
                entityDetailsColumnState,
                tagDefColumnState
            ]
        })
    )
    expect(fetchMock.mock.calls).toEqual([
        [
            'http://127.0.0.1:8000/cosmae/api/persons/chunk',
            {
                credentials: 'include',
                body: JSON.stringify({ offset: 0, limit: 500 }),
                headers: { 'Content-Type': 'application/json' },
                method: 'POST'
            }
        ],
        [
            'http://127.0.0.1:8000/cosmae/api/tags/chunk',
            {
                credentials: 'include',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_tag_definition_persistent: idTagDefPersistent,
                    offset: 0,
                    limit: 5000
                })
            }
        ]
    ])
})

test('get chunked', async () => {
    const fetchMock = jest.fn()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const persons: any[][] = [[], [], []]
    for (let j = 0; j < 2; ++j) {
        for (let i = 0; i < 500; ++i) {
            persons[j].push({
                id_persistent: 500 * j + i,
                display_txt: 'display_text test',
                display_txt_details: 'display_txt_detail'
            })
        }
    }
    persons[2].push({
        id_persistent: 1001,
        display_txt: 'display text test',
        display_txt_details: 'display_txt_detail'
    })
    addResponseSequence(fetchMock, [
        [200, { persons: persons[0] }],
        [200, { persons: persons[1] }],
        [200, { persons: persons[2] }]
    ])
    const idValueChunk = 'test-value-id-0'
    const version = 12
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tagResponse = {
        id_entity_persistent: 'test-id-0',
        id_tag_definition_persistent: idTagDefPersistent,
        value: displayTxt0,
        id_persistent: idValueChunk,
        owner: {
            id_persistent: idUserTest,
            username: nameUserTest,
            permission_group: 'CONTRIBUTOR'
        },
        version: version
    }
    const tagResponse1 = {
        id_entity_persistent: 'test-id-1',
        id_tag_definition_persistent: idTagDefPersistent,
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
    const tags: any[] = []
    for (let i = 0; i < 5000; ++i) {
        tags.push({
            ...tagResponse,
            id_entity_persistent: i % 1000,
            version: i * 2 + 2
        })
    }
    addResponseSequence(fetchMock, [
        [200, { tag_instances: tags }],
        [
            200,
            {
                tag_instances: [tagResponse1]
            }
        ]
    ])
    const { store } = renderWithProviders(<RemoteDataTable />, fetchMock)

    await waitFor(() => {
        const state = store.getState()
        expect(state.table.entities?.length).toEqual(1001)
        expect(state.table.columnStates[2].cellContents.value.length).toEqual(1001)
        for (let idx = 0; idx < 1000; ++idx) {
            expect(state.table.columnStates[2].cellContents.value[idx]).toEqual([
                {
                    idPersistent: idValueChunk,
                    version: 8000 + idx * 2 + 2,
                    value: displayTxt0
                }
            ])
        }
        expect(state.table.columnStates[2].cellContents.value[1000].length).toEqual(0)
    })
    expect(fetchMock.mock.calls.length).toEqual(5)
})

test('get entities error', async () => {
    const fetchMock = jest.fn()
    const entityError = 'Could not load entities'
    addResponseSequence(fetchMock, [[500, { msg: entityError }]])
    const { store } = renderWithProviders(<RemoteDataTable />, fetchMock)
    await waitFor(() => {
        const state = store.getState()
        expect(state.notification).toEqual(
            newNotificationManager({
                notificationList: [
                    newNotification({
                        msg: `Could not load entities chunk 0. Reason: "${entityError}"`,
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
                columnIndices: { display_txt_id: 0, [entityDetailsColumnId]: 1 },
                columnStates: [
                    newColumnState({
                        tagDefinition: displayTextTagDef,
                        cellContents: newRemote([], true)
                    }),
                    newColumnState({
                        tagDefinition: entityDetailsColumn,
                        cellContents: newRemote([], true)
                    })
                ]
            })
        )
    })
    expect(fetchMock.mock.calls.length).toEqual(1)
})

test('get instances error', async () => {
    const fetchMock = jest.fn()
    const instancesError = 'Could not load instances'
    addEntitiesResponse(fetchMock)
    addResponseSequence(fetchMock, [[500, { msg: instancesError }]])
    const { store } = renderWithProviders(<RemoteDataTable />, fetchMock)
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
                entities: entities_test,
                isLoading: false,
                columnIndices: {
                    display_txt_id: 0,
                    [entityDetailsColumnId]: 1,
                    [idTagDefPersistent]: 2
                },
                columnStates: [
                    displayTxtColumnState,
                    entityDetailsColumnState,
                    newColumnState({
                        tagDefinition: tagDefTest,
                        cellContents: newRemote([], true)
                    })
                ]
            })
        )
    })
    expect(fetchMock.mock.calls.length).toEqual(2)
})

const displayTxtColumnState = newColumnState({
    tagDefinition: displayTextTagDef,
    cellContents: newRemote([])
})

const entityDetailsColumnState = newColumnState({
    tagDefinition: entityDetailsColumn,
    cellContents: newRemote([])
})

const idValue0 = 'test-value-id-0'
const idValue1 = 'test-value-id-1'
const value0 = 'value 0',
    value1 = 'value 1'
const tagDefColumnState = newColumnState({
    tagDefinition: tagDefTest,
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

function addEntitiesResponse(fetchMock: jest.Mock) {
    addResponseSequence(fetchMock, [
        [200, { persons: [test_person_rsp_0, test_person_rsp_1] }]
    ])
}

function addTagInstanceResponse(fetchMock: jest.Mock) {
    const tagResponse = {
        id_entity_persistent: idPersistent0,

        id_tag_definition_persistent: idTagDefPersistent,
        value: value0,
        id_persistent: idValue0,
        owner: {
            id_persistent: idUserTest,
            username: nameUserTest,
            permission_group: 'CONTRIBUTOR'
        },
        version: 12
    }
    const tagResponse1 = {
        id_entity_persistent: idPersistent1,
        id_tag_definition_persistent: idTagDefPersistent,
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
                tag_instances: [tagResponse, tagResponse1]
            }
        ]
    ])
}

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: {
        notification: NotificationManager
        table: TableState
        tableSelection: TableSelectionState
        user: UserState
        editSession: EditSessionState
        entityDetails: EntityDetailsState
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
