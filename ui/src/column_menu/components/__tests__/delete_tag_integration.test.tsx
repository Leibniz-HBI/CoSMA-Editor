/**
 * @vitest-environment jsdom
 */
import { waitFor, screen } from '@testing-library/react'
import userEvent, { UserEvent } from '@testing-library/user-event'
import { ColumnDeleteForm } from '../form'
import {
    newColumn,
    newColumnHierarchyNode,
    ColumnType,
    newColumnSelectionState
} from '../../state'
import { newNotification, NotificationType } from '../../../util/notification/slice'
import { act } from 'react'
import { vi } from 'vitest'
import { addResponseSequence, expectFetchCallList } from '../../../util/tests/response'
import { emptyState, renderWithProviders } from '../../../util/tests/provider'

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
        await waitFor(
            async () => {
                const textBoxes = await screen.findAllByRole('textbox')
                expect(textBoxes.length).toEqual(2)
                await act(async () => {
                    await user.type(textBoxes[0], input)
                })
                const buttons = await screen.findAllByRole('button')
                buttons[0].click()
            },
            { timeout: 3000 }
        )
    }
    test('wrong input', async () => {
        const fetchMock = vi.fn()
        addResponseSequence(fetchMock, [[200, {}]])
        renderWithProviders(<ColumnDeleteForm column={columnTest} />, fetchMock, {
            preloadedState: { ...emptyState, columnSelection: columnSelectionState }
        })

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
            fetchMock,
            { preloadedState: { ...emptyState, columnSelection: columnSelectionState } }
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
        await expectFetchCallList(fetchMock.mock.calls, [
            [
                'http://127.0.0.1:8000/cosmae/api/columns',
                {
                    credentials: 'include',
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: {
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
                    }
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
        renderWithProviders(<ColumnDeleteForm column={columnTest} />, fetchMock, {
            preloadedState: { ...emptyState, columnSelection: columnSelectionState }
        })
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
            fetchMock,
            { preloadedState: { ...emptyState, columnSelection: columnSelectionState } }
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
        await expectFetchCallList(fetchMock.mock.calls, [
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
            fetchMock,
            { preloadedState: { ...emptyState, columnSelection: columnSelectionState } }
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

const columnSelectionState = newColumnSelectionState({
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
})
