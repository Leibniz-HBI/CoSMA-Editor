import { newRemote } from '../../util/state'
import { emptyState } from '../../util/tests/provider'
import { newContributionState } from '../slice'
import { ContributionStep, newContribution } from '../state'

export const nameTest0 = 'contribution test 0'
export const descriptionTest0 = 'a contribution for tests'
export const idTest0 = 'id-test-0'
export const authorTest = 'author test'
export const idSessionTest0 = 'id-session-test-0'
export const emptyValuesTest = 'empty,absent'
export const nameTest1 = 'contribution test 1'
export const descriptionTest1 = 'another contribution for tests'
export const idTest1 = 'id-test-1'

export const contribution0 = newContribution({
    name: nameTest0,
    description: descriptionTest0,
    idPersistent: idTest0,
    author: authorTest,
    hasHeader: false,
    step: ContributionStep.ColumnsExtracted,
    emptyValues: emptyValuesTest
})
export const contribution1 = newContribution({
    name: nameTest1,
    description: descriptionTest1,
    idPersistent: idTest1,
    author: authorTest,
    hasHeader: false,
    step: ContributionStep.ColumnsExtracted,
    emptyValues: emptyValuesTest
})
export const preloadedState = {
    ...emptyState,
    contribution: newContributionState({
        selectedContribution: newRemote(contribution0),
        contributions: newRemote([contribution0, contribution1])
    }),
    notification: { notificationList: [], notificationMap: {} }
}
