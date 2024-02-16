import { newEntity } from '../../../table/state'
import { Remote } from '../../../util/state'
import {
    GetMergeRequestConflictErrorAction,
    GetMergeRequestConflictStartAction,
    GetMergeRequestConflictSuccessAction,
    ResolveConflictErrorAction,
    ResolveConflictStartAction,
    ResolveConflictSuccessAction,
    StartMergeClearErrorAction,
    StartMergeErrorAction,
    StartMergeStartAction,
    StartMergeSuccessAction
} from '../actions'
import { mergeRequestConflictResolutionReducer } from '../reducer'
import {
    MergeRequestConflict,
    MergeRequestConflictResolutionState,
    MergeRequestConflictsByState,
    newTagInstance
} from '../state'
import { TagType, newTagDefinition } from '../../../column_menu/state'
import { MergeRequestStep, newMergeRequest } from '../../state'
import { UserPermissionGroup, newPublicUserInfo } from '../../../user/state'

const idMergeRequestTest = 'id-merge-request-test'
const assignedToUserTest = newPublicUserInfo({
    idPersistent: 'id-assigned-to-test',
    userName: 'assignedToTest',
    permissionGroup: UserPermissionGroup.APPLICANT
})

const createdByUserTest = newPublicUserInfo({
    idPersistent: 'id-created-by-test',
    userName: 'createdByTest',
    permissionGroup: UserPermissionGroup.CONTRIBUTOR
})

