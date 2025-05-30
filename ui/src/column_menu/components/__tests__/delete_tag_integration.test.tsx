/**
 * @vitest-environment jsdom
 */
import { render, waitFor, screen, RenderOptions } from '@testing-library/react'
import userEvent, { UserEvent } from '@testing-library/user-event'
import { ColumnDeleteForm } from '../form'
import { Provider } from 'react-redux'
import {
    newColumn,
    newColumnHierarchyNode,
    newColumnSelectionState,
    ColumnSelectionState,
    ColumnType
} from '../../state'
import {
    newNotification,
    newNotificationManager,
    NotificationManager,
    notificationReducer,
    NotificationType
} from '../../../util/notification/slice'
import { configureStore } from '@reduxjs/toolkit'
import { columnSelectionReducer} from '../../slice'
import { act, PropsWithChildren } from 'react'
import { vi, Mock } from 'vitest'

const idColumn = 'id-column-def'
const idParentPersistent = 'id-parent'
const idChild = 'id-child'
const nameColumn = 'name column',
    nameParent = 'name parent',
    nameChild = 'name child'
const columnTest = newColumn({
    idPersistent: idColumn,
    idParentPersistent,
    namePath: [nameParent, nameColumn],
    columnType: ColumnType.String,
    curated: false,
    disabled: false,
    hidden: false,
    version: 1
})

