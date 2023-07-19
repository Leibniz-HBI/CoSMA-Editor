import { ColumnDefinition, ColumnType } from '../../../column_menu/state'
import { Remote } from '../../../util/state'
import {
    LoadContributionDetailsErrorAction,
    LoadContributionDetailsStartAction,
    LoadContributionDetailsSuccessAction
} from '../../details/action'
import { Contribution, ContributionStep } from '../../state'
import {
    CompleteEntityAssignmentClearErrorAction,
    CompleteEntityAssignmentErrorAction,
    CompleteEntityAssignmentStartAction,
    CompleteEntityAssignmentSuccessAction,
    GetContributionEntitiesErrorAction,
    GetContributionEntitiesStartAction,
    GetContributionEntitiesSuccessAction,
    GetContributionEntityDuplicatesErrorAction,
    GetContributionEntityDuplicatesStartAction,
    GetContributionEntityDuplicatesSuccessAction,
    GetContributionTagInstancesErrorAction,
    GetContributionTagInstancesStartAction,
    GetContributionTagInstancesSuccessAction,
    PutDuplicateErrorAction,
    PutDuplicateStartAction,
    PutDuplicateSuccessAction
} from '../action'
import { contributionEntityReducer } from '../reducer'
import {
    ContributionEntityState,
    EntityWithDuplicates,
    ScoredEntity,
    TagInstance
} from '../state'

const idPersistentTest = 'test-id'
const idPersistentTest1 = 'test-id-1'
const idPersistentTest2 = 'test-id2'
const displayTxtTest = 'entity for test'
const displayTxtTest1 = 'entity for test 1'
const displayTxtTest2 = 'entity for test 2'
const versionTest = 12
const versionTest1 = 2
const versionTest2 = 18

const entity = new EntityWithDuplicates({
    idPersistent: idPersistentTest,
    displayTxt: displayTxtTest,
    version: versionTest,
    similarEntities: new Remote([])
})

const entity1 = new EntityWithDuplicates({
    idPersistent: idPersistentTest1,
    displayTxt: displayTxtTest1,
    version: versionTest1,
    similarEntities: new Remote([])
})

const entity2 = new EntityWithDuplicates({
    idPersistent: idPersistentTest2,
    displayTxt: displayTxtTest2,
    version: versionTest2,
    similarEntities: new Remote([])
})
const entities = [entity, entity1, entity2]

describe('get entities', () => {
    test('get entities start', () => {
        const initialState = new ContributionEntityState({
            entities: new Remote([], false, 'error')
        })
        const expectedState = new ContributionEntityState({
            entities: new Remote([], true)
        })
        const endState = contributionEntityReducer(
            initialState,
            new GetContributionEntitiesStartAction()
        )
        expect(endState).toEqual(expectedState)
    })
    test('get entities success', () => {
        const initialState = new ContributionEntityState({
            entities: new Remote([entity], true)
        })
        const expectedState = new ContributionEntityState({
            entities: new Remote([entity])
        })
        const endState = contributionEntityReducer(
            initialState,
            new GetContributionEntitiesSuccessAction([entity])
        )
        expect(endState).toEqual(expectedState)
    })
    test('get entities error', () => {
        const initialState = new ContributionEntityState({
            entities: new Remote([], true)
        })
        const expectedState = new ContributionEntityState({
            entities: new Remote([], false, 'error')
        })
        const endState = contributionEntityReducer(
            initialState,
            new GetContributionEntitiesErrorAction('error')
        )
        expect(endState).toEqual(expectedState)
    })
})

