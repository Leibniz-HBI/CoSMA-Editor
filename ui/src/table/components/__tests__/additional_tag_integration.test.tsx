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
import {
    ColumnSelectionState,
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
    newColumnState,
    newTableState
} from '../../state'
import { newEntity } from '../../../entity/state'
import {
    NotificationManager,
    newNotificationManager,
    notificationReducer
} from '../../../util/notification/slice'
import { act, RenderOptions, waitFor, render, screen } from '@testing-library/react'
import { showColumnAddMenu, tableReducer } from '../../slice'
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
import { columnSelectionReducer } from '../../../column_menu/slice'
import { useAppDispatch } from '../../../hooks'
import { AuthState, newAuthState } from '../../../auth/state'
import { authReducer } from '../../../auth/slice'

test('get descendant column success', async () => {
    const fetchMock = vi.fn()
    addEntitiesResponse(fetchMock)
    addHierarchyAndDescendantsResponse(fetchMock)
    addValueResponse(fetchMock)
    const { store } = renderWithProviders(<RemoteDataTable />, fetchMock)
    await waitFor(() => {
        const button = screen.getByRole('button', { name: 'Modal' })
        act(() => {
            button.click()
        })
    })
    await waitFor(() => {
        screen.getByText(columnNameTest)
        const columnLabelParents = screen.getAllByText(columnNameParent)
        const tailElement =
            columnLabelParents[0].parentElement?.parentElement?.parentElement
                ?.parentElement?.parentElement?.children[1]
        expect(tailElement?.className).toEqual('icon')
        const closeButton = screen.getByRole('button', { name: 'Close' })
        act(() => {
            ;(tailElement as HTMLInputElement).click()
            closeButton.click()
        })
    })
    await waitFor(() => {
        const state = store.getState()
        expect(state.notification.notificationList).toEqual([])
        expect(state.table).toEqual(
            newTableState({
                entities: entities_test,
                isLoading: false,
                columnIndices: {
                    display_txt_id: 0,
                    [idColumnPersistent]: 1
                },
                columnStates: [displayTxtColumnState, columnColumnState]
            })
        )
    })
    expect(fetchMock.mock.calls).toEqual([
        [
            'http://127.0.0.1:8000/cosmae/api/entities/chunk',
            {
                credentials: 'include',
                body: JSON.stringify({ offset: 0, limit: 500 }),
                headers: { 'Content-Type': 'application/json' },
                method: 'POST'
            }
        ],
        [
            'http://127.0.0.1:8000/cosmae/api/columns/children',
            {
                body: '{}',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                method: 'POST'
            }
        ],
        [
            'http://127.0.0.1:8000/cosmae/api/columns/children',
            {
                body: JSON.stringify({
                    id_parent_persistent: idColumnParentPersistent
                }),
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                method: 'POST'
            }
        ],
        [
            'http://127.0.0.1:8000/cosmae/api/columns/children',
            {
                body: JSON.stringify({
                    id_parent_persistent: idColumnPersistent
                }),
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
                body: JSON.stringify({
                    id_column_persistent: idColumnPersistent,
                    offset: 0,
                    limit: 5000
                })
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

const idPersistent0 = 'test-id-0'
const idPersistent1 = 'test-id-1'
const version0 = 0
const version1 = 1
const displayTxt0 = 'test display txt 0'
const justification0 = 'very prolific shit poster'
const justification1 = 'tremendously prolific shit poster'
const test_entity_rsp_0 = {
    display_txt: displayTxt0,
    display_txt_details: 'display_txt_detail',
    id_persistent: idPersistent0,
    version: version0,
    disabled: false,
    justification_txt: justification0
}
const test_entity_rsp_1 = {
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

function addEntitiesResponse(fetchMock: Mock) {
    addResponseSequence(fetchMock, [
        [200, { entity_list: [test_entity_rsp_0, test_entity_rsp_1] }]
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

export function renderWithProviders(
    ui: React.ReactElement,
    fetchMock: Mock,
    {
        preloadedState = {
            notification: newNotificationManager({}),
            table: newTableState({}),
            tableSelection: { rows: [], cols: [], rowSelectionOrder: [] },
            columnSelection: newColumnSelectionState({
                columnsByIdPersistent: {
                    [displayTxtColumnId]: newRemote(displayTextColumn),
                    [justificationColumnId]: newRemote(justificationColumn)
                }
            }),
            user: newUserState({}),
            auth: newAuthState({
                user: newRemote(
                    newUserInfo({
                        ...userTest,
                        email: 'mail@test.org',
                        namesPersonal: 'names personal',
                        columns: []
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
            columnSelection: columnSelectionReducer,
            user: userSlice.reducer,
            auth: authReducer,
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
