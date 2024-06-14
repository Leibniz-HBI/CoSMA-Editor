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
import { tagSelectionSlice } from '../../../column_menu/slice'
import { newRemote } from '../../../util/state'

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
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
test('show justifications, open modal and hide again', async () => {
    const fetchMock = jest.fn()
    addEntitiesAndInstancesResponse(fetchMock)
    addJustificationHistoryResponse(fetchMock)
    renderWithProviders(<RemoteDataTable />, fetchMock)
    await openModalForEntity0()
    await closeModal()
    await toggleJustifications()
    await waitFor(() => {
        expect(screen.queryByText(justification)).toBeNull()
    })
})
test('add justification', async () => {
    const fetchMock = jest.fn()
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
    const { store } = renderWithProviders(<RemoteDataTable />, fetchMock)
    const user = userEvent.setup()
    await openModalForEntity0()
    await fillJustificationForm(user)
    await waitFor(() => {
        const input = screen.getByRole('textbox')
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
            'http://127.0.0.1:8000/cosmae/api/tags/definitions/children',
            {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: '{}'
            }
        ],
        [
            `http://127.0.0.1:8000/cosmae/api/persons/${idPersistent0}/justifications`,
            {
                credentials: 'include'
            }
        ],
        [
            `http://127.0.0.1:8000/cosmae/api/persons/${idPersistent0}/justifications`,
            {
                credentials: 'include',
                method: 'PUT',
                body: JSON.stringify({ justification_txt: justificationChanged })
            }
        ]
    ])
})
test('add justification found', async () => {
    const fetchMock = jest.fn()
    addEntitiesAndInstancesResponse(fetchMock)
    addJustificationHistoryResponse(fetchMock)
    addResponseSequence(fetchMock, [[302, {}]])
    const { store } = renderWithProviders(<RemoteDataTable />, fetchMock)
    const input = userEvent.setup()
    await openModalForEntity0()
    await fillJustificationForm(input)
    await waitFor(() => {
        const user = screen.getByRole('textbox')
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
    expect(fetchMock.mock.calls.length).toEqual(5)
})
test('get justification error', async () => {
    const fetchMock = jest.fn()
    const errorMsg = 'error getting justification history'
    addEntitiesAndInstancesResponse(fetchMock)
    addResponseSequence(fetchMock, [[500, { msg: errorMsg }]])
    const { store } = renderWithProviders(<RemoteDataTable />, fetchMock)
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
    expect(fetchMock.mock.calls.length).toEqual(4)
})
test('add justification error', async () => {
    const fetchMock = jest.fn()
    const errorMsg = 'error submitting justification'
    addEntitiesAndInstancesResponse(fetchMock)
    addJustificationHistoryResponse(fetchMock)
    addResponseSequence(fetchMock, [[500, { msg: errorMsg }]])
    const { store } = renderWithProviders(<RemoteDataTable />, fetchMock)
    const user = userEvent.setup()
    await openModalForEntity0()
    await fillJustificationForm(user)
    await waitFor(() => {
        const input = screen.getByRole('textbox')
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
    expect(fetchMock.mock.calls.length).toEqual(5)
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
const test_person_rsp_0 = {
    display_txt: displayTxt0,
    display_txt_details: 'display_txt_detail',
    id_persistent: idPersistent0,
    version: version0,
    disabled: false,
    justification_txt: justification
}
const test_person_rsp_1 = {
    display_txt: displayTxt1,
    display_txt_details: 'display_txt_detail',
    id_persistent: idPersistent1,
    version: version1,
    disabled: false,
    justification_txt: justification1
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
async function toggleJustifications() {
    await waitFor(() => {
        expect(screen.queryByText(modalHeading)).toBeNull()
        const button = screen.getByLabelText('show additional tags')
        ;(button?.childNodes[0] as HTMLInputElement)?.click()
    })
    await waitFor(() => {
        const tagDefLabel = screen.getByText('Justification')
        const tagListItem =
            tagDefLabel.parentElement?.parentElement?.parentElement?.parentElement
        const tagButton = tagListItem?.children[1]
        expect(tagButton?.className).toEqual('icon')
        ;(tagButton as HTMLElement)?.click()

        screen.getByRole('button', { name: /close/i }).click()
    })
}

async function fillJustificationForm(user: UserEvent) {
    await waitFor(
        async () => {
            const input = screen.getByRole('textbox')
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

function addJustificationHistoryResponse(fetchMock: jest.Mock) {
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

function addEntitiesAndInstancesResponse(fetchMock: jest.Mock) {
    addResponseSequence(fetchMock, [
        [200, { persons: [test_person_rsp_0, test_person_rsp_1] }],
        [200, { tag_instances: [] }],
        [200, { tag_definitions: [] }]
    ])
}
interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: {
        notification: NotificationManager
        table: TableState
        tableSelection: TableSelectionState
        tagSelection: TagSelectionState
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
            tagSelection: newTagSelectionState({}),
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
            tagSelection: tagSelectionSlice.reducer,
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
