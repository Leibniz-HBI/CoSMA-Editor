/*
 * @jest-environment jsdom
 */
jest.mock('@glideapps/glide-data-grid', () => {
    const actual = jest.requireActual('@glideapps/glide-data-grid')
    return {
        __esmodule: true,
        DataEditor: jest
            .fn()
            .mockImplementation((props: object) => <MockTable {...props} />),
        CompactSelection: actual.CompactSelection,
        GridCellKind: actual.GridCellKind
    }
})
import { Col, Row } from 'react-bootstrap'
import {
    TagDefinition,
    TagSelectionState,
    TagType,
    newTagDefinition,
    newTagSelectionState
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
import { newEntity } from '../../../entity/state'
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
import { ChangeEvent, PropsWithChildren } from 'react'
import { Provider } from 'react-redux'
import { RemoteDataTable } from '../table'
import { userSlice } from '../../../user/slice'
import { TableSelectionState, tableSelectionSlice } from '../../selection/slice'
import { FormField } from '../../../util/form'
import {
    EditSessionParticipantType,
    EditSessionState,
    newEditSession,
    newEditSessionParticipant,
    newEditSessionState
} from '../../../session/state'
import { GridCellKind, Item } from '@glideapps/glide-data-grid'
import userEvent from '@testing-library/user-event'
import { debounce } from 'debounce'
import { newRemote } from '../../../util/state'
import { editSessionReducer } from '../../../session/slice'
import { EntityDetailsState, newEntityDetailsState } from '../../../entity/state'
import { entityDetailsReducer } from '../../../entity/slice'
import { tagSelectionSlice } from '../../../column_menu/slice'

const debounced = debounce(
    (changeCallback: (item: Item, value: string) => void, item: Item, value: string) =>
        changeCallback(item, value),
    400
)
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
function MockTable(props: any) {
    const changeCallback = (cell: Item, newValue: string) =>
        props.onCellEdited(cell, {
            kind: GridCellKind.Text,
            data: newValue,
            displayData: newValue
        })
    return (
        <div className="mock">
            <Col>
                {Array.from({ length: props.rows }, (_, idx: number) => idx).map(
                    (idxRow) => (
                        <Row key={idxRow}>
                            {Array.from(
                                { length: props.columns.length },
                                (_, idx: number) => idx
                            ).map((idxCol) => {
                                const cell = props.getCellContent([idxCol, idxRow])
                                const label = `${idxCol}-${idxRow}`
                                if (cell.kind == 'text') {
                                    return (
                                        <Col key={idxCol}>
                                            <FormField
                                                label={label}
                                                name={label}
                                                value={cell.data}
                                                role="textbox"
                                                handleChange={(
                                                    event: ChangeEvent<HTMLInputElement>
                                                ) =>
                                                    debounced(
                                                        changeCallback,
                                                        [idxCol, idxRow],
                                                        event.target.value
                                                    )
                                                }
                                            />
                                        </Col>
                                    )
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
test('edit display text success', async () => {
    const fetchMock = jest.fn()
    addEntitiesResponse(fetchMock)
    addTagInstanceResponse(fetchMock)
    addResponseSequence(fetchMock, [
        [
            200,
            {
                entity_list: [
                    {
                        id_persistent: idPersistent1,
                        display_txt: valueChanged,
                        display_txt_details: 'display_txt_detail',
                        version: versionChanged,
                        disabled: false
                    }
                ]
            }
        ]
    ])
    const { store } = renderWithProviders(<RemoteDataTable />, fetchMock)
    const user = userEvent.setup()
    await waitFor(() => {
        const inputs = screen.getAllByRole('textbox')
        expect(inputs.length).toEqual(4)
    })
    const inputs = screen.getAllByRole('textbox')
    const input = inputs[2] as HTMLInputElement
    await user.click(input)
    await user.keyboard('{Control>}a{/Control}')
    await user.paste(valueChanged)
    await user.keyboard('{enter}')
    await waitFor(() => {
        const state = store.getState()
        expect(state.notification).toEqual(newNotificationManager({}))
        expect(state.table.entities?.at(1)).toEqual(
            newEntity({
                displayTxt: valueChanged,
                displayTxtDetails: 'display_txt_detail',
                idPersistent: idPersistent1,
                version: versionChanged,
                disabled: false
            })
        )
    })
    expect(fetchMock.mock.calls.length).toEqual(3)
    expect(fetchMock.mock.calls.at(-1)).toEqual([
        'http://127.0.0.1:8000/cosmae/api/entities',
        {
            credentials: 'include',
            method: 'POST',
            body: JSON.stringify({
                entity_list: [
                    {
                        display_txt: valueChanged,
                        id_persistent: idPersistent1,
                        version: version1
                    }
                ]
            })
        }
    ])
})
test('edit display text error', async () => {
    const fetchMock = jest.fn()
    addEntitiesResponse(fetchMock)
    addTagInstanceResponse(fetchMock)
    const msg = 'could not edit entity for test'
    addResponseSequence(fetchMock, [[500, { msg }]])
    const { store } = renderWithProviders(<RemoteDataTable />, fetchMock)
    const user = userEvent.setup()
    await waitFor(() => {
        const inputs = screen.getAllByRole('textbox')
        expect(inputs.length).toEqual(4)
    })
    const inputs = screen.getAllByRole('textbox')
    const input = inputs[2] as HTMLInputElement
    await user.click(input)
    await user.keyboard('{Control>}a{/Control}')
    await user.paste(valueChanged)
    await user.keyboard('{enter}')
    await waitFor(() => {
        const state = store.getState()
        expect(state.notification).toEqual(
            newNotificationManager({
                notificationList: [
                    newNotification({
                        msg,
                        type: NotificationType.Error,
                        id: expect.anything()
                    })
                ],
                notificationMap: expect.anything()
            })
        )
        expect(state.table.entities?.at(1)).toEqual(
            newEntity({
                displayTxt: displayTxt1,
                displayTxtDetails: 'display_txt_detail',
                idPersistent: idPersistent1,
                version: version1,
                disabled: false
            })
        )
    })
    expect(fetchMock.mock.calls.length).toEqual(3)
})
test('edit tag value success', async () => {
    const fetchMock = jest.fn()
    addEntitiesResponse(fetchMock)
    addTagInstanceResponse(fetchMock)
    addResponseSequence(fetchMock, [
        [
            200,
            {
                tag_instances: [
                    {
                        id_persistent: idValue0,
                        id_tag_definition_persistent: idTagDefPersistent,
                        id_entity_persistent: idPersistent0,
                        value: valueChanged,
                        version: versionChanged
                    }
                ]
            }
        ]
    ])
    const { store } = renderWithProviders(<RemoteDataTable />, fetchMock)
    const user = userEvent.setup()
    await waitFor(() => {
        const inputs = screen.getAllByRole('textbox')
        expect(inputs.length).toEqual(4)
    })
    const inputs = screen.getAllByRole('textbox')
    const input = inputs[1] as HTMLInputElement
    await user.click(input)
    await user.keyboard('{Control>}a{/Control}')
    await user.paste(valueChanged)
    await user.keyboard('{enter}')
    await waitFor(() => {
        const state = store.getState()
        expect(state.notification).toEqual(newNotificationManager({}))
        expect(state.table.columnStates[1].cellContents.value?.at(0)).toEqual([
            {
                value: valueChanged,
                idPersistent: idValue0,
                version: versionChanged
            }
        ])
    })
    expect(fetchMock.mock.calls.length).toEqual(3)
    expect(fetchMock.mock.calls.at(-1)).toEqual([
        'http://127.0.0.1:8000/cosmae/api/tags',
        {
            credentials: 'include',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tag_instances: [
                    {
                        id_entity_persistent: idPersistent0,
                        id_tag_definition_persistent: idTagDefPersistent,
                        value: valueChanged,
                        id_persistent: idValue0,
                        version: versionValue0
                    }
                ]
            })
        }
    ])
})

test('edit tag value api msg error', async () => {
    const fetchMock = jest.fn()
    addEntitiesResponse(fetchMock)
    addTagInstanceResponse(fetchMock)
    const msg = 'Could not change tag instance'
    addResponseSequence(fetchMock, [[500, { msg }]])
    const { store } = renderWithProviders(<RemoteDataTable />, fetchMock)
    const user = userEvent.setup()
    await waitFor(() => {
        const inputs = screen.getAllByRole('textbox')
        expect(inputs.length).toEqual(4)
    })
    const inputs = screen.getAllByRole('textbox')
    const input = inputs[1] as HTMLInputElement
    await user.click(input)
    await user.keyboard('{Control>}a{/Control}')
    await user.paste(valueChanged)
    await user.keyboard('{enter}')
    await waitFor(() => {
        const state = store.getState()
        expect(state.notification).toEqual(
            newNotificationManager({
                notificationList: [
                    newNotification({
                        msg,
                        type: NotificationType.Error,
                        id: expect.anything()
                    })
                ],
                notificationMap: expect.anything()
            })
        )
        expect(state.table.columnStates[1].cellContents.value?.at(0)).toEqual([
            {
                value: value0,
                idPersistent: idValue0,
                version: versionValue0
            }
        ])
    })
    expect(fetchMock.mock.calls.length).toEqual(3)
})

test('edit tag value changed in backend', async () => {
    const fetchMock = jest.fn()
    addEntitiesResponse(fetchMock)
    addTagInstanceResponse(fetchMock)
    const valueChangedByOther = 'already changed'
    const versionChangedByOther = 947
    addResponseSequence(fetchMock, [
        [
            409,
            {
                tag_instances: [
                    {
                        id_persistent: idValue0,
                        id_tag_definition_persistent: idTagDefPersistent,
                        id_entity_persistent: idPersistent0,
                        value: valueChangedByOther,
                        version: versionChangedByOther
                    }
                ]
            }
        ]
    ])
    const { store } = renderWithProviders(<RemoteDataTable />, fetchMock)
    const user = userEvent.setup()
    await waitFor(() => {
        const inputs = screen.getAllByRole('textbox')
        expect(inputs.length).toEqual(4)
    })
    const inputs = screen.getAllByRole('textbox')
    const input = inputs[1] as HTMLInputElement
    await user.click(input)
    await user.keyboard('{Control>}a{/Control}')
    await user.paste(valueChanged)
    await user.keyboard('{enter}')
    await waitFor(() => {
        const state = store.getState()
        expect(state.notification).toEqual(
            newNotificationManager({
                notificationList: [
                    newNotification({
                        msg:
                            'The data you entered changed in the remote location. ' +
                            'The new values are updated in the table. Please review them.',
                        type: NotificationType.Error,
                        id: expect.anything()
                    })
                ],
                notificationMap: expect.anything()
            })
        )
        expect(state.table.columnStates[1].cellContents.value?.at(0)).toEqual([
            {
                value: valueChangedByOther,
                idPersistent: idValue0,
                version: versionChangedByOther
            }
        ])
    })
    expect(fetchMock.mock.calls.length).toEqual(3)
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

const idPersistent0 = 'test-id-0'
const idPersistent1 = 'test-id-1'
const version0 = 0
const version1 = 1
const versionChanged = 31234
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
    display_txt: 'test display txt 1',
    display_txt_details: 'display_txt_detail',
    id_persistent: idPersistent1,
    version: 1,
    disabled: false
}

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
function addEntitiesResponse(fetchMock: jest.Mock) {
    addResponseSequence(fetchMock, [
        [200, { entity_list: [test_entity_rsp_0, test_entity_rsp_1] }]
    ])
}

const idValue0 = 'test-value-id-0'
const idValue1 = 'test-value-id-1'
const versionValue0 = 12
const value0 = 'value 0',
    value1 = 'value 1',
    valueChanged = 'changed'
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
        version: versionValue0
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
        tagSelection: TagSelectionState
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
            tagSelection: newTagSelectionState({
                tagDefinitionsByIdPersistent: {
                    [displayTxtColumnId]: newRemote(displayTextColumn),
                    [justificationColumnId]: newRemote(justificationColumn),
                    [idTagDefPersistent]: newRemote(tagDefTest)
                }
            }),
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
            tagSelection: tagSelectionSlice.reducer,
            user: userSlice.reducer,
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
