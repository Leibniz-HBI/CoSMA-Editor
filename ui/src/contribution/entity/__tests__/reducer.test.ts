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
    PutDuplicateErrorAction,
    PutDuplicateStartAction,
    PutDuplicateSuccessAction
} from '../action'
import { contributionEntityReducer } from '../reducer'
import { ContributionEntityState, EntityWithDuplicates, ScoredEntity } from '../state'

const idPersistentTest = 'test-id'
const idPersistentTest1 = 'test-id-1'
const idPersistentTest2 = 'test-id2'
const displayTxtTest = 'entity for test'
const versionTest = 12

const entity = new EntityWithDuplicates({
    idPersistent: idPersistentTest,
    displayTxt: displayTxtTest,
    version: versionTest,
    similarEntities: new Remote([])
})

const entity1 = new EntityWithDuplicates({
    idPersistent: idPersistentTest1,
    displayTxt: 'entity for test 1',
    version: 2,
    similarEntities: new Remote([])
})

const entity2 = new EntityWithDuplicates({
    idPersistent: idPersistentTest2,
    displayTxt: 'entity for test 2',
    version: 18,
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
