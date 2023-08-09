import { ColumnDefinition, ColumnType } from '../../../column_menu/state'
import { Entity } from '../../../contribution/entity/state'
import { Remote } from '../../../util/state'
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
import { MergeRequestConflict, TagInstance } from '../state'

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

const tagInstanceOrigin = new TagInstance({
    idPersistent: 'id-instance-origin-test1',
    version: 12,
    value: 'value test origin'
})
const tagInstanceDestination = new TagInstance({
    idPersistent: 'id-instance-destination-test1',
    version: 121,
    value: 'value test destination1'
})
const sharedConflict1 = new Remote(
    new MergeRequestConflict({
        entity: new Entity({
            idPersistent: 'id-entity-test1',
            displayTxt: 'test entity1',
            version: 81
        }),
        tagInstanceOrigin: tagInstanceOrigin,
        tagInstanceDestination: tagInstanceDestination
    })
)
const sharedConflict = new Remote(
    new MergeRequestConflict({
        entity: new Entity({
            idPersistent: 'id-entity-test',
            displayTxt: 'test entity',
            version: 8
        }),
        tagInstanceOrigin: new TagInstance({
            idPersistent: 'id-instance-origin-test',
            version: 12,
            value: 'value test origin'
        }),
        tagInstanceDestination: new TagInstance({
            idPersistent: 'id-instance-destination-test',
            version: 12,
            value: 'value test destination'
        })
    })
)
const updatedConflicts = [sharedConflict, sharedConflict1]
const entity = new Entity({
    idPersistent: 'id-entity-test3',
    displayTxt: 'test entity3',
    version: 83
})
const conflicts = [
    new Remote(
        new MergeRequestConflict({
            entity: new Entity({
                idPersistent: 'id-entity-test2',
                displayTxt: 'test entity2',
                version: 82
            }),
            tagInstanceOrigin: new TagInstance({
                idPersistent: 'id-instance-origin-test2',
                version: 122,
                value: 'value test origin2'
            }),
            tagInstanceDestination: new TagInstance({
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
            tagInstanceOrigin: new TagInstance({
                idPersistent: 'id-instance-origin-test3',
                version: 123,
                value: 'value test origin3'
            }),
            tagInstanceDestination: new TagInstance({
                idPersistent: 'id-instance-destination-test3',
                version: 123,
                value: 'value test destination3'
            })
        })
    ),
    sharedConflict
]
const tagDefOrigin = new ColumnDefinition({
    namePath: ['tag def origin test'],
    idPersistent: 'id-tag-def-origin-test',
    version: 84,
    columnType: ColumnType.String
})
const tagDefDestination = new ColumnDefinition({
    namePath: ['tag def destination test'],
    idPersistent: 'id-tag-def-destination-test',
    version: 841,
    columnType: ColumnType.String
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
        version: sharedConflict.value.entity.version
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
        version: sharedConflict1.value.entity.version
    },
    replace: sharedConflict1.value.replace
}

describe('get conflicts', () => {
    test('success', async () => {
        responseSequence([
            [
                200,
                {
                    tag_definition_origin: {
                        name: tagDefOrigin.namePath[0],
                        id_persistent: tagDefOrigin.idPersistent,
                        type: 'STRING',
                        version: tagDefOrigin.version
                    },
                    tag_definition_destination: {
                        name: tagDefDestination.namePath[0],
                        id_persistent: tagDefDestination.idPersistent,
                        type: 'STRING',
                        version: tagDefDestination.version
                    },
                    updated: [sharedConflictJson, sharedConflictJson1],
                    conflicts: [
                        {
                            entity: {
                                id_persistent: 'id-entity-test2',
                                display_txt: 'test entity2',
                                version: 82
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
                                version: 83
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
        await new GetMergeRequestConflictAction('id-merge-request-test').run(dispatch)
        expect(dispatch.mock.calls).toEqual([
            [new GetMergeRequestConflictStartAction()],
            [
                new GetMergeRequestConflictSuccessAction({
                    updated: updatedConflicts,
                    conflicts: conflicts,
                    tagDefinitionOrigin: tagDefOrigin,
                    tagDefinitionDestination: tagDefDestination
                })
            ]
        ])
    })
    test('error', async () => {
        responseSequence([[400, { msg: 'error' }]])
        const dispatch = jest.fn()
        await new GetMergeRequestConflictAction('id-merge-request-test').run(dispatch)
        expect(dispatch.mock.calls).toEqual([
            [new GetMergeRequestConflictStartAction()],
            [new GetMergeRequestConflictErrorAction('error')]
        ])
    })
})

describe('resolve conflict', () => {
    test('success', async () => {
        responseSequence([[200, {}]])
        const dispatch = jest.fn()
        await new ResolveConflictAction({
            idMergeRequestPersistent: 'id-merge-request-test',
            entity: entity,
            tagDefinitionOrigin: tagDefOrigin,
            tagDefinitionDestination: tagDefDestination,
            tagInstanceOrigin: tagInstanceOrigin,
            tagInstanceDestination: tagInstanceDestination,
            replace: true
        }).run(dispatch)
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
    })
    test('error', async () => {
        responseSequence([[400, { msg: 'error' }]])
        const dispatch = jest.fn()
        await new ResolveConflictAction({
            idMergeRequestPersistent: 'id-merge-request-test',
            entity: entity,
            tagDefinitionOrigin: tagDefOrigin,
            tagDefinitionDestination: tagDefDestination,
            tagInstanceOrigin: tagInstanceOrigin,
            tagInstanceDestination: tagInstanceDestination,
            replace: true
        }).run(dispatch)
        expect(dispatch.mock.calls).toEqual([
            [new ResolveConflictStartAction(entity.idPersistent)],
            [new ResolveConflictErrorAction(entity.idPersistent, 'error')]
        ])
    })
})

describe('start merge', () => {
    test('success', async () => {
        responseSequence([[200, {}]])
        const dispatch = jest.fn()
        await new StartMergeAction('id-merge-request-test').run(dispatch)
        expect(dispatch.mock.calls).toEqual([
            [new StartMergeStartAction()],
            [new StartMergeSuccessAction()]
        ])
    })
    test('error', async () => {
        responseSequence([[400, { msg: 'test error from API' }]])
        const dispatch = jest.fn()
        await new StartMergeAction('id-merge-request-test').run(dispatch)
        expect(dispatch.mock.calls).toEqual([
            [new StartMergeStartAction()],
            [new StartMergeErrorAction('test error from API')]
        ])
    })
    test('error underlying changes', async () => {
        responseSequence([
            [
                400,
                {
                    msg: 'There are conflicts for the merge request, where the underlying data has changed.'
                }
            ]
        ])
        const dispatch = jest.fn()
        await new StartMergeAction('id-merge-request-test').run(dispatch)
        expect(dispatch.mock.calls).toEqual([
            [new StartMergeStartAction()],
            [
                new StartMergeErrorAction(
                    'There are conflicts for the merge request, where the underlying data has changed. Reload the page to see the changes.'
                )
            ]
        ])
    })
    test('error unresolved conflicts', async () => {
        responseSequence([
            [
                400,
                {
                    msg: 'There are unresolved conflicts for the merge request.'
                }
            ]
        ])
        const dispatch = jest.fn()
        await new StartMergeAction('id-merge-request-test').run(dispatch)
        expect(dispatch.mock.calls).toEqual([
            [new StartMergeStartAction()],
            [
                new StartMergeErrorAction(
                    'There are unresolved conflicts for the merge request. Reload the page to see the changes.'
                )
            ]
        ])
    })
})
