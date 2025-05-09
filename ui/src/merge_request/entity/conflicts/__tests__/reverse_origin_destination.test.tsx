/**
 * @vitest-environment jsdom
 */
import {vi, Mock }  from 'vitest'
import { RenderOptions, render, waitFor, screen } from '@testing-library/react'
import { newRemote } from '../../../../util/state'
import { configureStore } from '@reduxjs/toolkit'
import { PropsWithChildren } from 'react'
import { Provider } from 'react-redux'
import { UserPermissionGroup } from '../../../../user/state'
import {
    NotificationManager,
    notificationReducer
} from '../../../../util/notification/slice'
import {
    EntityMergeRequestConflictsState,
    newEntityMergeRequestConflict
} from '../state'
import { entityMergeRequestConflictSlice } from '../slice'
import { EntityMergeRequestConflictHeader } from '../components'
import { EntityMergeRequestStep, newEntityMergeRequest } from '../../state'
import { ReplacementState } from '../../../conflicts/state'

vi.mock('react-router-dom', () => {
    const navigateCallbackMock = vi.fn()
    const useNavigateMock = vi.fn().mockReturnValue(navigateCallbackMock)
    return { useNavigate: useNavigateMock }
})
vi.mock('uuid', () => {
    return {
        v4: () => 'id-error-test'
    }
})
vi.mock('react-router-dom', () => {
    const loaderMock = vi.fn()
    loaderMock.mockReturnValue('id-entity-merge-request-test')
    return { useLoaderData: loaderMock, useNavigate: vi.fn() }
})

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: {
        notification: NotificationManager
        entityMergeRequestConflicts: EntityMergeRequestConflictsState
    }
}

