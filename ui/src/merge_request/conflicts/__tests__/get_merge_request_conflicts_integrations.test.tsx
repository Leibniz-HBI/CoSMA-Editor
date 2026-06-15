/**
 * @vitest-environment jsdom
 */

import { vi, Mock } from 'vitest'
import { waitFor, screen, getAllByTestId } from '@testing-library/react'
import {
    NotificationType,
    newNotification,
    newNotificationManager
} from '../../../util/notification/slice'
import { act } from 'react'
import { MergeRequestConflictResolutionView } from '../components'
import { newRemote } from '../../../util/state'
import { UserPermissionGroup, newPublicUserInfo } from '../../../user/state'
import { ColumnType, newColumn } from '../../../column_menu/state'
import {
    newMergeRequestConflict,
    newMergeRequestConflictResolutionState,
    newMergeRequestConflictsByState,
    newValue,
    ReplacementState
} from '../state'
import { newEntity } from '../../../entity/state'
import { MergeRequestStep, newMergeRequest } from '../../state'
import userEvent from '@testing-library/user-event'
import { emptyState, renderWithProviders } from '../../../util/tests/provider'
import {
    addResponseSequence,
    expectFetchCall,
    expectFetchCallList
} from '../../../util/tests/response'
import { time } from 'console'
import { replace } from 'react-router-dom'

