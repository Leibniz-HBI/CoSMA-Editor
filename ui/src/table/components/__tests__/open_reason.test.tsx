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
import { TableState, newTableState } from '../../state'
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
import userEvent, { UserEvent } from '@testing-library/user-event'
import { act } from 'react-dom/test-utils'

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
                                    return (
                                        <Col
                                            onClick={() =>
                                                props.onCellActivated([idxCol, idxRow])
                                            }
                                        >
                                            {cell.displayData}
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
test('show reasons, open modal and hide again', async () => {
    const fetchMock = jest.fn()
    addEntitiesAndInstancesResponse(fetchMock)
    addReasonHistoryResponse(fetchMock)
    renderWithProviders(<RemoteDataTable />, fetchMock)
    await openModalForEntity0(modalHeading)
    await closeModal()
    await waitFor(() => {
        expect(screen.queryByText(modalHeading)).toBeNull()
        const toggle = screen.getByRole('checkbox')
        toggle.click()
    })
    await waitFor(() => {
        expect(screen.queryByText(reason0)).toBeNull()
    })
})
test('add reason', async () => {
    const fetchMock = jest.fn()
    addEntitiesAndInstancesResponse(fetchMock)
    addReasonHistoryResponse(fetchMock)
    addResponseSequence(fetchMock, [
        [
            200,
            {
                reason: {
                    content: reasonChanged,
                    author: userApi,
                    timestamp: '2005-03-19 09:37:51 +0000'
                }
            }
        ]
    ])
    const { store } = renderWithProviders(<RemoteDataTable />, fetchMock)
    await openModalForEntity0(modalHeading)
    const user = userEvent.setup()
    await fillReasonForm(user)
    await waitFor(() => {
        const input = screen.getByRole('textbox')
        expect(input.textContent).toEqual('')
        screen.getByText(reason0)
        // once in table, once in modal
        expect(screen.getAllByText(reasonChanged).length).toEqual(2)
    })
    await closeModal()
    await waitFor(() => {
        expect(screen.queryByText(modalHeading)).toBeNull()
        expect(screen.queryByText(reason0)).toBeNull()
        screen.queryByText(reasonChanged)
    })
    const state = store.getState()
    expect(state.notification.notificationList).toEqual([])
    expect(state.table.entities?.at(0)?.reasonTxt).toEqual(reasonChanged)
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
        ],
        [
            `http://127.0.0.1:8000/cosmae/api/persons/${idPersistent0}/reasons`,
            {
                credentials: 'include'
            }
        ],
        [
            `http://127.0.0.1:8000/cosmae/api/persons/${idPersistent0}/reasons`,
            {
                credentials: 'include',
                method: 'PUT',
                body: JSON.stringify({ reason_txt: reasonChanged })
            }
        ]
    ])
})
test('get reason error', async () => {
    const fetchMock = jest.fn()
    const errorMsg = 'error getting reason history'
    addEntitiesAndInstancesResponse(fetchMock)
    addResponseSequence(fetchMock, [[500, { msg: errorMsg }]])
    const { store } = renderWithProviders(<RemoteDataTable />, fetchMock)
    await openModalForEntity0(modalHeading)
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
    expect(fetchMock.mock.calls.length).toEqual(3)
})
test('add reason error', async () => {
    const fetchMock = jest.fn()
    const errorMsg = 'error submitting reason'
    addEntitiesAndInstancesResponse(fetchMock)
    addReasonHistoryResponse(fetchMock)
    addResponseSequence(fetchMock, [[500, { msg: errorMsg }]])
    const { store } = renderWithProviders(<RemoteDataTable />, fetchMock)
    await openModalForEntity0(modalHeading)
    const user = userEvent.setup()
    await fillReasonForm(user)
    await waitFor(() => {
        const input = screen.getByRole('textbox')
        expect(input.textContent).toEqual(reasonChanged)
        expect(screen.getAllByText(reasonChanged).length).toEqual(1)
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
    expect(fetchMock.mock.calls.length).toEqual(4)
})

const idPersistent0 = 'test-id-0'
const idPersistent1 = 'test-id-1'
const version0 = 0
const version1 = 1
const displayTxt0 = 'test display txt 0'
const displayTxt1 = 'test display txt 1'
const reason0 = 'very prolific shit poster'
const reason1 = 'tremendously prolific shit poster'
const reasonChanged = 'shit poster in chief'
const modalHeading = 'Entity Reason History'
const test_person_rsp_0 = {
    display_txt: displayTxt0,
    display_txt_details: 'display_txt_detail',
    id_persistent: idPersistent0,
    version: version0,
    disabled: false,
    reason_txt: reason0
}
const test_person_rsp_1 = {
    display_txt: displayTxt1,
    display_txt_details: 'display_txt_detail',
    id_persistent: idPersistent1,
    version: version1,
    disabled: false,
    reason_txt: reason1
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
async function fillReasonForm(user: UserEvent) {
    await waitFor(
        async () => {
            const input = screen.getByRole('textbox')
            const button = screen.getByRole('button', { name: 'Submit' })
            await act(async () => {
                await user.click(input)
                await user.keyboard(reasonChanged)
                await user.click(button)
            })
        },
        { timeout: 3000 }
    )
}

async function closeModal() {
    await waitFor(() => {
        screen.getByText(modalHeading)
        const close = screen.getByRole('button', { name: /close/i })
        close.click()
    })
}
const userApi = {
    username: nameUserTest,
    permission_group: 'CONTRIBUTOR',
    id_persistent: idUserTest
}

function addReasonHistoryResponse(fetchMock: jest.Mock) {
    addResponseSequence(fetchMock, [
        [
            200,
            {
                reasons: [
                    {
                        content: reason0,
                        author: userApi,
                        timestamp: '2005-03-18 09:57:51 +0000'
                    }
                ]
            }
        ]
    ])
}

async function openModalForEntity0(modalHeading: string) {
    await waitFor(() => {
        screen.getByText(displayTxt0)
        expect(screen.queryByText(modalHeading)).toBeNull()
        expect(screen.queryByText(reason0)).toBeNull()
        const toggle = screen.getByRole('checkbox')
        toggle.click()
    })
    await waitFor(() => {
        const text = screen.getByText(reason0)
        text.click()
    })
}

function addEntitiesAndInstancesResponse(fetchMock: jest.Mock) {
    addResponseSequence(fetchMock, [
        [200, { persons: [test_person_rsp_0, test_person_rsp_1] }],
        [200, { tag_instances: [] }]
    ])
}
interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: {
        notification: NotificationManager
        table: TableState
        tableSelection: TableSelectionState
        user: UserState
    }
}

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
            user: userSlice.reducer
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