describe('Contribution details', () => {
    test('start loading', () => {
        const initialState = new ContributionEntityState({
            contributionCandidate: new Remote(undefined)
        })
        const expectedState = new ContributionEntityState({
            contributionCandidate: new Remote(undefined, true)
        })
        const endState = contributionEntityReducer(
            initialState,
            new LoadContributionDetailsStartAction()
        )
        expect(endState).toEqual(expectedState)
    })
    test('success', () => {
        const initialState = new ContributionEntityState({
            contributionCandidate: new Remote(undefined, true)
        })
        const contributionCandidate = new Contribution({
            name: 'contributionTest',
            idPersistent: 'id-contribution-test',
            description: 'a contribution for tests',
            step: ContributionStep.ColumnsExtracted,
            anonymous: true,
            hasHeader: true
        })
        const expectedState = new ContributionEntityState({
            contributionCandidate: new Remote(contributionCandidate)
        })
        const endState = contributionEntityReducer(
            initialState,
            new LoadContributionDetailsSuccessAction(contributionCandidate)
        )
        expect(expectedState).toEqual(endState)
    })
    test('error', () => {
        const initialState = new ContributionEntityState({
            contributionCandidate: new Remote(undefined, true)
        })
        const expectedState = new ContributionEntityState({
            contributionCandidate: new Remote(undefined, false, 'error')
        })
        const endState = contributionEntityReducer(
            initialState,
            new LoadContributionDetailsErrorAction('error')
        )
        expect(endState).toEqual(expectedState)
    })
})
describe('complete entity assignment', () => {
    test('starts', () => {
        const initialState = new ContributionEntityState({
            completeEntityAssignment: new Remote(true)
        })
        const expectedState = new ContributionEntityState({
            completeEntityAssignment: new Remote(true, true)
        })
        const endState = contributionEntityReducer(
            initialState,
            new CompleteEntityAssignmentStartAction()
        )
        expect(endState).toEqual(expectedState)
    })
    test('success', () => {
        const initialState = new ContributionEntityState({
            completeEntityAssignment: new Remote(false, true)
        })
        const expectedState = new ContributionEntityState({
            completeEntityAssignment: new Remote(true, false)
        })
        const endState = contributionEntityReducer(
            initialState,
            new CompleteEntityAssignmentSuccessAction()
        )
        expect(endState).toEqual(expectedState)
    })
    test('error', () => {
        const initialState = new ContributionEntityState({
            completeEntityAssignment: new Remote(true, true)
        })
        const expectedState = new ContributionEntityState({
            completeEntityAssignment: new Remote(false, false, 'error')
        })
        const endState = contributionEntityReducer(
            initialState,
            new CompleteEntityAssignmentErrorAction('error')
        )
        expect(endState).toEqual(expectedState)
    })
    test('clear error', () => {
        const initialState = new ContributionEntityState({
            completeEntityAssignment: new Remote(false, false, 'error')
        })
        const expectedState = new ContributionEntityState({
            completeEntityAssignment: new Remote(false, false)
        })
        const endState = contributionEntityReducer(
            initialState,
            new CompleteEntityAssignmentClearErrorAction()
        )
        expect(endState).toEqual(expectedState)
    })
})
describe('put duplicate', () => {
    test('start', () => {
        const initialState = new ContributionEntityState({
            entities: new Remote(entities)
        })
        const expectedState = new ContributionEntityState({
            entities: new Remote([
                entity,
                new EntityWithDuplicates({
                    ...entity1,
                    assignedDuplicate: new Remote(undefined, true)
                }),
                entity2
            ])
        })
        const endState = contributionEntityReducer(
            initialState,
            new PutDuplicateStartAction(idPersistentTest1)
        )
        expect(endState).toEqual(expectedState)
    })
    test('success', () => {
        const initialState = new ContributionEntityState({
            entities: new Remote([
                new EntityWithDuplicates({
                    ...entity,
                    assignedDuplicate: new Remote(undefined, true)
                }),
                entity1,
                entity2
            ])
        })
        const expectedState = new ContributionEntityState({
            entities: new Remote([
                new EntityWithDuplicates({
                    ...entity,
                    assignedDuplicate: new Remote(entity, false)
                }),
                entity1,
                entity2
            ])
        })
        const endState = contributionEntityReducer(
            initialState,
            new PutDuplicateSuccessAction(idPersistentTest, entity)
        )
        expect(endState).toEqual(expectedState)
    })
    test('error', () => {
        const initialState = new ContributionEntityState({
            entities: new Remote([
                entity,
                entity1,
                new EntityWithDuplicates({
                    ...entity2,
                    assignedDuplicate: new Remote(undefined, true)
                })
            ])
        })
        const expectedState = new ContributionEntityState({
            entities: new Remote([
                entity,
                entity1,
                new EntityWithDuplicates({
                    ...entity2,
                    assignedDuplicate: new Remote(undefined, false, 'error')
                })
            ])
        })
        const endState = contributionEntityReducer(
            initialState,
            new PutDuplicateErrorAction(idPersistentTest2, 'error')
        )
        expect(endState).toEqual(expectedState)
    })
})
describe('get duplicates', () => {
    test('start', () => {
        const initialState = new ContributionEntityState({
            entities: new Remote(entities)
        })
        const expectedState = new ContributionEntityState({
            entities: new Remote([
                entity,
                new EntityWithDuplicates({
                    ...entity1,
                    similarEntities: new Remote([], true)
                }),
                entity2
            ])
        })
        const endState = contributionEntityReducer(
            initialState,
            new GetContributionEntityDuplicatesStartAction(idPersistentTest1)
        )
        expect(endState).toEqual(expectedState)
    })
    test('success', () => {
        const duplicateEntry = new ScoredEntity({
            displayTxt: 'scored entity for test',
            idPersistent: 'id-scored-entity-test',
            similarity: 0.9,
            version: 3
        })
        const initialState = new ContributionEntityState({
            entities: new Remote([
                new EntityWithDuplicates({
                    ...entity,
                    similarEntities: new Remote([], true)
                }),
                entity1,
                entity2
            ])
        })
        const expectedState = new ContributionEntityState({
            entities: new Remote([
                new EntityWithDuplicates({
                    ...entity,
                    similarEntities: new Remote([duplicateEntry], false)
                }),
                entity1,
                entity2
            ])
        })
        const endState = contributionEntityReducer(
            initialState,
            new GetContributionEntityDuplicatesSuccessAction(idPersistentTest, [
                duplicateEntry
            ])
        )
        expect(endState).toEqual(expectedState)
    })
    test('error', () => {
        const initialState = new ContributionEntityState({
            entities: new Remote([
                entity,
                entity1,
                new EntityWithDuplicates({
                    ...entity2,
                    similarEntities: new Remote([], true)
                })
            ])
        })
        const expectedState = new ContributionEntityState({
            entities: new Remote([
                entity,
                entity1,
                new EntityWithDuplicates({
                    ...entity2,
                    similarEntities: new Remote([], false, 'error')
                })
            ])
        })
        const endState = contributionEntityReducer(
            initialState,
            new GetContributionEntityDuplicatesErrorAction(idPersistentTest2, 'error')
        )
        expect(endState).toEqual(expectedState)
    })
})
describe('entities for tag', () => {
    const idTagDefTest = 'id-tag-def-test'
    const idTagDefTest1 = 'id-tag-def-test1'
    const tagDefMapTest = new Map([
        [idTagDefTest, 0],
        [idTagDefTest1, 1]
    ])
    const tagDefsTest = [
        new ColumnDefinition({
            namePath: ['tag definition test'],
            idPersistent: idTagDefTest,
            columnType: ColumnType.String,
            version: 26
        }),
        new ColumnDefinition({
            namePath: ['tag definition test1'],
            idPersistent: idTagDefTest1,
            columnType: ColumnType.String,
            version: 54
        })
    ]
    const entityWithDuplicates0 = new EntityWithDuplicates({
        idPersistent: idPersistentTest,
        displayTxt: displayTxtTest,
        version: versionTest,
        cellContents: [new Remote([])],
        similarEntities: new Remote([
            new ScoredEntity({
                idPersistent: idPersistentTest1,
                displayTxt: displayTxtTest1,
                similarity: 0.8,
                version: versionTest1,
                cellContents: [new Remote([])]
            }),
            new ScoredEntity({
                idPersistent: idPersistentTest2,
                displayTxt: displayTxtTest2,
                similarity: 0.7,
                version: versionTest2,
                cellContents: [new Remote([])]
            })
        ])
    })
    test('start', () => {
        const initialState = new ContributionEntityState({
            entities: new Remote([entityWithDuplicates0]),
            tagDefinitions: tagDefsTest.slice(0, 1),
            tagDefinitionMap: new Map([[idTagDefTest, 0]])
        })
        const expectedState = new ContributionEntityState({
            tagDefinitions: tagDefsTest,
            tagDefinitionMap: tagDefMapTest,
            entities: new Remote([
                new EntityWithDuplicates({
                    idPersistent: idPersistentTest,
                    displayTxt: displayTxtTest,
                    version: versionTest,
                    cellContents: [new Remote([]), new Remote([], true)],
                    similarEntities: new Remote([
                        new ScoredEntity({
                            idPersistent: idPersistentTest1,
                            displayTxt: displayTxtTest1,
                            version: versionTest1,
                            similarity: 0.8,
                            cellContents: [new Remote([])]
                        }),
                        new ScoredEntity({
                            idPersistent: idPersistentTest2,
                            displayTxt: displayTxtTest2,
                            version: versionTest2,
                            similarity: 0.7,
                            cellContents: [new Remote([]), new Remote([], true)]
                        })
                    ])
                })
            ])
        })
        const endState = contributionEntityReducer(
            initialState,
            new GetContributionTagInstancesStartAction(
                new Map([[idPersistentTest, [idPersistentTest, idPersistentTest2]]]),
                tagDefsTest.slice(1, 2)
            )
        )
        expect(endState).toEqual(expectedState)
    })
    test('success no values', () => {
        const initialState = new ContributionEntityState({
            tagDefinitions: tagDefsTest,
            tagDefinitionMap: tagDefMapTest,
            entities: new Remote([
                new EntityWithDuplicates({
                    idPersistent: idPersistentTest,
                    displayTxt: displayTxtTest,
                    version: versionTest,
                    cellContents: [new Remote([]), new Remote([], true)],
                    similarEntities: new Remote([
                        new ScoredEntity({
                            idPersistent: idPersistentTest1,
                            displayTxt: displayTxtTest1,
                            version: versionTest1,
                            similarity: 0.8,
                            cellContents: [new Remote([])]
                        }),
                        new ScoredEntity({
                            idPersistent: idPersistentTest2,
                            displayTxt: displayTxtTest2,
                            version: versionTest2,
                            similarity: 0.7,
                            cellContents: [new Remote([]), new Remote([], true)]
                        })
                    ])
                })
            ])
        })
        const expectedState = new ContributionEntityState({
            tagDefinitions: tagDefsTest,
            tagDefinitionMap: tagDefMapTest,
            entities: new Remote([
                new EntityWithDuplicates({
                    idPersistent: idPersistentTest,
                    displayTxt: displayTxtTest,
                    version: versionTest,
                    cellContents: [new Remote([]), new Remote([])],
                    similarEntities: new Remote([
                        new ScoredEntity({
                            idPersistent: idPersistentTest1,
                            displayTxt: displayTxtTest1,
                            version: versionTest1,
                            similarity: 0.8,
                            cellContents: [new Remote([])]
                        }),
                        new ScoredEntity({
                            idPersistent: idPersistentTest2,
                            displayTxt: displayTxtTest2,
                            version: versionTest2,
                            similarity: 0.7,
                            cellContents: [new Remote([]), new Remote([])]
                        })
                    ])
                })
            ])
        })
        const endState = contributionEntityReducer(
            initialState,
            new GetContributionTagInstancesSuccessAction(
                new Map([[idPersistentTest, [idPersistentTest, idPersistentTest2]]]),
                tagDefsTest.slice(1, 2),
                []
            )
        )
        expect(endState).toEqual(expectedState)
    })
    test('success with values', () => {
        const initialState = new ContributionEntityState({
            tagDefinitions: tagDefsTest,
            tagDefinitionMap: tagDefMapTest,
            entities: new Remote([
                new EntityWithDuplicates({
                    idPersistent: idPersistentTest,
                    displayTxt: displayTxtTest,
                    version: versionTest,
                    cellContents: [new Remote([]), new Remote([], true)],
                    similarEntities: new Remote([
                        new ScoredEntity({
                            idPersistent: idPersistentTest1,
                            displayTxt: displayTxtTest1,
                            version: versionTest1,
                            similarity: 0.8,
                            cellContents: [new Remote([])]
                        }),
                        new ScoredEntity({
                            idPersistent: idPersistentTest2,
                            displayTxt: displayTxtTest2,
                            version: versionTest2,
                            similarity: 0.7,
                            cellContents: [new Remote([]), new Remote([], true)]
                        })
                    ])
                })
            ])
        })
        const instance0 = new TagInstance(idPersistentTest2, idTagDefTest1, {
            value: 2,
            idPersistent: 'id-instance-test',
            version: 8
        })
        const instance1 = new TagInstance(idPersistentTest2, idTagDefTest1, {
            value: 4,
            idPersistent: 'id-instance-test-1',
            version: 14
        })
        const instance2 = new TagInstance(idPersistentTest, idTagDefTest1, {
            value: 9,
            idPersistent: 'id-instance-test-2',
            version: 28
        })
        const expectedState = new ContributionEntityState({
            tagDefinitions: tagDefsTest,
            tagDefinitionMap: tagDefMapTest,
            entities: new Remote([
                new EntityWithDuplicates({
                    idPersistent: idPersistentTest,
                    displayTxt: displayTxtTest,
                    version: versionTest,
                    cellContents: [new Remote([]), new Remote([instance2.cellValue])],
                    similarEntities: new Remote([
                        new ScoredEntity({
                            idPersistent: idPersistentTest1,
                            displayTxt: displayTxtTest1,
                            version: versionTest1,
                            similarity: 0.8,
                            cellContents: [new Remote([])]
                        }),
                        new ScoredEntity({
                            idPersistent: idPersistentTest2,
                            displayTxt: displayTxtTest2,
                            version: versionTest2,
                            similarity: 0.7,
                            cellContents: [
                                new Remote([]),
                                new Remote([instance0.cellValue, instance1.cellValue])
                            ]
                        })
                    ])
                })
            ])
        })
        const endState = contributionEntityReducer(
            initialState,
            new GetContributionTagInstancesSuccessAction(
                new Map([[idPersistentTest, [idPersistentTest, idPersistentTest2]]]),
                tagDefsTest.slice(1, 2),
                [instance0, instance2, instance1]
            )
        )
        expect(endState).toEqual(expectedState)
    })
    test('error', () => {
        const initialState = new ContributionEntityState({
            tagDefinitions: tagDefsTest,
            tagDefinitionMap: tagDefMapTest,
            entities: new Remote([
                new EntityWithDuplicates({
                    idPersistent: idPersistentTest,
                    displayTxt: displayTxtTest,
                    version: versionTest,
                    cellContents: [new Remote([]), new Remote([], true)],
                    similarEntities: new Remote([
                        new ScoredEntity({
                            idPersistent: idPersistentTest1,
                            displayTxt: displayTxtTest1,
                            version: versionTest1,
                            similarity: 0.8,
                            cellContents: [new Remote([])]
                        }),
                        new ScoredEntity({
                            idPersistent: idPersistentTest2,
                            displayTxt: displayTxtTest2,
                            version: versionTest2,
                            similarity: 0.7,
                            cellContents: [new Remote([]), new Remote([], true)]
                        })
                    ])
                })
            ])
        })
        const expectedState = new ContributionEntityState({
            tagDefinitions: tagDefsTest,
            tagDefinitionMap: tagDefMapTest,
            entities: new Remote([
                new EntityWithDuplicates({
                    idPersistent: idPersistentTest,
                    displayTxt: displayTxtTest,
                    version: versionTest,
                    cellContents: [new Remote([]), new Remote([], false, 'error')],
                    similarEntities: new Remote([
                        new ScoredEntity({
                            idPersistent: idPersistentTest1,
                            displayTxt: displayTxtTest1,
                            version: versionTest1,
                            similarity: 0.8,
                            cellContents: [new Remote([])]
                        }),
                        new ScoredEntity({
                            idPersistent: idPersistentTest2,
                            displayTxt: displayTxtTest2,
                            version: versionTest2,
                            similarity: 0.7,
                            cellContents: [
                                new Remote([]),
                                new Remote([], false, 'error')
                            ]
                        })
                    ])
                })
            ])
        })
        const endState = contributionEntityReducer(
            initialState,
            new GetContributionTagInstancesErrorAction(
                new Map([[idPersistentTest, [idPersistentTest, idPersistentTest2]]]),
                tagDefsTest.slice(1, 2),
                'error'
            )
        )
        expect(endState).toEqual(expectedState)
    })
})