const replacementValue = 'test replacement value'
const columnOrigin = newColumn({
    namePath: ['column origin test'],
    idPersistent: 'id-column-origin-test',
    curated: false,
    version: 84,
    columnType: ColumnType.String,
    hidden: false
})
const columnDestination = newColumn({
    namePath: ['column destination test'],
    idPersistent: 'id-column-destination-test',
    curated: false,
    version: 841,
    columnType: ColumnType.String,
    hidden: false
})
const valueOrigin = newValue({
    idPersistent: 'id-instance-origin-test1',
    version: 12,
    value: 'value test origin'
})
const valueDestination = newValue({
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
        valueOrigin: valueOrigin,
        valueDestination: valueDestination
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
        valueOrigin: newValue({
            idPersistent: 'id-instance-origin-test',
            version: 12,
            value: 'value test origin'
        }),
        valueDestination: newValue({
            idPersistent: 'id-instance-destination-test',
            version: 12,
            value: 'value test destination'
        })
    })
)
const updatedConflicts = [sharedConflict1, sharedConflict]
const entity = newEntity({
    idPersistent: 'id-entity-test3',
    displayTxt: 'test entity3',
    displayTxtDetails: 'display_txt_detail',
    version: 83,
    disabled: false
})
const sharedConflictJson = {
    value_origin: {
        id_persistent: sharedConflict.value.valueOrigin.idPersistent,
        version: sharedConflict.value.valueOrigin.version,
        value: sharedConflict.value.valueOrigin.value
    },
    value_destination: {
        id_persistent: sharedConflict.value.valueDestination?.idPersistent,
        version: sharedConflict.value.valueDestination?.version,
        value: sharedConflict.value.valueDestination?.value
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
    value_origin: {
        id_persistent: sharedConflict1.value.valueOrigin.idPersistent,
        version: sharedConflict1.value.valueOrigin.version,
        value: sharedConflict1.value.valueOrigin.value
    },
    value_destination: {
        id_persistent: sharedConflict1.value.valueDestination?.idPersistent,
        version: sharedConflict1.value.valueDestination?.version,
        value: sharedConflict1.value.valueDestination?.value
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
            valueOrigin: newValue({
                idPersistent: 'id-instance-origin-test2',
                version: 122,
                value: 'value test origin2'
            }),
            valueDestination: newValue({
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
            valueOrigin: newValue({
                idPersistent: 'id-instance-origin-test3',
                version: 123,
                value: 'value test origin3'
            }),
            valueDestination: newValue({
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
            <MergeRequestConflictResolutionView mergeRequest={mergeRequest} />,
            fetchMock
        )
        await waitFor(() => {
            checkConflicts(container, 2, 4)
        })
        expect(store.getState()).toEqual(
            expect.objectContaining({
                notification: newNotificationManager({}),
                columnMergeRequestConflicts: newMergeRequestConflictResolutionState({
                    conflicts: newRemote(
                        newMergeRequestConflictsByState({
                            updated: updatedConflicts,
                            conflicts: conflicts
                        })
                    )
                })
            })
        )
    })
    test('error', async () => {
        const fetchMock = vi.fn()
        const testError = 'Could not get conflicts.'
        addResponseSequence(fetchMock, [[500, { msg: testError }]])
        const { container, store } = renderWithProviders(
            <MergeRequestConflictResolutionView mergeRequest={mergeRequest} />,
            fetchMock
        )
        await waitFor(() => {
            const accordions = container.getElementsByClassName('accordion-item')
            expect(accordions.length).toEqual(0)
            expect(store.getState()).toEqual(
                expect.objectContaining({
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
                    columnMergeRequestConflicts: newMergeRequestConflictResolutionState(
                        {}
                    )
                })
            )
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
            <MergeRequestConflictResolutionView mergeRequest={mergeRequest} />,
            fetchMock,
            { preloadedState }
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
            expect(store.getState()).toEqual(
                expect.objectContaining({
                    notification: newNotificationManager({
                        notificationList: [
                            newNotification({
                                msg: 'Conflict resolved successfully.',
                                type: NotificationType.Success,
                                id: expect.anything()
                            })
                        ],
                        notificationMap: expect.anything()
                    }),
                    columnMergeRequestConflicts: newMergeRequestConflictResolutionState(
                        {
                            mergeRequest: newRemote(mergeRequest),
                            conflicts: newRemote(
                                newMergeRequestConflictsByState({
                                    updated: updatedConflicts.slice(0, 1),
                                    conflicts: [
                                        ...conflicts.slice(0, 3),
                                        newRemote({
                                            ...conflicts[3].value,
                                            replacementState: ReplacementState.REPLACE
                                        })
                                    ]
                                })
                            )
                        }
                    )
                })
            )
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
                keepButtons[4].click()
            })
        })
        await waitFor(async () => {
            expect(store.getState()).toEqual(
                expect.objectContaining({
                    // notification: newNotificationManager({}),
                    columnMergeRequestConflicts: newMergeRequestConflictResolutionState(
                        {
                            mergeRequest: newRemote(mergeRequest),
                            conflicts: newRemote(
                                newMergeRequestConflictsByState({
                                    updated: updatedConflicts.slice(0, 1),
                                    conflicts: [
                                        ...conflicts.slice(0, 3),
                                        newRemote({
                                            ...conflicts[3].value,
                                            replacementState: ReplacementState.KEEP
                                        })
                                    ]
                                })
                            )
                        }
                    )
                })
            )
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
            id_entity_version: 8,
            id_column_origin_version: 84,
            id_value_origin_version: 12,
            id_column_destination_version: 841,
            id_value_destination_version: 12,
            id_entity_persistent: 'id-entity-test',
            id_column_origin_persistent: 'id-column-origin-test',
            id_value_origin_persistent: 'id-instance-origin-test',
            id_column_destination_persistent: 'id-column-destination-test',
            id_value_destination_persistent: 'id-instance-destination-test',
        }
        const replaceBody1 = {
            ...replaceBody,
            id_entity_version: 81,
            id_entity_persistent: 'id-entity-test1',
            id_value_destination_version: 121,
            id_value_destination_persistent: 'id-instance-destination-test1',
            id_value_origin_persistent: 'id-instance-origin-test1'
        }
        await waitFor(async () => {
            expect(fetchMock.mock.calls.length).toEqual(5)
        })
        await expectFetchCallList(fetchMock.mock.calls, [
            [
                'http://127.0.0.1:8000/cosmae/api/merge_requests/id-merge-request/conflicts?offset=0&limit=30',
                { credentials: 'include' }
            ],
            [
                'http://127.0.0.1:8000/cosmae/api/merge_requests/id-merge-request/conflicts?offset=12&limit=30',
                { credentials: 'include' }
            ],
            [
                'http://127.0.0.1:8000/cosmae/api/merge_requests/id-merge-request/resolve',
                {
                    credentials: 'include',
                    method: 'POST',
                    body: {...replaceBody, replacement_state: 'REPLACE'}
                }
            ],
            [
                'http://127.0.0.1:8000/cosmae/api/merge_requests/id-merge-request/resolve',
                {
                    credentials: 'include',
                    method: 'POST',
                    body: {
                        ...replaceBody,
                        replacement_state: 'KEEP'
                    }
                }
            ],
            [
                'http://127.0.0.1:8000/cosmae/api/merge_requests/id-merge-request/resolve',
                {
                    credentials: 'include',
                    method: 'POST',
                    body: {
                        ...replaceBody1,
                        // replacement_state: 'VALUE',
                        replacement_value: replacementValue
                    }
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
        await waitFor(() => {
            expect(fetchMock.mock.calls.length).toEqual(6)
        })
        await expectFetchCall(fetchMock.mock.calls[5], [
            'http://127.0.0.1:8000/cosmae/api/merge_requests/id-merge-request/resolve',
            {
                credentials: 'include',
                method: 'POST',
                body: {
                    ...replaceBody1,
                    replacement_state: 'VALUE',
                    replacement_value: replacementValue
                }
            }
        ])
    }, 15000)
    test('error', async () => {
        const fetchMock = vi.fn()
        const testError = 'could not resolve conflict'
        initialResponseSequence(fetchMock)
        addResponseSequence(fetchMock, [[500, { msg: testError }]])
        const { container, store } = renderWithProviders(
            <MergeRequestConflictResolutionView mergeRequest={mergeRequest} />,
            fetchMock,
            { preloadedState }
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
            <MergeRequestConflictResolutionView mergeRequest={mergeRequest} />,
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
        await expectFetchCallList(fetchMock.mock.calls, [
            [
                'http://127.0.0.1:8000/cosmae/api/merge_requests/id-merge-request/conflicts?offset=0&limit=30',
                { credentials: 'include' }
            ],
            [
                'http://127.0.0.1:8000/cosmae/api/merge_requests/id-merge-request/conflicts?offset=12&limit=30',
                { credentials: 'include' }
            ],
            [
                'http://127.0.0.1:8000/cosmae/api/merge_requests/id-merge-request/merge',

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
            <MergeRequestConflictResolutionView mergeRequest={mergeRequest} />,
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
        await expectFetchCallList(fetchMock.mock.calls, [
            [
                'http://127.0.0.1:8000/cosmae/api/merge_requests/id-merge-request/conflicts?offset=0&limit=30',
                { credentials: 'include' }
            ],
            [
                'http://127.0.0.1:8000/cosmae/api/merge_requests/id-merge-request/conflicts?offset=12&limit=30',
                { credentials: 'include' }
            ],
            [
                'http://127.0.0.1:8000/cosmae/api/merge_requests/id-merge-request/merge',
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
            <MergeRequestConflictResolutionView mergeRequest={mergeRequest} />,
            fetchMock,
            { preloadedState }
        )
        await waitFor(async () => {
            const toggle = await screen.findByRole('checkbox')
            toggle.click()
        })
        await waitFor(() => {
            expect(
                store.getState().columnMergeRequestConflicts.mergeRequest.value
                    ?.disableOriginOnMerge
            ).toEqual(false)
        })
        expect(store.getState().notification).toEqual(newNotificationManager({}))
        await expectFetchCallList(fetchMock.mock.calls, [
            [
                'http://127.0.0.1:8000/cosmae/api/merge_requests/id-merge-request/conflicts?offset=0&limit=30',
                { credentials: 'include' }
            ],
            [
                'http://127.0.0.1:8000/cosmae/api/merge_requests/id-merge-request/conflicts?offset=12&limit=30',
                { credentials: 'include' }
            ],
            [
                'http://127.0.0.1:8000/cosmae/api/merge_requests/id-merge-request',
                {
                    credentials: 'include',
                    method: 'PATCH',
                    body: { disable_origin_on_merge: false }
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
            <MergeRequestConflictResolutionView mergeRequest={mergeRequest} />,
            fetchMock,
            { preloadedState }
        )
        await waitFor(async () => {
            const toggle = await screen.findByRole('checkbox')
            toggle.click()
        })
        await waitFor(() => {
            expect(
                store.getState().columnMergeRequestConflicts.mergeRequest.value
                    ?.disableOriginOnMerge
            ).toEqual(true)
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
        await expectFetchCallList(fetchMock.mock.calls, [
            [
                'http://127.0.0.1:8000/cosmae/api/merge_requests/id-merge-request/conflicts?offset=0&limit=30',
                { credentials: 'include' }
            ],
            [
                'http://127.0.0.1:8000/cosmae/api/merge_requests/id-merge-request/conflicts?offset=12&limit=30',
                { credentials: 'include' }
            ],
            [
                'http://127.0.0.1:8000/cosmae/api/merge_requests/id-merge-request',
                {
                    credentials: 'include',
                    method: 'PATCH',
                    body: { disable_origin_on_merge: false }
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
    originColumn: columnOrigin,
    destinationColumn: columnDestination,
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

const preloadedState = {
    ...emptyState,
    columnMergeRequestConflicts: newMergeRequestConflictResolutionState({
        mergeRequest: newRemote(mergeRequest)
    })
}

function initialResponseSequence(fetchMock: Mock) {
    addResponseSequence(fetchMock, [
        [
            200,
            {
                id_value_origin_persistent_updated_list: [
                    sharedConflictJson.value_origin.id_persistent,
                    sharedConflictJson1.value_origin.id_persistent
                ],
                next_offset: 12,
                conflicts: [
                    {
                        entity: {
                            id_persistent: 'id-entity-test2',
                            display_txt_details: 'display_txt_detail',
                            display_txt: 'test entity2',
                            version: 82,
                            disabled: false
                        },
                        value_origin: {
                            id_persistent: 'id-instance-origin-test2',
                            version: 122,
                            value: 'value test origin2'
                        },
                        value_destination: {
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
                        value_origin: {
                            id_persistent: 'id-instance-origin-test3',
                            version: 123,
                            value: 'value test origin3'
                        },
                        value_destination: {
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
    addResponseSequence(fetchMock, [
        [
            200,
            {
                next_offset: -1,
                conflicts: [],
                id_value_origin_persistent_updated_list: []
            }
        ]
    ])
}
