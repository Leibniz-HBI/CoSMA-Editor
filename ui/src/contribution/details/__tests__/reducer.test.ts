import { Remote } from '../../../util/state'
import { ContributionStep, newContribution } from '../../state'
import {
    LoadContributionDetailsErrorAction,
    LoadContributionDetailsStartAction,
    LoadContributionDetailsSuccessAction,
    PatchContributionDetailsClearErrorAction,
    PatchContributionDetailsErrorAction,
    PatchContributionDetailsStartAction,
    PatchContributionDetailsSuccessAction
} from '../action'
import { contributionDetailsReducer } from '../reducer'
import { ContributionDetailState } from '../state'

const authorTest = 'author test'
const contributionTest = newContribution({
    name: 'test contribution',
    idPersistent: 'id-contribution-test',
    description: 'contribution description for test',
    step: ContributionStep.Uploaded,
    author: authorTest,
    hasHeader: false
})

describe('get contribution details', () => {
    test('start getting contributions', () => {
        const initialState = new ContributionDetailState({})
        const expectedState = new ContributionDetailState({
            contribution: new Remote(undefined, true)
        })
        const endState = contributionDetailsReducer(
            initialState,
            new LoadContributionDetailsStartAction()
        )
        expect(endState).toEqual(expectedState)
    })
    test('successful load', () => {
        const initialState = new ContributionDetailState({
            contribution: new Remote(undefined, true)
        })
        const expectedState = new ContributionDetailState({
            contribution: new Remote(contributionTest, false)
        })
        const endState = contributionDetailsReducer(
            initialState,
            new LoadContributionDetailsSuccessAction(contributionTest)
        )
        expect(endState).toEqual(expectedState)
    })
    test('error', () => {
        const initialState = new ContributionDetailState({
            contribution: new Remote(undefined, true)
        })
        const expectedState = new ContributionDetailState({
            contribution: new Remote(undefined, false, 'test error')
        })
        const endState = contributionDetailsReducer(
            initialState,
            new LoadContributionDetailsErrorAction('test error')
        )
        expect(endState).toEqual(expectedState)
    })
})
describe('patch contribution', () => {
    test('start', () => {
        const initialState = new ContributionDetailState({})
        const expectedState = new ContributionDetailState({
            contributionPatch: new Remote(undefined, true)
        })
        const endState = contributionDetailsReducer(
            initialState,
            new PatchContributionDetailsStartAction()
        )
        expect(endState).toEqual(expectedState)
    })
    test('success', () => {
        const initialState = new ContributionDetailState({
            contributionPatch: new Remote(undefined, true)
        })
        const expectedState = new ContributionDetailState({
            contribution: new Remote(contributionTest),
            contributionPatch: new Remote(undefined)
        })
        const endState = contributionDetailsReducer(
            initialState,
            new PatchContributionDetailsSuccessAction(contributionTest)
        )
        expect(endState).toEqual(expectedState)
    })
    test('error', () => {
        const initialState = new ContributionDetailState({
            contributionPatch: new Remote(undefined, true)
        })
        const expectedState = new ContributionDetailState({
            contributionPatch: new Remote(undefined, false, 'test error')
        })
        const endState = contributionDetailsReducer(
            initialState,
            new PatchContributionDetailsErrorAction('test error')
        )
        expect(endState).toEqual(expectedState)
    })
    test('clear error', () => {
        const initialState = new ContributionDetailState({
            contributionPatch: new Remote(undefined, false, 'test error')
        })
        const expectedState = new ContributionDetailState({
            contributionPatch: new Remote(undefined)
        })
        const endState = contributionDetailsReducer(
            initialState,
            new PatchContributionDetailsClearErrorAction()
        )
        expect(endState).toEqual(expectedState)
    })
})
