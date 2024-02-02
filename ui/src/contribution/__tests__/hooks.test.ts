/**
 * @jest-environment jsdom
 */
import { Remote, useThunkReducer } from '../../util/state'
import { ToggleShowAddContributionAction } from '../actions'
import { LoadContributionsAction } from '../async_actions'
import { useContribution } from '../hooks'
import { newContributionState } from '../state'

jest.mock('../../util/state', () => {
    const original = jest.requireActual('../../util/state')
    return {
        ...original,
        useThunkReducer: jest.fn()
    }
})
jest.mock('react-redux', () => {
    const mockDispatch = jest.fn()
    return {
        ...jest.requireActual('react-redux'),
        useDispatch: jest.fn().mockReturnValue(mockDispatch)
    }
})

describe('loading callback', () => {
    test('starts', () => {
        const dispatch = jest.fn()
        ;(useThunkReducer as jest.Mock).mockReturnValue([
            newContributionState({}),
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
            newContributionState({ contributions: new Remote([], true) }),
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
            newContributionState({}),
            dispatch
        ])
        const { toggleShowAddContributionCallback } = useContribution()
        toggleShowAddContributionCallback()
        expect(dispatch.mock.calls).toEqual([[new ToggleShowAddContributionAction()]])
    })
})
