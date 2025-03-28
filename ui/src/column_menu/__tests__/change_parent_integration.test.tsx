/**
 * @vitest-environment jsdom
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
    newTagHierarchyNode,
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
import { newRemote } from '../../util/state'
import { vi, Mock } from 'vitest'

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: {
        tagSelection: TagSelectionState
        notification: NotificationManager
    }
}

const nameTagDef = 'tag name'
const nameTagDef1 = 'tag name 1'

const idTagDef = 'id-tag-test'
const tagDefTest = newTagDefinition({
    namePath: [nameTagDef],
    idPersistent: idTagDef,
    columnType: TagType.String,
    idParentPersistent: undefined,
    hidden: false,
    version: 4,
    curated: true
})
const idTagDef1 = 'id-tag-test-1'
const tagDefTest1 = newTagDefinition({
    namePath: [nameTagDef1],
    idPersistent: idTagDef1,
    columnType: TagType.String,
    idParentPersistent: undefined,
    hidden: false,
    version: 4,
    curated: true
})

export function renderWithProviders(
    ui: React.ReactElement,
    fetchMock: Mock,
    {
        preloadedState = {
            tagSelection: newTagSelectionState({
                children: [
                    newTagHierarchyNode({
                        name: nameTagDef,
                        idTagDefinitionPersistent: idTagDef
                    }),
                    newTagHierarchyNode({
                        idTagDefinitionPersistent: idTagDef1,
                        name: nameTagDef1,
                        isExpanded: true
                    })
                ],
                tagDefinitionsByIdPersistent: {
                    [idTagDef]: newRemote(tagDefTest),
                    [idTagDef1]: newRemote(tagDefTest1)
                }
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
function addResponseSequence(mock: Mock, responses: [number, unknown][]) {
    for (const tpl of responses) {
        const [status_code, rsp] = tpl
        mock.mockImplementationOnce(
            vi.fn(() =>
                Promise.resolve({
                    status: status_code,
                    json: () => Promise.resolve(rsp)
                })
            ) as Mock
        )
    }
}

function dragTagDefinition(startName: string | RegExp, endName: string | undefined) {
    const start = screen.getByRole('button', { name: startName })
    let end = screen.getByTestId('no-parent-drop-zone')
    if (endName !== undefined) {
        end = screen.getByText(endName)
    }
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

test('success', async function () {
    const fetchMock = vi.fn()
    const newVersion = 5,
        newVersion1 = 6
    addResponseSequence(fetchMock, [
        [
            200,
            {
                tag_definitions: [
                    {
                        name_path: [nameTagDef1, nameTagDef],
                        id_persistent: idTagDef,
                        id_parent_persistent: idTagDef1,
                        type: 'STRING',
                        curated: true,
                        hidden: false,
                        version: newVersion
                    }
                ]
            }
        ],
        [
            200,
            {
                tag_definitions: [
                    {
                        name_path: [nameTagDef],
                        id_persistent: idTagDef,
                        id_parent_persistent: undefined,
                        type: 'STRING',
                        curated: true,
                        hidden: false,
                        version: newVersion1
                    }
                ]
            }
        ]
    ])
    const { store } = renderWithProviders(
        <ColumnSelector mkTailElement={mkTailElement} />,
        fetchMock
    )
    await waitFor(() => dragTagDefinition(nameTagDef, nameTagDef1))
    await waitFor(() => {
        expect(store.getState()).toEqual({
            tagSelection: newTagSelectionState({
                children: [
                    newTagHierarchyNode({
                        idTagDefinitionPersistent: idTagDef1,
                        name: nameTagDef1,
                        isExpanded: true,
                        children: [
                            newTagHierarchyNode({
                                name: nameTagDef,
                                idTagDefinitionPersistent: idTagDef
                            })
                        ]
                    })
                ],
                tagDefinitionsByIdPersistent: {
                    [idTagDef]: newRemote({
                        ...tagDefTest,
                        namePath: [nameTagDef1, nameTagDef],
                        idParentPersistent: idTagDef1,
                        version: newVersion
                    }),
                    [idTagDef1]: newRemote(tagDefTest1)
                }
            }),
            notification: newNotificationManager({})
        })
    })
    await waitFor(() => dragTagDefinition(/-> tag name/i, undefined))
    await waitFor(() => {
        expect(store.getState()).toEqual({
            tagSelection: newTagSelectionState({
                children: [
                    newTagHierarchyNode({
                        idTagDefinitionPersistent: idTagDef1,
                        name: nameTagDef1,
                        isExpanded: true
                    }),
                    newTagHierarchyNode({
                        name: nameTagDef,
                        idTagDefinitionPersistent: idTagDef
                    })
                ],
                tagDefinitionsByIdPersistent: {
                    [idTagDef]: newRemote({
                        ...tagDefTest,
                        namePath: [nameTagDef],
                        version: newVersion1
                    }),
                    [idTagDef1]: newRemote(tagDefTest1)
                }
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
        ],
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
                            type: 'STRING',
                            version: newVersion
                        }
                    ]
                })
            }
        ]
    ])
})

test('error', async function (){
    const fetchMock = vi.fn()
    const testError = 'Could not change parent'
    addResponseSequence(fetchMock, [[500, { msg: testError }]])
    const { store } = renderWithProviders(
        <ColumnSelector mkTailElement={mkTailElement} />,
        fetchMock
    )
    await waitFor(() => dragTagDefinition(nameTagDef, nameTagDef1))
    await waitFor(() => {
        expect(store.getState()).toEqual({
            tagSelection: newTagSelectionState({
                children: [
                    newTagHierarchyNode({
                        name: nameTagDef,
                        idTagDefinitionPersistent: idTagDef
                    }),
                    newTagHierarchyNode({
                        idTagDefinitionPersistent: idTagDef1,
                        name: nameTagDef1,
                        isExpanded: true
                    })
                ],
                tagDefinitionsByIdPersistent: {
                    [idTagDef]: newRemote(tagDefTest),
                    [idTagDef1]: newRemote(tagDefTest1)
                }
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
