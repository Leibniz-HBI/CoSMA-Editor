import { TagType, newTagDefinition } from '../../../column_menu/state'
import { newEntity } from '../../../table/state'
import { UserPermissionGroup, newPublicUserInfo } from '../../../user/state'
import { addError, addSuccessVanish } from '../../../util/notification/slice'
import { Remote } from '../../../util/state'
import { MergeRequestStep, newMergeRequest } from '../../state'
import {
    GetMergeRequestConflictErrorAction,
    GetMergeRequestConflictStartAction,
    GetMergeRequestConflictSuccessAction,
    ResolveConflictErrorAction,
    ResolveConflictStartAction,
    ResolveConflictSuccessAction,
    StartMergeErrorAction,
    StartMergeStartAction,
    StartMergeSuccessAction
} from '../actions'
import {
    GetMergeRequestConflictAction,
    ResolveConflictAction,
    StartMergeAction
} from '../async_actions'
import { MergeRequestConflict, newTagInstance } from '../state'
jest.mock('../../../util/notification/slice', () => {
    const addErrorMock = jest.fn()
    const addSuccessVanish = jest.fn()
    return {
        ...jest.requireActual('../../../util/notification/slice'),
        addError: addErrorMock,
        addSuccessVanish
    }
})

beforeEach(() => {
    ;(addError as unknown as jest.Mock).mockClear()
    ;(addSuccessVanish as unknown as jest.Mock).mockClear()
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function responseSequence(responses: [number, any][]) {
    global.fetch = jest.fn()
    for (const tpl of responses) {
        const [status_code, rsp] = tpl
        ;(global.fetch as jest.Mock).mockImplementationOnce(
            jest.fn(() =>
                Promise.resolve({
                    status: status_code,
                    json: () => Promise.resolve(rsp)
                })
            ) as jest.Mock
        )
    }
}

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
const sharedConflict1 = new Remote(
    new MergeRequestConflict({
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
const sharedConflict = new Remote(
    new MergeRequestConflict({
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
const conflicts = [
    new Remote(
        new MergeRequestConflict({
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
    new Remote(
        new MergeRequestConflict({
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
    replace: sharedConflict.value.replace
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
    replace: sharedConflict1.value.replace
}

describe('get conflicts', () => {
    test('success', async () => {
        responseSequence([
            [
                200,
                {
                    merge_request: {
                        id_persistent: 'id-merge-request',
                        assigned_to: {
                            user_name: 'user_assigned',
                            id_persistent: 'id-user-assigned',
                            permission_group: 'CONTRIBUTOR'
                        },
                        created_by: {
                            user_name: 'user_created',
                            id_persistent: 'id-user-created',
                            permission_group: 'CONTRIBUTOR'
                        },
                        state: 'OPEN',
                        origin: {
                            name: tagDefOrigin.namePath[0],
                            name_path: tagDefOrigin.namePath,
                            id_persistent: tagDefOrigin.idPersistent,
                            type: 'STRING',
                            curated: false,
                            version: tagDefOrigin.version,
                            hidden: false
                        },
                        destination: {
                            name: tagDefDestination.namePath[0],
                            name_path: tagDefDestination.namePath,
                            id_persistent: tagDefDestination.idPersistent,
                            type: 'STRING',
                            curated: false,
                            version: tagDefDestination.version,
                            hidden: false
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
        const dispatch = jest.fn()
        const reduxDispatch = jest.fn()
        await new GetMergeRequestConflictAction('id-merge-request-test').run(
            dispatch,
            reduxDispatch
        )
        expect(dispatch.mock.calls).toEqual([
            [new GetMergeRequestConflictStartAction()],
            [
                new GetMergeRequestConflictSuccessAction({
                    updated: updatedConflicts,
                    conflicts: conflicts,
                    mergeRequest: newMergeRequest({
                        idPersistent: 'id-merge-request',
                        step: MergeRequestStep.Open,
                        createdBy: newPublicUserInfo({
                            userName: 'user_created',
                            idPersistent: 'id-user-created',
                            permissionGroup: UserPermissionGroup.CONTRIBUTOR
                        }),
                        assignedTo: newPublicUserInfo({
                            userName: 'user_assigned',
                            idPersistent: 'id-user-assigned',
                            permissionGroup: UserPermissionGroup.CONTRIBUTOR
                        }),
                        originTagDefinition: tagDefOrigin,
                        destinationTagDefinition: tagDefDestination
                    })
                })
            ]
        ])
        expect(reduxDispatch.mock.calls.length).toEqual(0)
    })
    test('error', async () => {
        responseSequence([[400, { msg: 'error' }]])
        const dispatch = jest.fn()
        const reduxDispatch = jest.fn()
        await new GetMergeRequestConflictAction('id-merge-request-test').run(
            dispatch,
            reduxDispatch
        )
        expect(dispatch.mock.calls).toEqual([
            [new GetMergeRequestConflictStartAction()],
            [new GetMergeRequestConflictErrorAction()]
        ])
        expect((addError as unknown as jest.Mock).mock.calls).toEqual([['error']])
        expect(reduxDispatch.mock.calls.length).toEqual(1)
    })
})

describe('resolve conflict', () => {
    test('success', async () => {
        responseSequence([[200, {}]])
        const dispatch = jest.fn()
        const reduxDispatch = jest.fn()
        await new ResolveConflictAction({
            idMergeRequestPersistent: 'id-merge-request-test',
            entity: entity,
            tagDefinitionOrigin: tagDefOrigin,
            tagDefinitionDestination: tagDefDestination,
            tagInstanceOrigin: tagInstanceOrigin,
            tagInstanceDestination: tagInstanceDestination,
            replace: true
        }).run(dispatch, reduxDispatch)
        expect(dispatch.mock.calls).toEqual([
            [new ResolveConflictStartAction(entity.idPersistent)],
            [new ResolveConflictSuccessAction(entity.idPersistent, true)]
        ])
        expect((global.fetch as jest.Mock).mock.calls).toEqual([
            [
                'http://127.0.0.1:8000/cosmae/api/merge_requests/id-merge-request-test/resolve',
                {
                    credentials: 'include',
                    method: 'POST',
                    body: JSON.stringify({
                        id_entity_version: entity.version,
                        id_tag_definition_origin_version: tagDefOrigin.version,
                        id_tag_instance_origin_version: tagInstanceOrigin.version,
                        id_tag_definition_destination_version:
                            tagDefDestination.version,
                        id_tag_instance_destination_version:
                            tagInstanceDestination.version,
                        id_entity_persistent: entity.idPersistent,
                        id_tag_definition_origin_persistent: tagDefOrigin.idPersistent,
                        id_tag_instance_origin_persistent:
                            tagInstanceOrigin.idPersistent,
                        id_tag_definition_destination_persistent:
                            tagDefDestination.idPersistent,
                        id_tag_instance_destination_persistent:
                            tagInstanceDestination.idPersistent,
                        replace: true
                    })
                }
            ]
        ])
        expect(reduxDispatch.mock.calls.length).toEqual(0)
    })
    test('error', async () => {
        responseSequence([[400, { msg: 'error' }]])
        const dispatch = jest.fn()
        const reduxDispatch = jest.fn()
        await new ResolveConflictAction({
            idMergeRequestPersistent: 'id-merge-request-test',
            entity: entity,
            tagDefinitionOrigin: tagDefOrigin,
            tagDefinitionDestination: tagDefDestination,
            tagInstanceOrigin: tagInstanceOrigin,
            tagInstanceDestination: tagInstanceDestination,
            replace: true
        }).run(dispatch, reduxDispatch)
        expect(dispatch.mock.calls).toEqual([
            [new ResolveConflictStartAction(entity.idPersistent)],
            [new ResolveConflictErrorAction(entity.idPersistent)]
        ])
        expect(reduxDispatch.mock.calls.length).toEqual(1)
        expect((addError as unknown as jest.Mock).mock.calls).toEqual([['error']])
    })
})

describe('start merge', () => {
    test('success', async () => {
        responseSequence([[200, {}]])
        const dispatch = jest.fn()
        const reduxDispatch = jest.fn()
        await new StartMergeAction('id-merge-request-test').run(dispatch, reduxDispatch)
        expect(dispatch.mock.calls).toEqual([
            [new StartMergeStartAction()],
            [new StartMergeSuccessAction()]
        ])
        expect(reduxDispatch.mock.calls.length).toEqual(1)
        expect((addSuccessVanish as unknown as jest.Mock).mock.calls).toEqual([
            ['Application of resolutions started.']
        ])
    })
    test('error', async () => {
        responseSequence([[400, { msg: 'test error from API' }]])
        const dispatch = jest.fn()
        const reduxDispatch = jest.fn()
        await new StartMergeAction('id-merge-request-test').run(dispatch, reduxDispatch)
        expect(dispatch.mock.calls).toEqual([
            [new StartMergeStartAction()],
            [new StartMergeErrorAction()]
        ])
        expect(reduxDispatch.mock.calls.length).toEqual(1)
        expect((addError as unknown as jest.Mock).mock.calls).toEqual([
            ['test error from API']
        ])
    })
    test('error underlying changes', async () => {
        const errorMsg =
            'There are conflicts for the merge request, where the underlying data has changed.'
        responseSequence([
            [
                400,
                {
                    msg: errorMsg
                }
            ]
        ])
        const dispatch = jest.fn()
        const reduxDispatch = jest.fn()
        await new StartMergeAction('id-merge-request-test').run(dispatch, reduxDispatch)
        expect(dispatch.mock.calls).toEqual([
            [new StartMergeStartAction()],
            [new StartMergeErrorAction()]
        ])
        expect(reduxDispatch.mock.calls.length).toEqual(1)
        expect((addError as unknown as jest.Mock).mock.calls).toEqual([
            [errorMsg + ' Reload the page to see the changes.']
        ])
    })
    test('error unresolved conflicts', async () => {
        const errorMsg = 'There are unresolved conflicts for the merge request.'
        responseSequence([
            [
                400,
                {
                    msg: errorMsg
                }
            ]
        ])
        const dispatch = jest.fn()
        const reduxDispatch = jest.fn()
        await new StartMergeAction('id-merge-request-test').run(dispatch, reduxDispatch)
        expect(dispatch.mock.calls).toEqual([
            [new StartMergeStartAction()],
            [new StartMergeErrorAction()]
        ])
        expect(reduxDispatch.mock.calls.length).toEqual(1)
        expect((addError as unknown as jest.Mock).mock.calls).toEqual([
            [errorMsg + ' Reload the page to see the changes.']
        ])
    })
})
