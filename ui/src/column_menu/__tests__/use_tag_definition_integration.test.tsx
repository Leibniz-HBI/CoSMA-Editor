/**
 * @vitest-environment jsdom
 */

import { RenderOptions, render, waitFor, screen } from '@testing-library/react'
import {
    TagSelectionState,
    TagType,
    newTagDefinition,
    newTagSelectionState
} from '../state'
import { configureStore } from '@reduxjs/toolkit'
import { tagSelectionSlice } from '../slice'
import React, { PropsWithChildren } from 'react'
import { Provider } from 'react-redux'
import {
    NotificationManager,
    NotificationType,
    newNotification,
    newNotificationManager,
    notificationReducer
} from '../../util/notification/slice'
import { newRemote } from '../../util/state'

import { useTagDefinition } from '../hooks'
import {
    displayTextColumn,
    displayTxtColumnId,
    justificationColumn,
    justificationColumnId
} from '../../table/state'

function TestComponent({ idPersistent }: { idPersistent: string }) {
    const tagDefinition = useTagDefinition(idPersistent)
    let label = 'undefined'

    if (tagDefinition.isLoading) {
        label = 'loading'
    }
    if (tagDefinition.value !== undefined) {
        label = tagDefinition.value.namePath.at(-1) ?? 'empty name'
    }
    return <div>{label}</div>
}

const idTagDef = 'id-tag-test'
const nameTagDef = 'tag name'
const tagDefTest = newTagDefinition({
    namePath: [nameTagDef],
    idPersistent: idTagDef,
    columnType: TagType.String,
    idParentPersistent: undefined,
    hidden: false,
    version: 0,
    curated: true
})
test('success', async () => {
    const fetchMock = vi.fn()
    addResponseSequence(fetchMock, [
        [
            200,
            {
                column_list: [
                    {
                        name_path: [nameTagDef],
                        id_persistent: idTagDef,
                        id_parent_persistent: undefined,
                        type: 'STRING',
                        curated: true,
                        hidden: false,
                        version: 0
                    }
                ]
            }
        ]
    ])
    const { store } = renderWithProviders(
        <TestComponent idPersistent={idTagDef} />,
        fetchMock
    )
    await waitFor(() => {
        screen.getByText('loading')
    })
    await waitFor(() => {
        screen.getByText(nameTagDef)
    })
    expect(fetchMock.mock.calls).toEqual([
        [
            'http://127.0.0.1:8000/cosmae/api/columns/details',
            {
                method: 'POST',
                credentials: 'include',
                body: JSON.stringify({ id_persistent_list: [idTagDef] })
            }
        ]
    ])
    expect(store.getState().tagSelection).toEqual(
        newTagSelectionState({
            tagDefinitionsByIdPersistent: {
                [displayTxtColumnId]: newRemote(displayTextColumn),
                [justificationColumnId]: newRemote(justificationColumn),
                [idTagDef]: newRemote(tagDefTest)
            }
        })
    )
})

test('error', async () => {
    const fetchMock = vi.fn()
    const testError = 'Could not get tag definition details.'
    addResponseSequence(fetchMock, [[500, { msg: testError }]])
    const { store } = renderWithProviders(
        <TestComponent idPersistent={idTagDef} />,
        fetchMock
    )
    await waitFor(() => {
        screen.getByText('loading')
    })
    await waitFor(() => {
        screen.getByText('undefined')
    })
    const state = store.getState()
    expect(state.tagSelection).toEqual(
        newTagSelectionState({
            tagDefinitionsByIdPersistent: {
                [displayTxtColumnId]: newRemote(displayTextColumn),
                [justificationColumnId]: newRemote(justificationColumn),
                [idTagDef]: newRemote(undefined)
            }
        })
    )
    expect(state.notification.notificationList).toEqual([
        newNotification({
            msg: testError,
            type: NotificationType.Error,
            id: expect.anything()
        })
    ])
})

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: {
        tagSelection: TagSelectionState
        notification: NotificationManager
    }
}

export function renderWithProviders(
    ui: React.ReactElement,
    fetchMock: Mock,
    {
        preloadedState = {
            tagSelection: newTagSelectionState({}),
            notification: newNotificationManager({})
        },
        ...renderOptions
    }: ExtendedRenderOptions = {}
) {
    const store = configureStore({
        reducer: {
            tagSelection: tagSelectionSlice.reducer,
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
