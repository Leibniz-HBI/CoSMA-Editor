import { Remote } from '../../util/state'
import {
    UploadContributionClearErrorAction,
    LoadContributionErrorAction,
    LoadContributionStartAction,
    LoadContributionSuccessAction,
    ToggleShowAddContributionAction,
    UploadContributionErrorAction,
    UploadContributionStartAction,
    UploadContributionSuccessAction
} from '../actions'
import { contributionReducer } from '../reducer'
import { Contribution, ContributionState, ContributionStep } from '../state'

describe('load contributions', () => {
    test('start loading', () => {
        const initialState = new ContributionState({})
        const expectedState = new ContributionState({
            contributions: new Remote([], true)
        })
        const endState = contributionReducer(
            initialState,
            new LoadContributionStartAction()
        )
        expect(endState).toEqual(expectedState)
    })
    const contributionTest = new Contribution({
        name: 'test contribution',
        idPersistent: 'id-contribution-test',
        description: 'contribution description for test',
        step: ContributionStep.Uploaded,
        anonymous: true,
        hasHeader: false
    })
    test(' loading success', () => {
        const initialState = new ContributionState({
            contributions: new Remote([], true)
        })
        const expectedState = new ContributionState({
            contributions: new Remote([contributionTest])
        })
        const endState = contributionReducer(
            initialState,
            new LoadContributionSuccessAction([contributionTest])
        )
        expect(endState).toEqual(expectedState)
    })
    test('set error', () => {
        const initialState = new ContributionState({
            contributions: new Remote([], true)
        })
        const expectedState = new ContributionState({
            contributions: new Remote([], false, 'test error')
        })
        const endState = contributionReducer(
            initialState,
            new LoadContributionErrorAction('test error')
        )
        expect(endState).toEqual(expectedState)
    })
})

describe('upload contribution', () => {
    test('start upload', () => {
        const initialState = new ContributionState({
            showAddContribution: new Remote(true)
        })
        const expectedState = new ContributionState({
            showAddContribution: new Remote(true, true)
        })
        const endState = contributionReducer(
            initialState,
            new UploadContributionStartAction()
        )
        expect(endState).toEqual(expectedState)
    })
    test('finish upload', () => {
        const initialState = new ContributionState({
            showAddContribution: new Remote(true, true)
        })
        const expectedState = new ContributionState({
            showAddContribution: new Remote(false, false)
        })
        const endState = contributionReducer(
            initialState,
            new UploadContributionSuccessAction()
        )
        expect(endState).toEqual(expectedState)
    })
    test('upload error', () => {
        const initialState = new ContributionState({
            showAddContribution: new Remote(true, true)
        })
        const expectedState = new ContributionState({
            showAddContribution: new Remote(true, false, 'test error')
        })
        const endState = contributionReducer(
            initialState,
            new UploadContributionErrorAction('test error')
        )
        expect(endState).toEqual(expectedState)
    })
    test('clear upload error', () => {
        const initialState = new ContributionState({
            showAddContribution: new Remote(true, false, 'test error')
        })

        const expectedState = new ContributionState({
            showAddContribution: new Remote(true, false)
        })
        const endState = contributionReducer(
            initialState,
            new UploadContributionClearErrorAction()
        )
        expect(endState).toEqual(expectedState)
    })
})
describe('toggle show contribution', () => {
    test('show', () => {
        const initialState = new ContributionState({})
        const expectedState = new ContributionState({
            showAddContribution: new Remote(true)
        })
        const endState = contributionReducer(
            initialState,
            new ToggleShowAddContributionAction()
        )
        expect(endState).toEqual(expectedState)
    })
    test('hide', () => {
        const initialState = new ContributionState({
            showAddContribution: new Remote(true)
        })
        const expectedState = new ContributionState({})
        const endState = contributionReducer(
            initialState,
            new ToggleShowAddContributionAction()
        )
        expect(endState).toEqual(expectedState)
    })
})
