/**
 * @vitest-environment jsdom
 */

import {vi, Mock }  from 'vitest'
import {
    RenderOptions,
    render,
    waitFor,
    screen,
    getAllByTestId
} from '@testing-library/react'
import {
    NotificationManager,
    NotificationType,
    newNotification,
    newNotificationManager,
    notificationReducer
} from '../../../util/notification/slice'
import { configureStore } from '@reduxjs/toolkit'
import { PropsWithChildren } from 'react'
import { Provider } from 'react-redux'
import { MergeRequestConflictResolutionView } from '../components'
import { newRemote } from '../../../util/state'
import { UserPermissionGroup, newPublicUserInfo } from '../../../user/state'
import { TagType, newTagDefinition } from '../../../column_menu/state'
import {
    MergeRequestConflictResolutionState,
    newMergeRequestConflict,
    newMergeRequestConflictResolutionState,
    newMergeRequestConflictsByState,
    newTagInstance,
    ReplacementState
} from '../state'
import { tagMergeRequestConflictsReducer } from '../slice'
import { newEntity } from '../../../entity/state'
import { MergeRequestStep, newMergeRequest } from '../../state'
import { act } from 'react-dom/test-utils'
import userEvent from '@testing-library/user-event'

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: {
        notification: NotificationManager
        tagMergeRequestConflicts: MergeRequestConflictResolutionState
    }
}

