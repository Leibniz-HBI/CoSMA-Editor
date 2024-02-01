/**
 * @jest-environment jsdom
 */
import {
    RenderOptions,
    render,
    waitFor,
    screen,
    getByText
} from '@testing-library/react'
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
import { EntityMergeRequestConflictView } from '../components'
import { EntityMergeRequestStep, newEntityMergeRequest } from '../../state'

jest.mock('react-router-dom', () => {
    const navigateCallbackMock = jest.fn()
    const useNavigateMock = jest.fn().mockReturnValue(navigateCallbackMock)
    return { useNavigate: useNavigateMock }
})
jest.mock('uuid', () => {
    return {
        v4: () => 'id-error-test'
    }
})
jest.mock('react-router-dom', () => {
    const loaderMock = jest.fn()
    loaderMock.mockReturnValue('id-entity-merge-request-test')
    return { useLoaderData: loaderMock, useNavigate: jest.fn() }
})

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: {
        notification: NotificationManager
        entityMergeRequestConflicts: EntityMergeRequestConflictsState
    }
}

export function renderWithProviders(
    ui: React.ReactElement,
    fetchMock: jest.Mock,
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
const idTagDefResolvable0 = 'id-tag-def-resolvable-0'
const idTagDefParentResolvable0 = 'id-tag-def-parent-resolvable-0'
const versionTagDefResolvable0 = 7770
const idTagInstanceOriginResolvable0 = 'id-instance-origin-resolvable-0'
const versionTagInstanceOriginResolvable0 = 7780
const valueTagInstanceOriginResolvable0 = 'resolvable value origin 0'
const idTagInstanceDestinationResolvable0 = 'id-instance-resolvable-destination-0'
const versionTagInstanceDestinationResolvable0 = 7740
const valueTagInstanceDestinationResolvable0 = 'resolvable value destination 0'
const namePathResolvable1 = ['name path', 'resolvable 1']
const idTagDefResolvable1 = 'id-tag-def-resolvable-1'
const idTagDefParentResolvable1 = 'id-tag-def-parent-resolvable-1'
const versionTagDefResolvable1 = 7771
const idTagInstanceOriginResolvable1 = 'id-instance-origin-resolvable-1'
const versionTagInstanceOriginResolvable1 = 7781
const valueTagInstanceOriginResolvable1 = 'resolvable value origin 1'
const idTagInstanceDestinationResolvable1 = 'id-instance-resolvable-destination-1'
const versionTagInstanceDestinationResolvable1 = 7741
const valueTagInstanceDestinationResolvable1 = 'resolvable value destination 1'
const namePathResolvable2 = ['name path', 'resolvable 2']
const idTagDefResolvable2 = 'id-tag-def-resolvable-2'
const idTagDefParentResolvable2 = 'id-tag-def-parent-resolvable-2'
const versionTagDefResolvable2 = 7772
const idTagInstanceOriginResolvable2 = 'id-instance-origin-resolvable-2'
const versionTagInstanceOriginResolvable2 = 7782
const valueTagInstanceOriginResolvable2 = 'resolvable value origin 2'
const idTagInstanceDestinationResolvable2 = 'id-instance-resolvable-destination-2'
const versionTagInstanceDestinationResolvable2 = 7742
const valueTagInstanceDestinationResolvable2 = 'resolvable value destination 2'
const namePathUnresolvable0 = ['name path', 'unresolvable 0']
const idTagDefUnresolvable0 = 'id-tag-def-unresolvable-0'
const idTagDefParentUnresolvable0 = 'id-tag-def-parent-unresolvable-0'
const versionTagDefUnresolvable0 = 7770
const idTagInstanceOriginUnresolvable0 = 'id-instance-origin-unresolvable-0'
const versionTagInstanceOriginUnresolvable0 = 7780
const valueTagInstanceOriginUnresolvable0 = 'unresolvable value origin 0'
const idTagInstanceDestinationUnresolvable0 = 'id-instance-unresolvable-destination-0'
const versionTagInstanceDestinationUnresolvable0 = 7740
const valueTagInstanceDestinationUnresolvable0 = 'unresolvable value destination 0'
const namePathUnresolvable1 = ['name path', 'unresolvable 1']
const idTagDefUnresolvable1 = 'id-tag-def-unresolvable-1'
const idTagDefParentUnresolvable1 = 'id-tag-def-parent-unresolvable-1'
const versionTagDefUnresolvable1 = 7771
const idTagInstanceOriginUnresolvable1 = 'id-instance-origin-unresolvable-1'
const versionTagInstanceOriginUnresolvable1 = 7781
const valueTagInstanceOriginUnresolvable1 = 'unresolvable value origin 1'
const idTagInstanceDestinationUnresolvable1 = 'id-instance-unresolvable-destination-1'
const versionTagInstanceDestinationUnresolvable1 = 7741
const valueTagInstanceDestinationUnresolvable1 = 'unresolvable value destination 1'

function addSuccessResponse(fetchMock: jest.Mock) {
    const entityMergeRequestApi = {
        id_persistent: idEntityMr0,
        origin: {
            display_txt: displayTextOrigin0,
            display_txt_details: 'display_txt_detail',
            id_persistent: idPersistentOrigin0,
            version: versionOrigin0,
            disabled: false
        },
        destination: {
            display_txt: displayTextDestination0,
            display_txt_details: 'display_txt_detail',
            id_persistent: idPersistentDestination0,
            version: versionDestination0,
            disabled: false
        },
        created_by: {
            user_name: userName0,
            id_persistent: idUser0,
            permission_group: permissionGroup0
        },
        state: 'OPEN'
    }
    const resolvableConflict1 = {
        tag_definition: {
            name_path: namePathResolvable1,
            id_persistent: idTagDefResolvable1,
            id_parent_persistent: idTagDefParentResolvable1,
            version: versionTagDefResolvable1,
            curated: false
        },
        tag_instance_origin: {
            id_persistent: idTagInstanceOriginResolvable1,
            value: valueTagInstanceOriginResolvable1,
            version: versionTagInstanceOriginResolvable1
        },
        tag_instance_destination: {
            id_persistent: idTagInstanceDestinationResolvable1,
            value: valueTagInstanceDestinationResolvable1,
            version: versionTagInstanceDestinationResolvable1
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
                        tag_definition: {
                            name_path: namePathResolvable0,
                            id_persistent: idTagDefResolvable0,
                            id_parent_persistent: idTagDefParentResolvable0,
                            version: versionTagDefResolvable0,
                            curated: false
                        },
                        tag_instance_origin: {
                            id_persistent: idTagInstanceOriginResolvable0,
                            value: valueTagInstanceOriginResolvable0,
                            version: versionTagInstanceOriginResolvable0
                        },
                        tag_instance_destination: {
                            id_persistent: idTagInstanceDestinationResolvable0,
                            value: valueTagInstanceDestinationResolvable0,
                            version: versionTagInstanceDestinationResolvable0
                        },
                        replace: true
                    },
                    resolvableConflict1,
                    {
                        tag_definition: {
                            name_path: namePathResolvable2,
                            id_persistent: idTagDefResolvable2,
                            id_parent_persistent: idTagDefParentResolvable2,
                            version: versionTagDefResolvable2,
                            curated: false
                        },
                        tag_instance_origin: {
                            id_persistent: idTagInstanceOriginResolvable2,
                            value: valueTagInstanceOriginResolvable2,
                            version: versionTagInstanceOriginResolvable2
                        },
                        tag_instance_destination: {
                            id_persistent: idTagInstanceDestinationResolvable2,
                            value: valueTagInstanceDestinationResolvable2,
                            version: versionTagInstanceDestinationResolvable2
                        },
                        replace: false
                    }
                ],
                updated: [resolvableConflict1],
                unresolvable_conflicts: [
                    {
                        tag_definition: {
                            name_path: namePathUnresolvable0,
                            id_persistent: idTagDefUnresolvable0,
                            id_parent_persistent: idTagDefParentUnresolvable0,
                            version: versionTagDefUnresolvable0,
                            curated: false
                        },
                        tag_instance_origin: {
                            id_persistent: idTagInstanceOriginUnresolvable0,
                            value: valueTagInstanceOriginUnresolvable0,
                            version: versionTagInstanceOriginUnresolvable0
                        },
                        tag_instance_destination: {
                            id_persistent: idTagInstanceDestinationUnresolvable0,
                            value: valueTagInstanceDestinationUnresolvable0,
                            version: versionTagInstanceDestinationUnresolvable0
                        }
                    },
                    {
                        tag_definition: {
                            name_path: namePathUnresolvable1,
                            id_persistent: idTagDefUnresolvable1,
                            id_parent_persistent: idTagDefParentUnresolvable1,
                            version: versionTagDefUnresolvable1,
                            curated: false
                        },
                        tag_instance_origin: {
                            id_persistent: idTagInstanceOriginUnresolvable1,
                            value: valueTagInstanceOriginUnresolvable1,
                            version: versionTagInstanceOriginUnresolvable1
                        },
                        tag_instance_destination: {
                            id_persistent: idTagInstanceDestinationUnresolvable1,
                            value: valueTagInstanceDestinationUnresolvable1,
                            version: versionTagInstanceDestinationUnresolvable1
                        }
                    }
                ]
            }
        ],
        [200, {}]
    ])
}