export function renderWithProviders(
    ui: React.ReactElement,
    fetchMock: Mock,
    {
        preloadedState = {
            entityMergeRequestConflicts: {
                conflicts: newRemote(undefined),
                mergeRequest: newRemote(undefined),
                newlyCreated: false,
                reverseOriginDestination: newRemote(undefined),
                merge: newRemote(undefined)
            },
            notification: { notificationList: [], notificationMap: {} }
        },
        ...renderOptions
    }: ExtendedRenderOptions = {}
) {
    const store = configureStore({
        reducer: {
            entityMergeRequestConflicts: entityMergeRequestConflictSlice.reducer,
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
const idEntityMr0 = 'id-entity-mr-0'
const displayTextOrigin0 = 'Entity Origin 0'
const idPersistentOrigin0 = 'id-entity-origin-0'
const versionOrigin0 = 5550
const displayTextDestination0 = 'Entity Destination 0'
const idPersistentDestination0 = 'id-entity-destination-0'
const versionDestination0 = 4440
const userName0 = 'user 0'
const idUser0 = 'user-id-0'
const permissionGroup0 = 'COMMISSIONER'

const namePathResolvable0 = ['name path', 'resolvable 0']
const idColumnResolvable0 = 'id-column-resolvable-0'
const idColumnParentResolvable0 = 'id-column-parent-resolvable-0'
const versionColumnResolvable0 = 7770
const idValueOriginResolvable0 = 'id-instance-origin-resolvable-0'
const versionValueOriginResolvable0 = 7780
const valueValueOriginResolvable0 = 'resolvable value origin 0'
const idValueDestinationResolvable0 = 'id-instance-resolvable-destination-0'
const versionValueDestinationResolvable0 = 7740
const valueValueDestinationResolvable0 = 'resolvable value destination 0'
const namePathResolvable1 = ['name path', 'resolvable 1']
const idColumnResolvable1 = 'id-column-resolvable-1'
const idColumnParentResolvable1 = 'id-column-parent-resolvable-1'
const versionColumnResolvable1 = 7771
const idValueOriginResolvable1 = 'id-instance-origin-resolvable-1'
const versionValueOriginResolvable1 = 7781
const valueValueOriginResolvable1 = 'resolvable value origin 1'
const idValueDestinationResolvable1 = 'id-instance-resolvable-destination-1'
const versionValueDestinationResolvable1 = 7741
const valueValueDestinationResolvable1 = 'resolvable value destination 1'
const namePathResolvable2 = ['name path', 'resolvable 2']
const idColumnResolvable2 = 'id-column-resolvable-2'
const idColumnParentResolvable2 = 'id-column-parent-resolvable-2'
const versionColumnResolvable2 = 7772
const idValueOriginResolvable2 = 'id-instance-origin-resolvable-2'
const versionValueOriginResolvable2 = 7782
const valueValueOriginResolvable2 = 'resolvable value origin 2'
const idValueDestinationResolvable2 = 'id-instance-resolvable-destination-2'
const versionValueDestinationResolvable2 = 7742
const valueValueDestinationResolvable2 = 'resolvable value destination 2'
const namePathUnresolvable0 = ['name path', 'unresolvable 0']
const idColumnUnresolvable0 = 'id-column-unresolvable-0'
const idColumnParentUnresolvable0 = 'id-column-parent-unresolvable-0'
const versionColumnUnresolvable0 = 7770
const idValueOriginUnresolvable0 = 'id-instance-origin-unresolvable-0'
const versionValueOriginUnresolvable0 = 7780
const valueValueOriginUnresolvable0 = 'unresolvable value origin 0'
const idValueDestinationUnresolvable0 = 'id-instance-unresolvable-destination-0'
const versionValueDestinationUnresolvable0 = 7740
const valueValueDestinationUnresolvable0 = 'unresolvable value destination 0'
const namePathUnresolvable1 = ['name path', 'unresolvable 1']
const idColumnUnresolvable1 = 'id-column-unresolvable-1'
const idColumnParentUnresolvable1 = 'id-column-parent-unresolvable-1'
const versionColumnUnresolvable1 = 7771
const idValueOriginUnresolvable1 = 'id-instance-origin-unresolvable-1'
const versionValueOriginUnresolvable1 = 7781
const valueValueOriginUnresolvable1 = 'unresolvable value origin 1'
const idValueDestinationUnresolvable1 = 'id-instance-unresolvable-destination-1'
const versionValueDestinationUnresolvable1 = 7741
const valueValueDestinationUnresolvable1 = 'unresolvable value destination 1'

function addSuccessResponse(fetchMock: Mock) {
    const entityMergeRequestApi = {
        id_persistent: idEntityMr0,
        origin: {
            display_txt: displayTextOrigin0,
            display_txt_details: 'display_txt_detail',
            id_persistent: idPersistentOrigin0,
            version: versionOrigin0,
            disabled: false,
            justification_txt: ''
        },
        destination: {
            display_txt: displayTextDestination0,
            display_txt_details: 'display_txt_detail',
            id_persistent: idPersistentDestination0,
            version: versionDestination0,
            disabled: false,
            justification_txt: ''
        },
        created_by: {
            username: userName0,
            id_persistent: idUser0,
            permission_group: permissionGroup0
        },
        state: 'OPEN'
    }
    const resolvableConflict1 = {
        column: {
            name_path: namePathResolvable1,
            id_persistent: idColumnResolvable1,
            id_parent_persistent: idColumnParentResolvable1,
            version: versionColumnResolvable1,
            curated: false
        },
        value_origin: {
            id_persistent: idValueOriginResolvable1,
            value: valueValueOriginResolvable1,
            version: versionValueOriginResolvable1
        },
        value_destination: {
            id_persistent: idValueDestinationResolvable1,
            value: valueValueDestinationResolvable1,
            version: versionValueDestinationResolvable1
        }
    }
    addResponseSequence(fetchMock, [
        [200, entityMergeRequestApi],
        [
            200,
            {
                merge_request: entityMergeRequestApi,
                resolvable_conflicts: [
                    {
                        column: {
                            name_path: namePathResolvable0,
                            id_persistent: idColumnResolvable0,
                            id_parent_persistent: idColumnParentResolvable0,
                            version: versionColumnResolvable0,
                            curated: false
                        },
                        value_origin: {
                            id_persistent: idValueOriginResolvable0,
                            value: valueValueOriginResolvable0,
                            version: versionValueOriginResolvable0
                        },
                        value_destination: {
                            id_persistent: idValueDestinationResolvable0,
                            value: valueValueDestinationResolvable0,
                            version: versionValueDestinationResolvable0
                        },
                        replacement_state: 'REPLACE'
                    },
                    resolvableConflict1,
                    {
                        column: {
                            name_path: namePathResolvable2,
                            id_persistent: idColumnResolvable2,
                            id_parent_persistent: idColumnParentResolvable2,
                            version: versionColumnResolvable2,
                            curated: false
                        },
                        value_origin: {
                            id_persistent: idValueOriginResolvable2,
                            value: valueValueOriginResolvable2,
                            version: versionValueOriginResolvable2
                        },
                        value_destination: {
                            id_persistent: idValueDestinationResolvable2,
                            value: valueValueDestinationResolvable2,
                            version: versionValueDestinationResolvable2
                        },
                        replacement_state: 'KEEP'
                    }
                ],
                updated: [resolvableConflict1],
                unresolvable_conflicts: [
                    {
                        column: {
                            name_path: namePathUnresolvable0,
                            id_persistent: idColumnUnresolvable0,
                            id_parent_persistent: idColumnParentUnresolvable0,
                            version: versionColumnUnresolvable0,
                            curated: false
                        },
                        value_origin: {
                            id_persistent: idValueOriginUnresolvable0,
                            value: valueValueOriginUnresolvable0,
                            version: versionValueOriginUnresolvable0
                        },
                        value_destination: {
                            id_persistent: idValueDestinationUnresolvable0,
                            value: valueValueDestinationUnresolvable0,
                            version: versionValueDestinationUnresolvable0
                        }
                    },
                    {
                        column: {
                            name_path: namePathUnresolvable1,
                            id_persistent: idColumnUnresolvable1,
                            id_parent_persistent: idColumnParentUnresolvable1,
                            version: versionColumnUnresolvable1,
                            curated: false
                        },
                        value_origin: {
                            id_persistent: idValueOriginUnresolvable1,
                            value: valueValueOriginUnresolvable1,
                            version: versionValueOriginUnresolvable1
                        },
                        value_destination: {
                            id_persistent: idValueDestinationUnresolvable1,
                            value: valueValueDestinationUnresolvable1,
                            version: versionValueDestinationUnresolvable1
                        }
                    }
                ]
            }
        ]
    ])
}

test('swap origin and destination', async () => {
    const fetchMock = vi.fn()
    addSuccessResponse(fetchMock)
    const mergeRequest = newEntityMergeRequest({
        idPersistent: idEntityMr0,
        // reverse order as we test swapping origin and destination.
        entityOrigin: {
            idPersistent: idPersistentDestination0,
            displayTxt: displayTextDestination0,
            displayTxtDetails: 'display_txt_detail',
            version: versionDestination0,
            disabled: false,
            justificationTxt: ''
        },
        entityDestination: {
            idPersistent: idPersistentOrigin0,
            displayTxt: displayTextOrigin0,
            displayTxtDetails: 'display_txt_detail',
            version: versionOrigin0,
            disabled: false,
            justificationTxt: ''
        },
        createdBy: {
            idPersistent: idUser0,
            permissionGroup: 'Commissioner' as UserPermissionGroup,
            username: userName0
        },
        state: 'open' as EntityMergeRequestStep
    })
    const { store } = renderWithProviders(
        <EntityMergeRequestConflictHeader mergeRequest={mergeRequest} />,
        fetchMock,
        {
            preloadedState: {
                notification: { notificationList: [], notificationMap: {} },
                entityMergeRequestConflicts: {
                    conflicts: newRemote(undefined),
                    mergeRequest: newRemote(mergeRequest),
                    newlyCreated: false,
                    reverseOriginDestination: newRemote(undefined),
                    merge: newRemote(undefined)
                }
            }
        }
    )
    await waitFor(() => {
        const button = screen.getByRole('button', { name: /reverse direction/i })
        button.click()
    })
    const conflictResolvable1 = newEntityMergeRequestConflict({
        column: {
            namePath: namePathResolvable1,
            idPersistent: idColumnResolvable1,
            idParentPersistent: idColumnParentResolvable1,
            curated: false,
            version: versionColumnResolvable1
        },
        valueOrigin: {
            idPersistent: idValueOriginResolvable1,
            value: valueValueOriginResolvable1,
            version: versionValueOriginResolvable1
        },
        valueDestination: {
            idPersistent: idValueDestinationResolvable1,
            value: valueValueDestinationResolvable1,
            version: versionValueDestinationResolvable1
        },
        replacementState: undefined
    })
    const expectedConflictState = {
        conflicts: newRemote({
            resolvableConflicts: [
                newRemote(
                    newEntityMergeRequestConflict({
                        column: {
                            namePath: namePathResolvable0,
                            idPersistent: idColumnResolvable0,
                            idParentPersistent: idColumnParentResolvable0,
                            curated: false,
                            version: versionColumnResolvable0
                        },
                        valueOrigin: {
                            idPersistent: idValueOriginResolvable0,
                            value: valueValueOriginResolvable0,
                            version: versionValueOriginResolvable0
                        },
                        valueDestination: {
                            idPersistent: idValueDestinationResolvable0,
                            value: valueValueDestinationResolvable0,
                            version: versionValueDestinationResolvable0
                        },
                        replacementState: ReplacementState.REPLACE
                    })
                ),
                newRemote(conflictResolvable1),
                newRemote(
                    newEntityMergeRequestConflict({
                        column: {
                            namePath: namePathResolvable2,
                            idPersistent: idColumnResolvable2,
                            idParentPersistent: idColumnParentResolvable2,
                            curated: false,
                            version: versionColumnResolvable2
                        },
                        valueOrigin: {
                            idPersistent: idValueOriginResolvable2,
                            value: valueValueOriginResolvable2,
                            version: versionValueOriginResolvable2
                        },
                        valueDestination: {
                            idPersistent: idValueDestinationResolvable2,
                            value: valueValueDestinationResolvable2,
                            version: versionValueDestinationResolvable2
                        },
                        replacementState: ReplacementState.KEEP
                    })
                )
            ],
            unresolvableConflicts: [
                newRemote(
                    newEntityMergeRequestConflict({
                        column: {
                            namePath: namePathUnresolvable0,
                            idPersistent: idColumnUnresolvable0,
                            idParentPersistent: idColumnParentUnresolvable0,
                            curated: false,
                            version: versionColumnUnresolvable0
                        },
                        valueOrigin: {
                            idPersistent: idValueOriginUnresolvable0,
                            value: valueValueOriginUnresolvable0,
                            version: versionValueOriginUnresolvable0
                        },
                        valueDestination: {
                            idPersistent: idValueDestinationUnresolvable0,
                            value: valueValueDestinationUnresolvable0,
                            version: versionValueDestinationUnresolvable0
                        }
                    })
                ),
                newRemote(
                    newEntityMergeRequestConflict({
                        column: {
                            namePath: namePathUnresolvable1,
                            idPersistent: idColumnUnresolvable1,
                            idParentPersistent: idColumnParentUnresolvable1,
                            version: versionColumnUnresolvable1,
                            curated: false
                        },
                        valueOrigin: {
                            idPersistent: idValueOriginUnresolvable1,
                            value: valueValueOriginUnresolvable1,
                            version: versionValueOriginUnresolvable1
                        },
                        valueDestination: {
                            idPersistent: idValueDestinationUnresolvable1,
                            value: valueValueDestinationUnresolvable1,
                            version: versionValueDestinationUnresolvable1
                        }
                    })
                )
            ],
            updated: [newRemote(conflictResolvable1)],
            updatedColumnIdMap: { 'id-column-resolvable-1': 0 },
            resolvableConflictsColumnIdMap: {
                'id-column-resolvable-0': 0,
                'id-column-resolvable-1': 1,
                'id-column-resolvable-2': 2
            }
        }),
        mergeRequest: newRemote(
            newEntityMergeRequest({
                idPersistent: idEntityMr0,
                entityOrigin: {
                    displayTxt: displayTextOrigin0,
                    displayTxtDetails: 'display_txt_detail',
                    idPersistent: idPersistentOrigin0,
                    version: versionOrigin0,
                    disabled: false,
                    justificationTxt: ''
                },
                entityDestination: {
                    displayTxt: displayTextDestination0,
                    displayTxtDetails: 'display_txt_detail',
                    idPersistent: idPersistentDestination0,
                    version: versionDestination0,
                    disabled: false,
                    justificationTxt: ''
                },
                createdBy: {
                    username: userName0,
                    idPersistent: idUser0,
                    permissionGroup: 'Commissioner' as UserPermissionGroup
                },
                state: 'open' as EntityMergeRequestStep
            })
        ),
        newlyCreated: false,
        reverseOriginDestination: newRemote(idEntityMr0),
        merge: newRemote(undefined)
    }
    await waitFor(() => {
        expect(store.getState()).toEqual({
            entityMergeRequestConflicts: expectedConflictState,
            notification: { notificationList: [], notificationMap: {} }
        })
    })
    expect(fetchMock.mock.calls).toEqual([
        [
            `http://127.0.0.1:8000/cosmae/api/merge_requests/entities/${idEntityMr0}/reverse_origin_destination`,
            { credentials: 'include', method: 'POST' }
        ],
        [
            `http://127.0.0.1:8000/cosmae/api/merge_requests/entities/${idEntityMr0}/conflicts`,
            { credentials: 'include' }
        ]
    ])
})
