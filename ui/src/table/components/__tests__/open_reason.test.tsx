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
import {
    NotificationType,
    newNotification,
    newNotificationManager
} from '../../../util/notification/slice'
import { waitFor, screen, act } from '@testing-library/react'
import { RemoteDataTable } from '../table'
import userEvent, { UserEvent } from '@testing-library/user-event'
import { newRemote } from '../../../util/state'
import {
    EditSessionParticipantType,
    newEditSession,
    newEditSessionParticipant,
    newEditSessionState
} from '../../../session/state'
import { newAuthState } from '../../../auth/state'
import { emptyState, renderWithProviders } from '../../../util/tests/provider'
import { addResponseSequence, expectFetchCallList } from '../../../util/tests/response'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MockTable(props: any) {
    return (
        <div className="mock">
            <Col>
                <Row>{props.rightElement}</Row>
                <Row>
                    <Col>
                        {Array.from(
                            { length: props.rows },
                            (_, idx: number) => idx
                        ).map((idxRow) => (
                            <Row>
                                {Array.from(
                                    { length: props.columns.length },
                                    (_, idx: number) => idx
                                ).map((idxCol) => {
                                    const cell = props.getCellContent([idxCol, idxRow])
                                    if (cell.kind == 'text') {
                                        return (
                                            <Col
                                                onClick={() =>
                                                    props.onCellActivated([
                                                        idxCol,
                                                        idxRow
                                                    ])
                                                }
                                            >
                                                {cell.displayData}
                                            </Col>
                                        )
                                    }
                                    return <Col></Col>
                                })}
                            </Row>
                        ))}
                    </Col>
                </Row>
            </Col>
        </div>
    )
}
test('show justifications, open modal and hide again', async () => {
    const fetchMock = vi.fn()
    addEntitiesAndInstancesResponse(fetchMock)
    addJustificationHistoryResponse(fetchMock)
    renderWithProviders(<RemoteDataTable />, fetchMock, preloadedState)
    await openModalForEntity0()
    await closeModal()
    await toggleJustifications()
    await waitFor(() => {
        expect(screen.queryByText(justification)).toBeNull()
    })
})
test('add justification', async () => {
    const fetchMock = vi.fn()
    addEntitiesAndInstancesResponse(fetchMock)
    addJustificationHistoryResponse(fetchMock)
    addResponseSequence(fetchMock, [
        [
            200,
            {
                justification: {
                    content: justificationChanged,
                    author: userApi,
                    timestamp: '2005-03-19 09:37:51 +0000'
                }
            }
        ]
    ])
    const { store } = renderWithProviders(
        <RemoteDataTable />,
        fetchMock,
        preloadedState
    )
    const user = userEvent.setup()
    await openModalForEntity0()
    await fillJustificationForm(user)
    await waitFor(() => {
        const input = screen.getByRole('textbox', { name: 'New Comment' })
        expect(input.textContent).toEqual('')
        screen.getByText(justification)
        // once in table, once in modal
        expect(screen.getAllByText(justificationChanged).length).toEqual(2)
    })
    await closeModal()
    await waitFor(() => {
        expect(screen.queryByText(modalHeading)).toBeNull()
        expect(screen.queryByText(justification)).toBeNull()
        screen.queryByText(justificationChanged)
    })
    const state = store.getState()
    expect(state.notification.notificationList).toEqual([])
    expect(state.table.entities?.at(0)?.justificationTxt).toEqual(justificationChanged)
    await expectFetchCallList(fetchMock.mock.calls, [
        [
            'http://127.0.0.1:8000/cosmae/api/entities/chunk',
            {
                credentials: 'include',
                body: { offset: 0, limit: 500 },
                headers: { 'Content-Type': 'application/json' },
                method: 'POST'
            }
        ],
        [
            'http://127.0.0.1:8000/cosmae/api/entities/chunk',
            {
                credentials: 'include',
                body: { offset: version1 + 1, limit: 500 },
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
        ],
        [
            'http://127.0.0.1:8000/cosmae/api/columns/children',
            {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: {}
            }
        ],
        [
            `http://127.0.0.1:8000/cosmae/api/entities/${idPersistent0}/justifications?`,
            {
                credentials: 'include'
            }
        ],
        [
            `http://127.0.0.1:8000/cosmae/api/entities/${idPersistent0}/justifications`,
            {
                credentials: 'include',
                method: 'PUT',
                body: JSON.stringify({ justification_txt: justificationChanged })
            }
        ]
    ])
})
test('add justification found', async () => {
    const fetchMock = vi.fn()
    addEntitiesAndInstancesResponse(fetchMock)
    addJustificationHistoryResponse(fetchMock)
    addResponseSequence(fetchMock, [[302, {}]])
    const { store } = renderWithProviders(
        <RemoteDataTable />,
        fetchMock,
        preloadedState
    )
    const input = userEvent.setup()
    await openModalForEntity0()
    await fillJustificationForm(input)
    await waitFor(() => {
        const user = screen.getByRole('textbox', { name: 'New Comment' })
        expect(user.textContent).toEqual('')
        expect(screen.queryByText(justificationChanged)).toBeNull()
        const state = store.getState()
        expect(state.notification).toEqual(
            newNotificationManager({
                notificationList: [
                    newNotification({
                        msg: 'A similar justification already exists.',
                        type: NotificationType.Success,
                        id: expect.anything()
                    })
                ],
                notificationMap: expect.anything()
            })
        )
        expect(state.table.entityJustificationHistory.value.length).toEqual(1)
        expect(state.table.showEntityJustificationHistoryForIdPersistent).toEqual(
            newRemote(idPersistent0)
        )
    })
    expect(fetchMock.mock.calls.length).toEqual(6)
})
test('get justification error', async () => {
    const fetchMock = vi.fn()
    const errorMsg = 'error getting justification history'
    addEntitiesAndInstancesResponse(fetchMock)
    addResponseSequence(fetchMock, [[500, { msg: errorMsg }]])
    const { store } = renderWithProviders(
        <RemoteDataTable />,
        fetchMock,
        preloadedState
    )
    await openModalForEntity0()
    await waitFor(() => {
        expect(store.getState().notification).toEqual(
            newNotificationManager({
                notificationList: [
                    newNotification({
                        msg: errorMsg,
                        type: NotificationType.Error,
                        id: expect.anything()
                    })
                ],
                notificationMap: expect.anything()
            })
        )
    })
    expect(fetchMock.mock.calls.length).toEqual(5)
})
test('add justification error', async () => {
    const fetchMock = vi.fn()
    const errorMsg = 'error submitting justification'
    addEntitiesAndInstancesResponse(fetchMock)
    addJustificationHistoryResponse(fetchMock)
    addResponseSequence(fetchMock, [[500, { msg: errorMsg }]])
    const { store } = renderWithProviders(
        <RemoteDataTable />,
        fetchMock,
        preloadedState
    )
    const user = userEvent.setup()
    await openModalForEntity0()
    await fillJustificationForm(user)
    await waitFor(() => {
        const input = screen.getByRole('textbox', { name: 'New Comment' })
        expect(input.textContent).toEqual(justificationChanged)
        expect(screen.getAllByText(justificationChanged).length).toEqual(1)
        expect(store.getState().notification).toEqual(
            newNotificationManager({
                notificationList: [
                    newNotification({
                        msg: errorMsg,
                        type: NotificationType.Error,
                        id: expect.anything()
                    })
                ],
                notificationMap: expect.anything()
            })
        )
    })
    expect(fetchMock.mock.calls.length).toEqual(6)
})

const idPersistent0 = 'test-id-0'
const idPersistent1 = 'test-id-1'
const version0 = 0
const version1 = 1
const displayTxt0 = 'test display txt 0'
const displayTxt1 = 'test display txt 1'
const justification = 'very prolific shit poster'
const justification1 = 'tremendously prolific shit poster'
const justificationChanged = 'shit poster in chief'
const modalHeading = 'Entity Justification History'
const test_entity_rsp_0 = {
    display_txt: displayTxt0,
    display_txt_details: 'display_txt_detail',
    id_persistent: idPersistent0,
    version: version0,
    disabled: false,
    justification_txt: justification
}
const test_entity_rsp_1 = {
    display_txt: displayTxt1,
    display_txt_details: 'display_txt_detail',
    id_persistent: idPersistent1,
    version: version1,
    disabled: false,
    justification_txt: justification1
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
async function toggleJustifications() {
    await waitFor(() => {
        expect(screen.queryByText(modalHeading)).toBeNull()
        const button = screen.getByLabelText('show additional columns')
        ;(button?.childNodes[0] as HTMLInputElement)?.click()
    })
    await waitFor(() => {
        const columnLabel = screen.getByText('Justification')
        const columnListItem =
            columnLabel.parentElement?.parentElement?.parentElement?.parentElement
                ?.parentElement
        const columnButton = columnListItem?.children[1]
        expect(columnButton?.className).toEqual('icon')
        ;(columnButton as HTMLElement)?.click()

        screen.getByRole('button', { name: /close/i }).click()
    })
}

async function fillJustificationForm(user: UserEvent) {
    await waitFor(
        async () => {
            const input = screen.getByRole('textbox', { name: 'New Comment' })
            const button = screen.getByRole('button', { name: 'Submit' })
            await act(async () => {
                await user.click(input)
                await user.keyboard(justificationChanged)
                await user.click(button)
            })
        },
        { timeout: 3000 }
    )
}

async function closeModal() {
    await waitFor(
        () => {
            screen.getByText(modalHeading)
            const close = screen.getByRole('button', { name: /close/i })
            close.click()
        },
        { timeout: 2000 }
    )
}
const userApi = {
    username: nameUserTest,
    permission_group: 'CONTRIBUTOR',
    id_persistent: idUserTest
}
const timeJustification = '2005-03-18 09:57:51 +0000'

function addJustificationHistoryResponse(fetchMock: Mock) {
    addResponseSequence(fetchMock, [
        [
            200,
            {
                justifications: [
                    {
                        content: justification,
                        author: userApi,
                        timestamp: timeJustification
                    }
                ]
            }
        ]
    ])
}

async function openModalForEntity0() {
    await waitFor(() => {
        screen.getByText(displayTxt0)
        expect(screen.queryByText(modalHeading)).toBeNull()
        expect(screen.queryByText(justification)).toBeNull()
    })
    await toggleJustifications()
    await waitFor(() => {
        const text = screen.getByText(justification)
        text.click()
    })
}

function addEntitiesAndInstancesResponse(fetchMock: Mock) {
    addResponseSequence(fetchMock, [
        [
            200,
            {
                entity_list: [test_entity_rsp_0, test_entity_rsp_1],
                next_offset: version1 + 1
            }
        ],
        [200, { entity_list: [], next_offset: 0 }],
        [200, { value_list: [] }],
        [200, { column_list: [] }]
    ])
}

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