describe('disable', () => {
    async function submitDisable(user: UserEvent, input = 'DISABLE') {
        await waitFor(async () => {
            const textBoxes = await screen.findAllByRole('textbox')
            expect(textBoxes.length).toEqual(2)
            await act(async () => {
                await user.type(textBoxes[0], input)
            })
            const buttons = await screen.findAllByRole('button')
            buttons[0].click()
        })
    }
    test('wrong input', async () => {
        const fetchMock = vi.fn()
        addResponseSequence(fetchMock, [[200, {}]])
        renderWithProviders(<ColumnDeleteForm column={columnTest} />, fetchMock)
        const user = userEvent.setup()
        await submitDisable(user, 'other')
        await waitFor(() => {
            expect(screen.getByText('Your input does not match DISABLE.'))
        }) //
    })
    test('success', async () => {
        const fetchMock = vi.fn()
        addResponseSequence(fetchMock, [
            [
                200,
                {
                    column_list: [
                        {
                            id_persistent: idColumn,
                            disabled: true,
                            hidden: false,
                            id_parent_persistent: null,
                            name: nameColumn,
                            name_path: ['name_column'],
                            description: '',
                            type: 'STRING',
                            owner: null
                        }
                    ]
                }
            ]
        ])
        const { store } = renderWithProviders(
            <ColumnDeleteForm column={columnTest} />,
            fetchMock
        )
        const user = userEvent.setup()
        await submitDisable(user)
        await waitFor(() => {
            expect(store.getState().notification.notificationList).toEqual([
                newNotification({
                    msg: 'Successfully disabled column definition.',
                    type: NotificationType.Success,
                    id: expect.anything()
                })
            ])
            expect(store.getState().columnSelection.children).toEqual([
                newColumnHierarchyNode({
                    idColumnPersistent: idParentPersistent,
                    name: nameParent,
                    children: [
                        newColumnHierarchyNode({
                            idColumnPersistent: idChild,
                            name: nameChild
                        })
                    ]
                })
            ])
        })
        expect(fetchMock.mock.calls).toEqual([
            [
                'http://127.0.0.1:8000/cosmae/api/columns',
                {
                    credentials: 'include',
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        column_list: [
                            {
                                name: nameColumn,
                                id_parent_persistent: idParentPersistent,
                                type: 'STRING',
                                description: '',
                                disabled: true,
                                id_persistent: idColumn,
                                version: 1
                            }
                        ]
                    })
                }
            ]
        ])
        //TODO test state
    })
    test('failure', async () => {
        const fetchMock = vi.fn()
        const testError = 'Could not disable column in test.'
        addResponseSequence(fetchMock, [[500, { msg: testError }]])
        const { store } = renderWithProviders(
            <ColumnDeleteForm column={columnTest} />,
            fetchMock
        )
        const user = userEvent.setup()
        await submitDisable(user)
        waitFor(() => {
            expect(store.getState().notification.notificationList).toEqual([
                newNotification({
                    msg: testError,
                    type: NotificationType.Error,
                    id: expect.anything()
                })
            ])
        })
    })
})
describe('purge', () => {
    async function submitPurge(user: UserEvent, input = 'PURGE') {
        await waitFor(async () => {
            const textBoxes = await screen.findAllByRole('textbox')
            expect(textBoxes.length).toEqual(2)
            await act(async () => {
                await user.type(textBoxes[1], input)
            })
            const buttons = await screen.findAllByRole('button')
            buttons[1].click()
        })
    }
    test('wrong input', async () => {
        const fetchMock = vi.fn()
        addResponseSequence(fetchMock, [[200, {}]])
        renderWithProviders(<ColumnDeleteForm column={columnTest} />, fetchMock)
        const user = userEvent.setup()
        await submitPurge(user, 'other')
        await waitFor(() => {
            expect(screen.getByText('Your input does not match PURGE.'))
        }) //
    })
    test('success', async () => {
        const fetchMock = vi.fn()
        addResponseSequence(fetchMock, [[200, {}]])
        const { store } = renderWithProviders(
            <ColumnDeleteForm column={columnTest} />,
            fetchMock
        )
        const user = userEvent.setup()
        await submitPurge(user)
        await waitFor(() => {
            expect(store.getState().notification.notificationList).toEqual([
                newNotification({
                    msg: 'Successfully purged column definition.',
                    type: NotificationType.Success,
                    id: expect.anything()
                })
            ])
            expect(store.getState().columnSelection.children).toEqual([
                newColumnHierarchyNode({
                    idColumnPersistent: idParentPersistent,
                    name: nameParent,
                    children: [
                        newColumnHierarchyNode({
                            idColumnPersistent: idChild,
                            name: nameChild
                        })
                    ]
                })
            ])
        })
        expect(fetchMock.mock.calls).toEqual([
            [
                `http://127.0.0.1:8000/cosmae/api/columns/${idColumn}`,
                {
                    credentials: 'include',
                    method: 'DELETE'
                }
            ]
        ])
        //TODO test state
    })
    test('failure', async () => {
        const fetchMock = vi.fn()
        const testError = 'Could not disable column in test.'
        addResponseSequence(fetchMock, [[500, { msg: testError }]])
        const { store } = renderWithProviders(
            <ColumnDeleteForm column={columnTest} />,
            fetchMock
        )
        const user = userEvent.setup()
        await submitPurge(user)
        waitFor(() => {
            expect(store.getState().notification.notificationList).toEqual([
                newNotification({
                    msg: testError,
                    type: NotificationType.Error,
                    id: expect.anything()
                })
            ])
        })
    })
})

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: {
        columnSelection: ColumnSelectionState
        notification: NotificationManager
    }
}

export function renderWithProviders(
    ui: React.ReactElement,
    fetchMock: Mock,
    {
        preloadedState = {
            columnSelection: newColumnSelectionState({
                children: [
                    newColumnHierarchyNode({
                        idColumnPersistent: idParentPersistent,
                        name: nameParent,
                        children: [
                            newColumnHierarchyNode({
                                idColumnPersistent: idColumn,
                                name: nameColumn,
                                children: [
                                    newColumnHierarchyNode({
                                        idColumnPersistent: idChild,
                                        name: nameChild
                                    })
                                ]
                            })
                        ]
                    })
                ]
            }),
            notification: newNotificationManager({})
        },
        ...renderOptions
    }: ExtendedRenderOptions = {}
) {
    const store = configureStore({
        reducer: {
            columnSelection: columnSelectionReducer,
            notification: notificationReducer
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
function addResponseSequence(mock: Mock, responses: [number, unknown][]) {
    for (const tpl of responses) {
        const [status_code, rsp] = tpl
        mock.mockImplementationOnce(
            vi.fn(async () => {
                await new Promise((promise) => setTimeout(promise, 50))
                return {
                    status: status_code,
                    json: () => Promise.resolve(rsp)
                }
            }) as Mock
        )
    }
}
