/**
 * @jest-environment jsdom
 */
import { Remote, useThunkReducer } from '../../util/state'
import {
    UploadContributionClearErrorAction,
    ToggleShowAddContributionAction
} from '../actions'
import { LoadContributionsAction, UploadContributionAction } from '../async_actions'
import { useContribution } from '../hooks'
import { ContributionState } from '../state'

jest.mock('../../util/state', () => {
    const original = jest.requireActual('../../util/state')
    return {
        ...original,
        useThunkReducer: jest.fn()
    }
})
describe('loading callback', () => {
    test('starts', () => {
        const dispatch = jest.fn()
        ;(useThunkReducer as jest.Mock).mockReturnValue([
            new ContributionState({}),
            dispatch
        ])
        const { loadContributionsCallback: loadControbutionsCallback } =
            useContribution()
        loadControbutionsCallback()
        expect(dispatch.mock.calls).toEqual([[new LoadContributionsAction()]])
    })
    test('exits early', () => {
        const dispatch = jest.fn()
        ;(useThunkReducer as jest.Mock).mockReturnValue([
            new ContributionState({ contributions: new Remote([], true) }),
            dispatch
        ])
        const { loadContributionsCallback: loadControbutionsCallback } =
            useContribution()
        loadControbutionsCallback()
        expect(dispatch.mock.calls).toEqual([])
    })
})
describe('toggle Upload visibility', () => {
    test('submits action', () => {
        const dispatch = jest.fn()
        ;(useThunkReducer as jest.Mock).mockReturnValue([
            new ContributionState({}),
            dispatch
        ])
        const { toggleShowAddContributionCallback } = useContribution()
        toggleShowAddContributionCallback()
        expect(dispatch.mock.calls).toEqual([[new ToggleShowAddContributionAction()]])
    })
})
describe('upload contribution', () => {
    const uploadPropsTest = {
        name: 'name test',
        description: 'description for test contribution',
        anonymous: true,
        hasHeader: false,
        file: new File([''], 'filename', { type: 'text/csv' })
    }
    test('upload contribution', () => {
        const dispatch = jest.fn()
        ;(useThunkReducer as jest.Mock).mockReturnValue([
            new ContributionState({}),
            dispatch
        ])
        const { submitUploadCallback } = useContribution()
        submitUploadCallback(uploadPropsTest)
        expect(dispatch.mock.calls).toEqual([
            [new UploadContributionAction({ ...uploadPropsTest, isAnonymous: true })]
        ])
    })
    test('clear error callback', () => {
        const dispatch = jest.fn()
        ;(useThunkReducer as jest.Mock).mockReturnValue([
            new ContributionState({}),
            dispatch
        ])
        const { clearUploadErrorCallback } = useContribution()
        clearUploadErrorCallback()
        expect(dispatch.mock.calls).toEqual([
            [new UploadContributionClearErrorAction()]
        ])
    })
})