test('update conflicts', async () => {
    const fetchMock = jest.fn()
    addSuccessResponse(fetchMock)
    const { store } = renderWithProviders(<EntityMergeRequestConflictView />, fetchMock)
    await waitFor(() => {
        screen.getByText(valueTagInstanceOriginResolvable0)
        screen.getByText(valueTagInstanceDestinationResolvable0)
        const textValueOriginList = screen.getAllByText(
            valueTagInstanceOriginResolvable1
        )
        expect(textValueOriginList.length).toEqual(2)
        const textValueDestinationList = screen.getAllByText(
            valueTagInstanceDestinationResolvable1
        )
        expect(textValueDestinationList.length).toEqual(2)
        screen.getByText(valueTagInstanceOriginResolvable2)
        screen.getByText(valueTagInstanceDestinationResolvable2)
        screen.getByText(valueTagInstanceOriginUnresolvable0)
        screen.getByText(valueTagInstanceDestinationUnresolvable0)
        screen.getByText(valueTagInstanceOriginUnresolvable1)
        screen.getByText(valueTagInstanceDestinationUnresolvable1)
    })
    const conflictResolvable1 = newEntityMergeRequestConflict({
        tagDefinition: {
            namePath: namePathResolvable1,
            idPersistent: idTagDefResolvable1,
            idParentPersistent: idTagDefParentResolvable1,
            curated: false,
            version: versionTagDefResolvable1
        },
        tagInstanceOrigin: {
            idPersistent: idTagInstanceOriginResolvable1,
            value: valueTagInstanceOriginResolvable1,
            version: versionTagInstanceOriginResolvable1
        },
        tagInstanceDestination: {
            idPersistent: idTagInstanceDestinationResolvable1,
            value: valueTagInstanceDestinationResolvable1,
            version: versionTagInstanceDestinationResolvable1
        },
        replace: undefined
    })
    const expectedState = {
        conflicts: newRemote({
            resolvableConflicts: [
                newRemote(
                    newEntityMergeRequestConflict({
                        tagDefinition: {
                            namePath: namePathResolvable0,
                            idPersistent: idTagDefResolvable0,
                            idParentPersistent: idTagDefParentResolvable0,
                            curated: false,
                            version: versionTagDefResolvable0
                        },
                        tagInstanceOrigin: {
                            idPersistent: idTagInstanceOriginResolvable0,
                            value: valueTagInstanceOriginResolvable0,
                            version: versionTagInstanceOriginResolvable0
                        },
                        tagInstanceDestination: {
                            idPersistent: idTagInstanceDestinationResolvable0,
                            value: valueTagInstanceDestinationResolvable0,
                            version: versionTagInstanceDestinationResolvable0
                        },
                        replace: true
                    })
                ),
                newRemote(conflictResolvable1),
                newRemote(
                    newEntityMergeRequestConflict({
                        tagDefinition: {
                            namePath: namePathResolvable2,
                            idPersistent: idTagDefResolvable2,
                            idParentPersistent: idTagDefParentResolvable2,
                            curated: false,
                            version: versionTagDefResolvable2
                        },
                        tagInstanceOrigin: {
                            idPersistent: idTagInstanceOriginResolvable2,
                            value: valueTagInstanceOriginResolvable2,
                            version: versionTagInstanceOriginResolvable2
                        },
                        tagInstanceDestination: {
                            idPersistent: idTagInstanceDestinationResolvable2,
                            value: valueTagInstanceDestinationResolvable2,
                            version: versionTagInstanceDestinationResolvable2
                        },
                        replace: false
                    })
                )
            ],
            unresolvableConflicts: [
                newRemote(
                    newEntityMergeRequestConflict({
                        tagDefinition: {
                            namePath: namePathUnresolvable0,
                            idPersistent: idTagDefUnresolvable0,
                            idParentPersistent: idTagDefParentUnresolvable0,
                            curated: false,
                            version: versionTagDefUnresolvable0
                        },
                        tagInstanceOrigin: {
                            idPersistent: idTagInstanceOriginUnresolvable0,
                            value: valueTagInstanceOriginUnresolvable0,
                            version: versionTagInstanceOriginUnresolvable0
                        },
                        tagInstanceDestination: {
                            idPersistent: idTagInstanceDestinationUnresolvable0,
                            value: valueTagInstanceDestinationUnresolvable0,
                            version: versionTagInstanceDestinationUnresolvable0
                        }
                    })
                ),
                newRemote(
                    newEntityMergeRequestConflict({
                        tagDefinition: {
                            namePath: namePathUnresolvable1,
                            idPersistent: idTagDefUnresolvable1,
                            idParentPersistent: idTagDefParentUnresolvable1,
                            version: versionTagDefUnresolvable1,
                            curated: false
                        },
                        tagInstanceOrigin: {
                            idPersistent: idTagInstanceOriginUnresolvable1,
                            value: valueTagInstanceOriginUnresolvable1,
                            version: versionTagInstanceOriginUnresolvable1
                        },
                        tagInstanceDestination: {
                            idPersistent: idTagInstanceDestinationUnresolvable1,
                            value: valueTagInstanceDestinationUnresolvable1,
                            version: versionTagInstanceDestinationUnresolvable1
                        }
                    })
                )
            ],
            updated: [newRemote(conflictResolvable1)],
            updatedTagDefinitionIdMap: { 'id-tag-def-resolvable-1': 0 },
            resolvableConflictsTagDefinitionIdMap: {
                'id-tag-def-resolvable-0': 0,
                'id-tag-def-resolvable-1': 1,
                'id-tag-def-resolvable-2': 2
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
                    disabled: false
                },
                entityDestination: {
                    displayTxt: displayTextDestination0,
                    displayTxtDetails: 'display_txt_detail',
                    idPersistent: idPersistentDestination0,
                    version: versionDestination0,
                    disabled: false
                },
                createdBy: {
                    userName: userName0,
                    idPersistent: idUser0,
                    permissionGroup: 'Commissioner' as UserPermissionGroup
                },
                state: 'open' as EntityMergeRequestStep
            })
        ),
        newlyCreated: false,
        reverseOriginDestination: newRemote(undefined),
        merge: newRemote(undefined)
    }
    expect(store.getState()).toEqual({
        entityMergeRequestConflicts: expectedState,
        notification: { notificationList: [], notificationMap: {} }
    })
    const updatedConflictsLabel = screen.getByText(
        'For the following conflicts the underlying data has changed'
    )
    const updatedAccordion = updatedConflictsLabel.parentElement?.parentElement
    expect(updatedAccordion?.className).toEqual('accordion-item')
    if (updatedAccordion === null || updatedAccordion === undefined) {
        throw new Error('Could not find updated accordion')
    }
    const keepButton = getByText(updatedAccordion, 'Keep Existing Value')
    keepButton.click()
    await waitFor(() => {
        screen.getByText(valueTagInstanceOriginResolvable1)
        screen.getByText(valueTagInstanceDestinationResolvable1)
    })
    expect(
        store.getState().entityMergeRequestConflicts.conflicts.value?.updated.length
    ).toEqual(0)
    expect(
        Object.keys(
            store.getState().entityMergeRequestConflicts.conflicts.value
                ?.updatedTagDefinitionIdMap ?? { a: 1 } // just make sure it is not null
        ).length
    ).toEqual(0)
})
