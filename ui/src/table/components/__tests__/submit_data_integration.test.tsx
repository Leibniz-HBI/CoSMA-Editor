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
import { Col, Row } from 'react-bootstrap'
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
import { newEntity } from '../../../entity/state'
import {
    NotificationType,
    newNotification,
    newNotificationManager
} from '../../../util/notification/slice'
import { waitFor, screen } from '@testing-library/react'
import { ChangeEvent } from 'react'
import { RemoteDataTable } from '../table'
import { FormField } from '../../../util/form'
import {
    EditSessionParticipantType,
    newEditSession,
    newEditSessionParticipant,
    newEditSessionState
} from '../../../session/state'
import { GridCellKind, Item } from '@glideapps/glide-data-grid'
import userEvent from '@testing-library/user-event'
import { debounce } from 'debounce'
import { newRemote } from '../../../util/state'
import { newAuthState } from '../../../auth/state'
import { addResponseSequence, expectFetchCall } from '../../../util/tests/response'
import { emptyState, renderWithProviders } from '../../../util/tests/provider'

const debounced = debounce(
    (changeCallback: (item: Item, value: string) => void, item: Item, value: string) =>
        changeCallback(item, value),
    400
)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    const fetchMock = vi.fn()
    addEntitiesResponse(fetchMock)
    addValueResponse(fetchMock)
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
    const { store } = renderWithProviders(
        <RemoteDataTable />,
        fetchMock,
        preloadedState
    )
    const user = userEvent.setup()
    const inputs = await waitFor(() => {
        const inputs = screen.getAllByRole('textbox', { name: /[0-9]-[0-9]/ })
        expect(inputs.length).toEqual(4)
        return inputs
    })
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
    expect(fetchMock.mock.calls.length).toEqual(4)
    await expectFetchCall(fetchMock.mock.calls.at(-1), [
        'http://127.0.0.1:8000/cosmae/api/entities',
        {
            credentials: 'include',
            method: 'POST',
            body: {
                entity_list: [
                    {
                        display_txt: valueChanged,
                        id_persistent: idPersistent1,
                        version: version1
                    }
                ]
            }
        }
    ])
})
test('edit display text error', async () => {
    const fetchMock = vi.fn()
    addEntitiesResponse(fetchMock)
    addValueResponse(fetchMock)
    const msg = 'could not edit entity for test'
    addResponseSequence(fetchMock, [[500, { msg }]])
    const { store } = renderWithProviders(
        <RemoteDataTable />,
        fetchMock,
        preloadedState
    )
    const user = userEvent.setup()
    const inputs = await waitFor(() => {
        const inputs = screen.getAllByRole('textbox', { name: /[0-9]-[0-9]/ })
        expect(inputs.length).toEqual(4)
        return inputs
    })
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
    expect(fetchMock.mock.calls.length).toEqual(4)
})
test('edit value success', async () => {
    const fetchMock = vi.fn()
    addEntitiesResponse(fetchMock)
    addValueResponse(fetchMock)
    addResponseSequence(fetchMock, [
        [
            200,
            {
                value_list: [
                    {
                        id_persistent: idValue0,
                        id_column_persistent: idColumnPersistent,
                        id_entity_persistent: idPersistent0,
                        value: valueChanged,
                        version: versionChanged
                    }
                ]
            }
        ]
    ])
    const { store } = renderWithProviders(
        <RemoteDataTable />,
        fetchMock,
        preloadedState
    )
    const user = userEvent.setup()
    const inputs = await waitFor(() => {
        const inputs = screen.getAllByRole('textbox', { name: /[0-9]-[0-9]/ })
        expect(inputs.length).toEqual(4)
        return inputs
    })
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
    expect(fetchMock.mock.calls.length).toEqual(4)
    await expectFetchCall(fetchMock.mock.calls.at(-1), [
        'http://127.0.0.1:8000/cosmae/api/values',
        {
            credentials: 'include',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: {
                value_list: [
                    {
                        id_entity_persistent: idPersistent0,
                        id_column_persistent: idColumnPersistent,
                        value: valueChanged,
                        id_persistent: idValue0,
                        version: versionValue0
                    }
                ]
            }
        }
    ])
})

test('edit value api msg error', async () => {
    const fetchMock = vi.fn()
    addEntitiesResponse(fetchMock)
    addValueResponse(fetchMock)
    const msg = 'Could not change value'
    addResponseSequence(fetchMock, [[500, { msg }]])
    const { store } = renderWithProviders(
        <RemoteDataTable />,
        fetchMock,
        preloadedState
    )
    const user = userEvent.setup()
    const inputs = await waitFor(() => {
        const inputs = screen.getAllByRole('textbox', { name: /[0-9]-[0-9]/ })
        expect(inputs.length).toEqual(4)
        return inputs
    })
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
    expect(fetchMock.mock.calls.length).toEqual(4)
})

test('edit value changed in backend', async () => {
    const fetchMock = vi.fn()
    addEntitiesResponse(fetchMock)
    addValueResponse(fetchMock)
    const valueChangedByOther = 'already changed'
    const versionChangedByOther = 947
    addResponseSequence(fetchMock, [
        [
            409,
            {
                value_list: [
                    {
                        id_persistent: idValue0,
                        id_column_persistent: idColumnPersistent,
                        id_entity_persistent: idPersistent0,
                        value: valueChangedByOther,
                        version: versionChangedByOther
                    }
                ]
            }
        ]
    ])
    const { store } = renderWithProviders(
        <RemoteDataTable />,
        fetchMock,
        preloadedState
    )
    const user = userEvent.setup()
    const inputs = await waitFor(() => {
        const inputs = screen.getAllByRole('textbox', { name: /[0-9]-[0-9]/ })
        expect(inputs.length).toEqual(4)
        return inputs
    })
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
    expect(fetchMock.mock.calls.length).toEqual(4)
})

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
    idParentPersistent: undefined,
    columnType: ColumnType.String,
    curated: false,
    owner: userTest,
    version: 2,
    hidden: false
})
function addEntitiesResponse(fetchMock: Mock) {
    addResponseSequence(fetchMock, [
        [
            200,
            {
                entity_list: [test_entity_rsp_0, test_entity_rsp_1],
                next_offset: version1 + 1
            }
        ],
        [200, { entity_list: [], next_offset: 0 }]
    ])
}

const idValue0 = 'test-value-id-0'
const idValue1 = 'test-value-id-1'
const versionValue0 = 12
const value0 = 'value 0',
    value1 = 'value 1',
    valueChanged = 'changed'
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
        version: versionValue0
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

const initialState = {
    ...emptyState,
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
const preloadedState = { preloadedState: initialState }
