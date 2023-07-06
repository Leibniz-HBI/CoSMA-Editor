import { Remote, useThunkReducer } from '../../../util/state'
import { LoadContributionDetailsAsyncAction } from '../../details/async_action'
import {
    CompleteEntityAssignmentAction,
    GetContributionEntitiesAction,
    GetContributionEntityDuplicateCandidatesAction
} from '../async_actions'
import { useContributionEntities } from '../hooks'
import { ContributionEntityState, EntityWithDuplicates } from '../state'

jest.mock('../../../util/state', () => {
    return { ...jest.requireActual('../../../util/state'), useThunkReducer: jest.fn() }
})
const idContributionTest = 'id-contribution-test'
const entityTest = new EntityWithDuplicates({
    idPersistent: 'test-id-0',
    displayTxt: 'test display txt 0',
    version: 0,
    similarEntities: new Remote([])
})
describe('contribution entity hooks', () => {
    test('loads entities', async () => {
        const dispatch = jest.fn()
        dispatch.mockReturnValueOnce(Promise.resolve(null))
        dispatch.mockReturnValueOnce(Promise.resolve([entityTest]))
        ;(useThunkReducer as jest.Mock).mockReturnValueOnce([
            new ContributionEntityState({}),
            dispatch
        ])
        const { getEntityDuplicatesCallback } =
            useContributionEntities(idContributionTest)
        getEntityDuplicatesCallback()
        await new Promise((f) => setTimeout(f, 100))
        expect(dispatch.mock.calls).toEqual([
            [new LoadContributionDetailsAsyncAction(idContributionTest)],
            [new GetContributionEntitiesAction(idContributionTest)],
            [
                new GetContributionEntityDuplicateCandidatesAction({
                    idContributionPersistent: idContributionTest,
                    entityIdPersistentList: ['test-id-0']
                })
            ]
        ])
    })
    test('does not load entities when already loading', async () => {
        const dispatch = jest.fn()
        dispatch.mockReturnValueOnce(Promise.resolve(null))
        dispatch.mockReturnValueOnce(Promise.resolve([entityTest]))
        ;(useThunkReducer as jest.Mock).mockReturnValueOnce([
            new ContributionEntityState({ entities: new Remote([], true) }),
            dispatch
        ])
        const { getEntityDuplicatesCallback } =
            useContributionEntities(idContributionTest)
        getEntityDuplicatesCallback()
        await new Promise((f) => setTimeout(f, 100))
        expect(dispatch.mock.calls).toEqual([])
    })
    test('completes assignment', () => {
        const dispatch = jest.fn()
        ;(useThunkReducer as jest.Mock).mockReturnValueOnce([
            new ContributionEntityState({}),
            dispatch
        ])
        const { completeEntityAssignmentCallback } =
            useContributionEntities(idContributionTest)
        completeEntityAssignmentCallback()
        expect(dispatch.mock.calls).toEqual([
            [new CompleteEntityAssignmentAction(idContributionTest)]
        ])
    })
    test('does not redundantly complete assignment', () => {
        const dispatch = jest.fn()
        ;(useThunkReducer as jest.Mock).mockReturnValueOnce([
            new ContributionEntityState({
                completeEntityAssignment: new Remote(false, true)
            }),
            dispatch
        ])
        const { completeEntityAssignmentCallback } =
            useContributionEntities(idContributionTest)
        completeEntityAssignmentCallback()
        expect(dispatch.mock.calls).toEqual([])
    })
})
