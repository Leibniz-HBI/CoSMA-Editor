/**
 * @jest-environment jsdom
 */

import {
    RenderOptions,
    render,
    waitFor,
    screen,
    fireEvent
} from '@testing-library/react'
import {
    TagDefinition,
    TagSelectionState,
    TagType,
    newTagDefinition,
    newTagSelectionEntry,
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
import { ColumnSelector } from '../components/selection'

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: {
        tagSelection: TagSelectionState
        notification: NotificationManager
    }
}

const nameTagDef = 'tag name'
const nameTagDef1 = 'tag name 1'

const tagDefTest = newTagDefinition({
    namePath: [nameTagDef],
    idPersistent: 'id-tag-test',
    columnType: TagType.String,
    idParentPersistent: undefined,
    hidden: false,
    version: 4,
    curated: true
})
const tagDefTest1 = newTagDefinition({
    namePath: [nameTagDef1],
    idPersistent: 'id-tag-test-1',
    columnType: TagType.String,
    idParentPersistent: undefined,
    hidden: false,
    version: 4,
    curated: true
})

export function renderWithProviders(
    ui: React.ReactElement,
    fetchMock: jest.Mock,
    {
        preloadedState = {
            tagSelection: newTagSelectionState({
                navigationEntries: [
                    newTagSelectionEntry({
                        columnDefinition: tagDefTest
                    }),
                    newTagSelectionEntry({ columnDefinition: tagDefTest1 })
                ]
            }),
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
function addResponseSequence(mock: jest.Mock, responses: [number, unknown][]) {
    for (const tpl of responses) {
        const [status_code, rsp] = tpl
        mock.mockImplementationOnce(
            jest.fn(() =>
                Promise.resolve({
                    status: status_code,
                    json: () => Promise.resolve(rsp)
                })
            ) as jest.Mock
        )
    }
}

function dragTagDefinition() {
    const start = screen.getByRole('button', { name: nameTagDef })
    const end = screen.getByText(nameTagDef1)
    const dataTransferObject: { [key: string]: string } = {}
    const dataTransfer = {
        setData: (key: string, data: string) => (dataTransferObject[key] = data),
        getData: (key: string) => dataTransferObject[key]
    }
    fireEvent.dragStart(start, { dataTransfer })
    fireEvent.dragOver(end)
    fireEvent.drop(end, { dataTransfer })
    fireEvent.dragEnd(start)
}

function mkTailElement(_tagDefinition: TagDefinition) {
    return <div />
}

test('success', async () => {
    const fetchMock = jest.fn()
    addResponseSequence(fetchMock, [[200, {}]])
    const { store } = renderWithProviders(
        <ColumnSelector mkTailElement={mkTailElement} />,
        fetchMock
    )
    await waitFor(() => dragTagDefinition())
    await waitFor(() => {
        expect(store.getState()).toEqual({
            tagSelection: newTagSelectionState({
                navigationEntries: [
                    newTagSelectionEntry({
                        columnDefinition: tagDefTest1,
                        children: [
                            newTagSelectionEntry({
                                columnDefinition: {
                                    ...tagDefTest,
                                    namePath: [nameTagDef1, nameTagDef]
                                }
                            })
                        ]
                    })
                ]
            }),
            notification: newNotificationManager({})
        })
    })
    expect(fetchMock.mock.calls).toEqual([
        [
            'http://127.0.0.1:8000/cosmae/api/tags/definitions',
            {
                method: 'POST',
                credentials: 'include',
                body: JSON.stringify({
                    tag_definitions: [
                        {
                            id_persistent: tagDefTest.idPersistent,
                            name: nameTagDef,
                            id_parent_persistent: tagDefTest1.idPersistent,
                            type: 'STRING',
                            version: tagDefTest.version
                        }
                    ]
                })
            }
        ]
    ])
})
test('error', async () => {
    const fetchMock = jest.fn()
    const testError = 'Could not change parent'
    addResponseSequence(fetchMock, [[500, { msg: testError }]])
    const { store } = renderWithProviders(
        <ColumnSelector mkTailElement={mkTailElement} />,
        fetchMock
    )
    await waitFor(() => dragTagDefinition())
    await waitFor(() => {
        expect(store.getState()).toEqual({
            tagSelection: newTagSelectionState({
                navigationEntries: [
                    newTagSelectionEntry({ columnDefinition: tagDefTest }),
                    newTagSelectionEntry({
                        columnDefinition: tagDefTest1
                    })
                ]
            }),
            notification: newNotificationManager({
                notificationList: [
                    newNotification({
                        msg: testError,
                        type: NotificationType.Error,
                        id: expect.anything()
                    })
                ],
                notificationMap: expect.anything()
            })
        })
    })
    expect(fetchMock.mock.calls).toEqual([
        [
            'http://127.0.0.1:8000/cosmae/api/tags/definitions',
            {
                method: 'POST',
                credentials: 'include',
                body: JSON.stringify({
                    tag_definitions: [
                        {
                            id_persistent: tagDefTest.idPersistent,
                            name: nameTagDef,
                            id_parent_persistent: tagDefTest1.idPersistent,
                            type: 'STRING',
                            version: tagDefTest.version
                        }
                    ]
                })
            }
        ]
    ])
})
