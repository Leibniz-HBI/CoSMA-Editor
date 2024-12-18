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
    UserPermissionGroup,
    newPublicUserInfo,
    newUserInfo
} from '../../../user/state'
import { TableState, newTableState } from '../../state'
import { newEntity } from '../../../entity/state'
import {
    NotificationManager,
    newNotificationManager,
    notificationReducer
} from '../../../util/notification/slice'
import { RenderOptions, waitFor, render, screen } from '@testing-library/react'
import { tableReducer } from '../../slice'
import { configureStore } from '@reduxjs/toolkit'
import { PropsWithChildren } from 'react'
import { Provider } from 'react-redux'
import { TableSelectionState, tableSelectionSlice } from '../../selection/slice'
import { EntityAddModal } from '../modals'
import userEvent, { UserEvent } from '@testing-library/user-event'
import { newRemote } from '../../../util/state'
import { authReducer } from '../../../auth/slice'
import { AuthState, newAuthState } from '../../../auth/state'

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
const version0 = 0
const displayTxt0 = 'test display txt 0'
const justification0 = 'Tremendously terrific shit poster.'

test('success new entity', async () => {
    const fetchMock = jest.fn()
    addEntityResponse(fetchMock, displayTxt0, justification0)
    const { store } = renderWithProviders(<EntityAddModal />, fetchMock)
    const user = userEvent.setup()
    await fillEntityForm(user, displayTxt0, justification0)
    await waitFor(() => {
        const state = store.getState()
        expect(state.table.entities).toEqual([
            newEntity({
                displayTxt: displayTxt0,
                idPersistent: idPersistent0,
                version: version0,
                disabled: false,
                justificationTxt: justification0,
                displayTxtDetails: 'display_txt_detail'
            })
        ])
    })
    expect(fetchMock.mock.calls).toEqual([
        [
            'http://127.0.0.1/api/entities',
            {
                body: JSON.stringify({
                    entity_list: [
                        { display_txt: displayTxt0, justification_txt: justification0 }
                    ]
                }),
                credentials: 'include',
                method: 'POST'
            }
        ]
    ])
})
test('success new entity no display text', async () => {
    const fetchMock = jest.fn()
    addEntityResponse(fetchMock, displayTxt0, justification0)
    const { store } = renderWithProviders(<EntityAddModal />, fetchMock)
    const user = userEvent.setup()
    await fillEntityForm(user, undefined, justification0)
    await waitFor(() => {
        const state = store.getState()
        expect(state.table.entities).toEqual([
            newEntity({
                displayTxt: displayTxt0,
                idPersistent: idPersistent0,
                version: version0,
                disabled: false,
                justificationTxt: justification0,
                displayTxtDetails: 'display_txt_detail'
            })
        ])
    })
    expect(fetchMock.mock.calls).toEqual([
        [
            'http://127.0.0.1/api/entities',
            {
                credentials: 'include',
                body: JSON.stringify({
                    entity_list: [{ justification_txt: justification0 }]
                }),
                method: 'POST',
            }
        ]
    ])
})

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: {
        notification: NotificationManager
        table: TableState
        tableSelection: TableSelectionState
        auth: AuthState
    }
}

function addEntityResponse(
    fetchMock: jest.Mock,
    displayTxt: string,
    justification: string
) {
    addResponseSequence(fetchMock, [
        [
            200,
            {
                entity_list: [
                    {
                        id_persistent: idPersistent0,
                        display_txt: displayTxt,
                        display_txt_details: 'display_txt_detail',
                        justification_txt: justification,
                        version: version0,
                        disabled: false
                    }
                ]
            }
        ]
    ])
}

async function fillEntityForm(
    user: UserEvent,
    displayTxt: string | undefined,
    justification: string
) {
    await waitFor(
        async () => {
            const textBoxes = screen.getAllByRole('textbox')
            expect(textBoxes.length).toEqual(2)
            const button = screen.getByRole('button', { name: 'Add Entity' })
            if (displayTxt !== undefined) {
                await user.type(textBoxes[0], displayTxt ?? ' ')
            }
            await user.type(textBoxes[1], justification)
            await user.click(button)
        },
        { timeout: 4000 }
    )
}

export function renderWithProviders(
    ui: React.ReactElement,
    fetchMock: jest.Mock,
    {
        preloadedState = {
            notification: newNotificationManager({}),
            table: newTableState({ showEntityAddDialog: true }),
            tableSelection: { rows: [], cols: [], rowSelectionOrder: [] },
            auth: newAuthState({
                user: newRemote(
                    newUserInfo({
                        ...userTest,
                        email: 'mail@test.org',
                        namesPersonal: 'names personal',
                        columns: []
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
            auth: authReducer
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

const nameUserTest = 'user_test'
const idUserTest = 'id-user-test'
const userTest = newPublicUserInfo({
    idPersistent: idUserTest,
    username: nameUserTest,
    permissionGroup: UserPermissionGroup.CONTRIBUTOR
})