export function renderWithProviders(
    ui: React.ReactElement,
    fetchMock: vi.mock,
    {
        preloadedState = {
            tagMergeRequestConflicts: newMergeRequestConflictResolutionState({}),
            notification: newNotificationManager({})
        },
        ...renderOptions
    }: ExtendedRenderOptions = {}
) {
    const store = configureStore({
        reducer: {
            notification: notificationReducer,
            tagMergeRequestConflicts: tagMergeRequestConflictsReducer
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
function addResponseSequence(mock: vi.mock, responses: [number, unknown][]) {
    for (const tpl of responses) {
        const [status_code, rsp] = tpl
        mock.mockImplementationOnce(
            vi.fn(() =>
                Promise.resolve({
                    status: status_code,
                    json: () => Promise.resolve(rsp)
                })
            ) as vi.mock
        )
    }
}
const replacementValue = 'test replacement value'
const tagDefOrigin = newTagDefinition({
    namePath: ['tag def origin test'],
    idPersistent: 'id-tag-def-origin-test',
    curated: false,
    version: 84,
    columnType: TagType.String,
    hidden: false
})
const tagDefDestination = newTagDefinition({
    namePath: ['tag def destination test'],
    idPersistent: 'id-tag-def-destination-test',
    curated: false,
    version: 841,
    columnType: TagType.String,
    hidden: false
})
const tagInstanceOrigin = newTagInstance({
    idPersistent: 'id-instance-origin-test1',
    version: 12,
    value: 'value test origin'
})
const tagInstanceDestination = newTagInstance({
    idPersistent: 'id-instance-destination-test1',
    version: 121,
    value: 'value test destination1'
})
const sharedConflict1 = newRemote(
    newMergeRequestConflict({
        entity: newEntity({
            idPersistent: 'id-entity-test1',
            displayTxt: 'test entity1',
            displayTxtDetails: 'display_txt_detail',
            version: 81,
            disabled: false
        }),
        tagInstanceOrigin: tagInstanceOrigin,
        tagInstanceDestination: tagInstanceDestination
    })
)
const sharedConflict = newRemote(
    newMergeRequestConflict({
        entity: newEntity({
            idPersistent: 'id-entity-test',
            displayTxt: 'test entity',
            displayTxtDetails: 'display_txt_detail',
            version: 8,
            disabled: false
        }),
        tagInstanceOrigin: newTagInstance({
            idPersistent: 'id-instance-origin-test',
            version: 12,
            value: 'value test origin'
        }),
        tagInstanceDestination: newTagInstance({
            idPersistent: 'id-instance-destination-test',
            version: 12,
            value: 'value test destination'
        })
    })
)
const updatedConflicts = [sharedConflict, sharedConflict1]
const entity = newEntity({
    idPersistent: 'id-entity-test3',
    displayTxt: 'test entity3',
    displayTxtDetails: 'display_txt_detail',
    version: 83,
    disabled: false
})
const sharedConflictJson = {
    tag_instance_origin: {
        id_persistent: sharedConflict.value.tagInstanceOrigin.idPersistent,
        version: sharedConflict.value.tagInstanceOrigin.version,
        value: sharedConflict.value.tagInstanceOrigin.value
    },
    tag_instance_destination: {
        id_persistent: sharedConflict.value.tagInstanceDestination?.idPersistent,
        version: sharedConflict.value.tagInstanceDestination?.version,
        value: sharedConflict.value.tagInstanceDestination?.value
    },
    entity: {
        id_persistent: sharedConflict.value.entity.idPersistent,
        display_txt: sharedConflict.value.entity.displayTxt,
        display_txt_details: 'display_txt_detail',
        version: sharedConflict.value.entity.version,
        disabled: false
    },
    replacement_state: sharedConflict.value.replacementState
}
const sharedConflictJson1 = {
    tag_instance_origin: {
        id_persistent: sharedConflict1.value.tagInstanceOrigin.idPersistent,
        version: sharedConflict1.value.tagInstanceOrigin.version,
        value: sharedConflict1.value.tagInstanceOrigin.value
    },
    tag_instance_destination: {
        id_persistent: sharedConflict1.value.tagInstanceDestination?.idPersistent,
        version: sharedConflict1.value.tagInstanceDestination?.version,
        value: sharedConflict1.value.tagInstanceDestination?.value
    },
    entity: {
        id_persistent: sharedConflict1.value.entity.idPersistent,
        display_txt: sharedConflict1.value.entity.displayTxt,
        display_txt_details: 'display_txt_detail',
        version: sharedConflict1.value.entity.version,
        disabled: false
    },
    replacement_state: sharedConflict1.value.replacementState
}
const conflicts = [
    newRemote(
        newMergeRequestConflict({
            entity: newEntity({
                idPersistent: 'id-entity-test2',
                displayTxt: 'test entity2',
                displayTxtDetails: 'display_txt_detail',
                version: 82,
                disabled: false
            }),
            tagInstanceOrigin: newTagInstance({
                idPersistent: 'id-instance-origin-test2',
                version: 122,
                value: 'value test origin2'
            }),
            tagInstanceDestination: newTagInstance({
                idPersistent: 'id-instance-destination-test2',
                version: 122,
                value: 'value test destination2'
            })
        })
    ),
    sharedConflict1,
    newRemote(
        newMergeRequestConflict({
            entity: entity,
            tagInstanceOrigin: newTagInstance({
                idPersistent: 'id-instance-origin-test3',
                version: 123,
                value: 'value test origin3'
            }),
            tagInstanceDestination: newTagInstance({
                idPersistent: 'id-instance-destination-test3',
                version: 123,
                value: 'value test destination3'
            })
        })
    ),
    sharedConflict
]
describe('get tests', () => {
    test('get success', async () => {
        const fetchMock = vi.fn()
        initialResponseSequence(fetchMock)
        const { container, store } = renderWithProviders(
            <MergeRequestConflictResolutionView idMergeRequestPersistent="id-merge-request" />,
            fetchMock
        )
        await waitFor(() => {
            checkConflicts(container, 2, 4)
        })
        expect(store.getState()).toEqual({
            notification: newNotificationManager({}),
            tagMergeRequestConflicts: newMergeRequestConflictResolutionState({
                conflicts: newRemote(
                    newMergeRequestConflictsByState({
                        updated: updatedConflicts,
                        conflicts: conflicts,
                        mergeRequest: mergeRequest
                    })
                )
            })
        })
    })
    test('error', async () => {
        const fetchMock = vi.fn()
        const testError = 'Could not get conflicts.'
        addResponseSequence(fetchMock, [[500, { msg: testError }]])
        const { container, store } = renderWithProviders(
            <MergeRequestConflictResolutionView idMergeRequestPersistent="id-merge-request" />,
            fetchMock
        )
        await waitFor(() => {
            const accordions = container.getElementsByClassName('accordion-item')
            expect(accordions.length).toEqual(0)
        })
        expect(store.getState()).toEqual({
            notification: newNotificationManager({
                notificationList: [
                    newNotification({
                        msg: testError,
                        type: NotificationType.Error,
                        id: expect.anything()
                    })
                ],
                notificationMap: expect.anything()
            }),
            tagMergeRequestConflicts: newMergeRequestConflictResolutionState({})
        })
    })
})
describe('resolve conflicts', () => {
    test('success', async () => {
        const fetchMock = vi.fn()
        initialResponseSequence(fetchMock)
        addResponseSequence(fetchMock, [
            [200, {}],
            [200, {}],
            [200, {}]
        ])
        const { container, store } = renderWithProviders(
            <MergeRequestConflictResolutionView idMergeRequestPersistent="id-merge-request-persistent" />,
            fetchMock
        )
        await waitFor(() => {
            checkConflicts(container, 2, 4)
        })
        const keepButtons = screen.getAllByRole('button', {
            name: 'Keep Existing Value'
        })
        expect(keepButtons.length).toEqual(6)
        const replaceButtons = screen.getAllByRole('button', { name: 'Use New Value' })
        expect(replaceButtons.length).toEqual(6)
        act(() => {
            replaceButtons[1].click()
        })
        await waitFor(() => {
            expect(store.getState()).toEqual({
                notification: newNotificationManager({}),
                tagMergeRequestConflicts: newMergeRequestConflictResolutionState({
                    conflicts: newRemote(
                        newMergeRequestConflictsByState({
                            updated: updatedConflicts.slice(0, 1),
                            conflicts: [
                                ...conflicts.slice(0, 1),
                                newRemote({
                                    ...conflicts[1].value,
                                    replacementState: ReplacementState.REPLACE
                                }),
                                ...conflicts.slice(2)
                            ],
                            mergeRequest: mergeRequest
                        })
                    )
                })
            })
            const keepButtons = screen.getAllByRole('button', {
                name: 'Keep Existing Value'
            })
            expect(keepButtons.length).toEqual(5)
            const replaceButtons = screen.getAllByRole('button', {
                name: 'Use New Value'
            })
            expect(replaceButtons.length).toEqual(5)
            const replacementValueButtons = screen.getAllByRole('button', {
                name: 'Use Replacement Value'
            })
            expect(replacementValueButtons.length).toEqual(5)
            act(() => {
                keepButtons[2].click()
            })
        })
        await waitFor(async () => {
            expect(store.getState()).toEqual({
                notification: newNotificationManager({}),
                tagMergeRequestConflicts: newMergeRequestConflictResolutionState({
                    conflicts: newRemote(
                        newMergeRequestConflictsByState({
                            updated: updatedConflicts.slice(0, 1),
                            conflicts: [
                                ...conflicts.slice(0, 1),
                                newRemote({
                                    ...conflicts[1].value,
                                    replacementState: ReplacementState.KEEP
                                }),
                                ...conflicts.slice(2)
                            ],
                            mergeRequest: mergeRequest
                        })
                    )
                })
            })
        })
        const user = userEvent.setup()
        await waitFor(
            async () => {
                const keepButtons = screen.getAllByRole('button', {
                    name: 'Keep Existing Value'
                })
                expect(keepButtons.length).toEqual(5)
                const replaceButtons = screen.getAllByRole('button', {
                    name: 'Use New Value'
                })
                expect(replaceButtons.length).toEqual(5)
                const replacementValueForms = screen.getAllByRole('textbox')
                expect(replacementValueForms.length).toEqual(5)
                await act(async () => {
                    await user.click(replacementValueForms[2])
                    await user.paste(replacementValue)
                })
            },
            { timeout: 2000 }
        )
        const replaceBody = {
            id_entity_version: 81,
            id_tag_definition_origin_version: 84,
            id_tag_instance_origin_version: 12,
            id_tag_definition_destination_version: 841,
            id_tag_instance_destination_version: 121,
            id_entity_persistent: 'id-entity-test1',
            id_tag_definition_origin_persistent: 'id-tag-def-origin-test',
            id_tag_instance_origin_persistent: 'id-instance-origin-test1',
            id_tag_definition_destination_persistent: 'id-tag-def-destination-test',
            id_tag_instance_destination_persistent: 'id-instance-destination-test1',
            replacement_state: 'REPLACE',
            replacement_value: undefined
        }
        await waitFor(async () => {
            expect(fetchMock.mock.calls.length).toEqual(4)
            expect(fetchMock.mock.calls).toEqual([
                [
                    'http://127.0.0.1/api/merge_requests/id-merge-request-persistent/conflicts',
                    { credentials: 'include' }
                ],
                [
                    'http://127.0.0.1/api/merge_requests/id-merge-request-persistent/resolve',
                    {
                        credentials: 'include',
                        method: 'POST',
                        body: JSON.stringify(replaceBody)
                    }
                ],
                [
                    'http://127.0.0.1/api/merge_requests/id-merge-request-persistent/resolve',
                    {
                        credentials: 'include',
                        method: 'POST',
                        body: JSON.stringify({
                            ...replaceBody,
                            replacement_state: 'KEEP'
                        })
                    }
                ],
                [
                    'http://127.0.0.1/api/merge_requests/id-merge-request-persistent/resolve',
                    {
                        credentials: 'include',
                        method: 'POST',
                        body: JSON.stringify({
                            ...replaceBody,
                            replacement_state: 'KEEP',
                            replacement_value: replacementValue
                        })
                    }
                ]
            ])
            const replacementValueButtons = screen.getAllByRole('button', {
                name: 'Use Replacement Value'
            })
            expect(replacementValueButtons.length).toEqual(5)
            act(() => {
                replacementValueButtons[2].click()
            })
        })
        await waitFor(() => {
            expect(fetchMock.mock.calls.length).toEqual(5)
            expect(fetchMock.mock.calls[4]).toEqual([
                'http://127.0.0.1/api/merge_requests/id-merge-request-persistent/resolve',
                {
                    credentials: 'include',
                    method: 'POST',
                    body: JSON.stringify({
                        ...replaceBody,
                        replacement_state: 'VALUE',
                        replacement_value: replacementValue
                    })
                }
            ])
        })
    }, 15000)
    test('error', async () => {
        const fetchMock = vi.fn()
        const testError = 'could not resolve conflict'
        initialResponseSequence(fetchMock)
        addResponseSequence(fetchMock, [[500, { msg: testError }]])
        const { container, store } = renderWithProviders(
            <MergeRequestConflictResolutionView idMergeRequestPersistent="id-merge-request" />,
            fetchMock
        )
        await waitFor(() => {
            checkConflicts(container, 2, 4)
        })
        const keepButtons = screen.getAllByRole('button', {
            name: 'Keep Existing Value'
        })
        expect(keepButtons.length).toEqual(6)
        const replaceButtons = screen.getAllByRole('button', { name: 'Use New Value' })
        expect(replaceButtons.length).toEqual(6)
        replaceButtons[1].click()
        await waitFor(() => {
            expect(store.getState().notification).toEqual(
                newNotificationManager({
                    notificationList: [
                        newNotification({
                            msg: testError,
                            type: NotificationType.Error,
                            id: expect.anything()
                        })
                    ],
                    notificationMap: expect.anything()
                })
            )
        })
    })
})
describe('submit', () => {
    test('success', async () => {
        const fetchMock = vi.fn()
        initialResponseSequence(fetchMock)
        addResponseSequence(fetchMock, [[200, {}]])
        const { store } = renderWithProviders(
            <MergeRequestConflictResolutionView idMergeRequestPersistent="id-merge-request" />,
            fetchMock
        )
        await waitFor(async () => {
            const mergeButton = await screen.findByRole('button', {
                name: /Apply Resolutions to Destination/i
            })
            mergeButton.click()
        })
        await waitFor(() => {
            expect(store.getState().notification).toEqual(
                newNotificationManager({
                    notificationList: [
                        newNotification({
                            msg: 'Application of resolutions started.',
                            type: NotificationType.Success,
                            id: expect.anything()
                        })
                    ],
                    notificationMap: expect.anything()
                })
            )
        })
        expect(fetchMock.mock.calls).toEqual([
            [
                'http://127.0.0.1/api/merge_requests/id-merge-request/conflicts',
                { credentials: 'include' }
            ],
            [
                'http://127.0.0.1/api/merge_requests/id-merge-request/merge',

                { credentials: 'include', method: 'POST' }
            ]
        ])
    })
    test('error', async () => {
        const fetchMock = vi.fn()
        initialResponseSequence(fetchMock)
        const testError = 'Could not start merge'
        addResponseSequence(fetchMock, [[500, { msg: testError }]])
        const { store } = renderWithProviders(
            <MergeRequestConflictResolutionView idMergeRequestPersistent="id-merge-request" />,
            fetchMock
        )
        await waitFor(async () => {
            const mergeButton = await screen.findByRole('button', {
                name: /Apply Resolutions to Destination/i
            })
            mergeButton.click()
        })
        await waitFor(() => {
            expect(store.getState().notification).toEqual(
                newNotificationManager({
                    notificationList: [
                        newNotification({
                            msg: testError,
                            type: NotificationType.Error,
                            id: expect.anything()
                        })
                    ],
                    notificationMap: expect.anything()
                })
            )
        })
        expect(fetchMock.mock.calls).toEqual([
            [
                'http://127.0.0.1/api/merge_requests/id-merge-request/conflicts',
                { credentials: 'include' }
            ],
            [
                'http://127.0.0.1/api/merge_requests/id-merge-request/merge',
                { credentials: 'include', method: 'POST' }
            ]
        ])
    })
})
describe('toggle disable origin on merge', () => {
    test('success', async () => {
        const fetchMock = vi.fn()
        initialResponseSequence(fetchMock)
        addResponseSequence(fetchMock, [[200, {}]])
        const { store } = renderWithProviders(
            <MergeRequestConflictResolutionView idMergeRequestPersistent="id-merge-request" />,
            fetchMock
        )
        await waitFor(async () => {
            const toggle = await screen.findByRole('checkbox')
            toggle.click()
        })
        expect(
            store.getState().tagMergeRequestConflicts.conflicts.value?.mergeRequest
                .disableOriginOnMerge
        ).toEqual(false)
        expect(store.getState().notification).toEqual(newNotificationManager({}))
        expect(fetchMock.mock.calls).toEqual([
            [
                'http://127.0.0.1/api/merge_requests/id-merge-request/conflicts',
                { credentials: 'include' }
            ],
            [
                'http://127.0.0.1/api/merge_requests/id-merge-request',
                {
                    credentials: 'include',
                    method: 'PATCH',
                    body: JSON.stringify({ disable_origin_on_merge: false })
                }
            ]
        ])
    })
    test('error', async () => {
        const fetchMock = vi.fn()
        const testError = 'Could not patch merge request.'
        initialResponseSequence(fetchMock)
        addResponseSequence(fetchMock, [[500, { msg: testError }]])
        const { store } = renderWithProviders(
            <MergeRequestConflictResolutionView idMergeRequestPersistent="id-merge-request" />,
            fetchMock
        )
        await waitFor(async () => {
            const toggle = await screen.findByRole('checkbox')
            toggle.click()
        })
        expect(
            store.getState().tagMergeRequestConflicts.conflicts.value?.mergeRequest
                .disableOriginOnMerge
        ).toEqual(true)
        expect(store.getState().notification).toEqual(
            newNotificationManager({
                notificationList: [
                    newNotification({
                        msg: testError,
                        type: NotificationType.Error,
                        id: expect.anything()
                    })
                ],
                notificationMap: expect.anything()
            })
        )
        expect(fetchMock.mock.calls).toEqual([
            [
                'http://127.0.0.1/api/merge_requests/id-merge-request/conflicts',
                { credentials: 'include' }
            ],
            [
                'http://127.0.0.1/api/merge_requests/id-merge-request',
                {
                    credentials: 'include',
                    method: 'PATCH',
                    body: JSON.stringify({ disable_origin_on_merge: false })
                }
            ]
        ])
    })
})

const mergeRequest = newMergeRequest({
    idPersistent: 'id-merge-request',
    assignedTo: newPublicUserInfo({
        username: 'user_assigned',
        idPersistent: 'id-user-assigned',
        permissionGroup: UserPermissionGroup.CONTRIBUTOR
    }),
    createdBy: newPublicUserInfo({
        username: 'user_created',
        idPersistent: 'id-user-created',
        permissionGroup: UserPermissionGroup.CONTRIBUTOR
    }),
    step: MergeRequestStep.Open,
    originTagDefinition: tagDefOrigin,
    destinationTagDefinition: tagDefDestination,
    disableOriginOnMerge: true
})

function checkConflicts(
    container: HTMLElement,
    expectedNumUpdated: number,
    expectedConflicts: number
) {
    const accordions = container.getElementsByClassName('accordion-item')
    expect(accordions.length).toEqual(2)
    const updated = accordions[0] as HTMLElement
    expect(getAllByTestId(updated, 'conflict-item').length).toEqual(expectedNumUpdated)
    const other = accordions[1] as HTMLElement
    expect(getAllByTestId(other, 'conflict-item').length).toEqual(expectedConflicts)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function initialResponseSequence(fetchMock: Mock) {
    addResponseSequence(fetchMock, [
        [
            200,
            {
                merge_request: {
                    id_persistent: 'id-merge-request',
                    assigned_to: {
                        username: 'user_assigned',
                        id_persistent: 'id-user-assigned',
                        permission_group: 'CONTRIBUTOR'
                    },
                    created_by: {
                        username: 'user_created',
                        id_persistent: 'id-user-created',
                        permission_group: 'CONTRIBUTOR'
                    },
                    state: 'OPEN',
                    disable_origin_on_merge: true,
                    origin: {
                        name: tagDefOrigin.namePath[0],
                        name_path: tagDefOrigin.namePath,
                        id_persistent: tagDefOrigin.idPersistent,
                        type: 'STRING',
                        curated: false,
                        version: tagDefOrigin.version,
                        hidden: false,
                        disabled: false
                    },
                    destination: {
                        name: tagDefDestination.namePath[0],
                        name_path: tagDefDestination.namePath,
                        id_persistent: tagDefDestination.idPersistent,
                        type: 'STRING',
                        curated: false,
                        version: tagDefDestination.version,
                        hidden: false,
                        disabled: false
                    }
                },
                updated: [sharedConflictJson, sharedConflictJson1],
                conflicts: [
                    {
                        entity: {
                            id_persistent: 'id-entity-test2',
                            display_txt_details: 'display_txt_detail',
                            display_txt: 'test entity2',
                            version: 82,
                            disabled: false
                        },
                        tag_instance_origin: {
                            id_persistent: 'id-instance-origin-test2',
                            version: 122,
                            value: 'value test origin2'
                        },
                        tag_instance_destination: {
                            id_persistent: 'id-instance-destination-test2',
                            version: 122,
                            value: 'value test destination2'
                        }
                    },
                    sharedConflictJson1,

                    {
                        entity: {
                            id_persistent: 'id-entity-test3',
                            display_txt: 'test entity3',
                            display_txt_details: 'display_txt_detail',
                            version: 83,
                            disabled: false
                        },
                        tag_instance_origin: {
                            id_persistent: 'id-instance-origin-test3',
                            version: 123,
                            value: 'value test origin3'
                        },
                        tag_instance_destination: {
                            id_persistent: 'id-instance-destination-test3',
                            version: 123,
                            value: 'value test destination3'
                        }
                    },
                    sharedConflictJson
                ]
            }
        ]
    ])
}