const sharedConflict1 = new Remote(
    new MergeRequestConflict({
        entity: newEntity({
            idPersistent: 'id-entity-test1',
            displayTxt: 'test entity1',
            version: 81,
            disabled: false
        }),
        tagInstanceOrigin: newTagInstance({
            idPersistent: 'id-instance-origin-test1',
            version: 12,
            value: 'value test origin'
        }),
        tagInstanceDestination: newTagInstance({
            idPersistent: 'id-instance-destination-test1',
            version: 121,
            value: 'value test destination1'
        })
    })
)
const sharedConflict = new Remote(
    new MergeRequestConflict({
        entity: newEntity({
            idPersistent: 'id-entity-test',
            displayTxt: 'test entity',
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
const conflicts = [
    new Remote(
        new MergeRequestConflict({
            entity: newEntity({
                idPersistent: 'id-entity-test2',
                displayTxt: 'test entity2',
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
            entity: newEntity({
                idPersistent: 'id-entity-test3',
                displayTxt: 'test entity3',
                version: 83,
                disabled: false
            }),
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
describe('get conflicts', () => {
    test('start loading', () => {
        const initialState = new MergeRequestConflictResolutionState(
            new Remote(undefined),
            new Remote(false)
        )
        const expectedState = new MergeRequestConflictResolutionState(
            new Remote(undefined, true),
            new Remote(false)
        )
        const endState = mergeRequestConflictResolutionReducer(
            initialState,
            new GetMergeRequestConflictStartAction()
        )
        expect(endState).toEqual(expectedState)
    })
    test('success', () => {
        const initialState = new MergeRequestConflictResolutionState(
            new Remote(undefined, true),
            new Remote(false)
        )
        const expectedState = new MergeRequestConflictResolutionState(
            new Remote(
                new MergeRequestConflictsByState({
                    conflicts: conflicts,
                    updated: updatedConflicts,
                    mergeRequest: newMergeRequest({
                        idPersistent: idMergeRequestTest,
                        assignedTo: assignedToUserTest,
                        createdBy: createdByUserTest,
                        step: MergeRequestStep.Conflicts,
                        originTagDefinition: tagDefOrigin,
                        destinationTagDefinition: tagDefDestination
                    })
                })
            ),
            new Remote(false)
        )
        const endState = mergeRequestConflictResolutionReducer(
            initialState,
            new GetMergeRequestConflictSuccessAction({
                conflicts: conflicts,
                updated: updatedConflicts,
                mergeRequest: newMergeRequest({
                    idPersistent: idMergeRequestTest,
                    assignedTo: assignedToUserTest,
                    createdBy: createdByUserTest,
                    step: MergeRequestStep.Conflicts,
                    originTagDefinition: tagDefOrigin,
                    destinationTagDefinition: tagDefDestination
                })
            })
        )
        expect(endState).toEqual(expectedState)
    })
    test('error', () => {
        const initialState = new MergeRequestConflictResolutionState(
            new Remote(undefined, true),
            new Remote(false)
        )
        const expectedState = new MergeRequestConflictResolutionState(
            new Remote(undefined, false, undefined),
            new Remote(false)
        )
        const endState = mergeRequestConflictResolutionReducer(
            initialState,
            new GetMergeRequestConflictErrorAction()
        )
        expect(endState).toEqual(expectedState)
    })
})
describe('resolve conflict', () => {
    test('start', () => {
        const initialState = new MergeRequestConflictResolutionState(
            new Remote(
                new MergeRequestConflictsByState({
                    updated: updatedConflicts,
                    conflicts: conflicts,
                    mergeRequest: newMergeRequest({
                        idPersistent: idMergeRequestTest,
                        assignedTo: assignedToUserTest,
                        createdBy: createdByUserTest,
                        step: MergeRequestStep.Conflicts,
                        originTagDefinition: tagDefOrigin,
                        destinationTagDefinition: tagDefDestination
                    })
                })
            ),
            new Remote(false)
        )
        const changedSharedConflict = new Remote(sharedConflict.value, true)
        const expectedState = new MergeRequestConflictResolutionState(
            new Remote(
                new MergeRequestConflictsByState({
                    updated: [changedSharedConflict, sharedConflict1],
                    conflicts: [...conflicts.slice(0, 3), changedSharedConflict],
                    mergeRequest: newMergeRequest({
                        idPersistent: idMergeRequestTest,
                        assignedTo: assignedToUserTest,
                        createdBy: createdByUserTest,
                        step: MergeRequestStep.Conflicts,
                        originTagDefinition: tagDefOrigin,
                        destinationTagDefinition: tagDefDestination
                    })
                })
            ),
            new Remote(false)
        )
        const endState = mergeRequestConflictResolutionReducer(
            initialState,
            new ResolveConflictStartAction(sharedConflict.value.entity.idPersistent)
        )
        expect(endState).toEqual(expectedState)
    })
    test('success', () => {
        const changedSharedConflict = new Remote(sharedConflict.value, true)
        const initialState = new MergeRequestConflictResolutionState(
            new Remote(
                new MergeRequestConflictsByState({
                    updated: [changedSharedConflict, sharedConflict1],
                    conflicts: [...conflicts.slice(0, 3), changedSharedConflict],
                    mergeRequest: newMergeRequest({
                        idPersistent: idMergeRequestTest,
                        assignedTo: assignedToUserTest,
                        createdBy: createdByUserTest,
                        step: MergeRequestStep.Conflicts,
                        originTagDefinition: tagDefOrigin,
                        destinationTagDefinition: tagDefDestination
                    })
                })
            ),
            new Remote(false)
        )
        const expectedSharedConflict = new Remote(
            new MergeRequestConflict({ ...sharedConflict.value, replace: false })
        )
        const expectedState = new MergeRequestConflictResolutionState(
            new Remote(
                new MergeRequestConflictsByState({
                    updated: [sharedConflict1],
                    conflicts: [...conflicts.slice(0, 3), expectedSharedConflict],
                    mergeRequest: newMergeRequest({
                        idPersistent: idMergeRequestTest,
                        assignedTo: assignedToUserTest,
                        createdBy: createdByUserTest,
                        step: MergeRequestStep.Conflicts,
                        originTagDefinition: tagDefOrigin,
                        destinationTagDefinition: tagDefDestination
                    })
                })
            ),
            new Remote(false)
        )
        const endState = mergeRequestConflictResolutionReducer(
            initialState,
            new ResolveConflictSuccessAction(
                sharedConflict.value.entity.idPersistent,
                false
            )
        )
        expect(endState).toEqual(expectedState)
    })
    test('error', () => {
        const changedSharedConflict = new Remote(sharedConflict.value, true)
        const initialState = new MergeRequestConflictResolutionState(
            new Remote(
                new MergeRequestConflictsByState({
                    updated: [changedSharedConflict, sharedConflict1],
                    conflicts: [...conflicts.slice(0, 3), changedSharedConflict],
                    mergeRequest: newMergeRequest({
                        idPersistent: idMergeRequestTest,
                        assignedTo: assignedToUserTest,
                        createdBy: createdByUserTest,
                        step: MergeRequestStep.Conflicts,
                        originTagDefinition: tagDefOrigin,
                        destinationTagDefinition: tagDefDestination
                    })
                })
            ),
            new Remote(false)
        )
        const expectedSharedConflict = new Remote(
            sharedConflict.value,
            false,
            undefined
        )
        const expectedState = new MergeRequestConflictResolutionState(
            new Remote(
                new MergeRequestConflictsByState({
                    updated: [expectedSharedConflict, sharedConflict1],
                    conflicts: [...conflicts.slice(0, 3), expectedSharedConflict],
                    mergeRequest: newMergeRequest({
                        idPersistent: idMergeRequestTest,
                        assignedTo: assignedToUserTest,
                        createdBy: createdByUserTest,
                        step: MergeRequestStep.Conflicts,
                        originTagDefinition: tagDefOrigin,
                        destinationTagDefinition: tagDefDestination
                    })
                })
            ),
            new Remote(false)
        )
        const endState = mergeRequestConflictResolutionReducer(
            initialState,
            new ResolveConflictErrorAction(sharedConflict.value.entity.idPersistent)
        )
        expect(endState).toEqual(expectedState)
    })
})

describe('start merge', () => {
    test('start', () => {
        const initialState = new MergeRequestConflictResolutionState(
            new Remote(undefined),
            new Remote(false)
        )
        const expectedState = new MergeRequestConflictResolutionState(
            new Remote(undefined),
            new Remote(false, true)
        )
        const endState = mergeRequestConflictResolutionReducer(
            initialState,
            new StartMergeStartAction()
        )
        expect(endState).toEqual(expectedState)
    })
    test('success', () => {
        const initialState = new MergeRequestConflictResolutionState(
            new Remote(undefined),
            new Remote(false, true)
        )
        const expectedState = new MergeRequestConflictResolutionState(
            new Remote(undefined),
            new Remote(true)
        )
        const endState = mergeRequestConflictResolutionReducer(
            initialState,
            new StartMergeSuccessAction()
        )
        expect(endState).toEqual(expectedState)
    })
    test('error', () => {
        const initialState = new MergeRequestConflictResolutionState(
            new Remote(undefined),
            new Remote(false, true)
        )
        const expectedState = new MergeRequestConflictResolutionState(
            new Remote(undefined),
            new Remote(false, false, undefined)
        )
        const endState = mergeRequestConflictResolutionReducer(
            initialState,
            new StartMergeErrorAction()
        )
        expect(endState).toEqual(expectedState)
    })
    test('clear error', () => {
        const initialState = new MergeRequestConflictResolutionState(
            new Remote(undefined),
            new Remote(false, false, 'error')
        )
        const expectedState = new MergeRequestConflictResolutionState(
            new Remote(undefined),
            new Remote(false, false)
        )
        const endState = mergeRequestConflictResolutionReducer(
            initialState,
            new StartMergeClearErrorAction()
        )
        expect(endState).toEqual(expectedState)
    })
})
