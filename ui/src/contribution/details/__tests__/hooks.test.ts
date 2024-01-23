import { Remote, useThunkReducer } from '../../../util/state'
import { PatchContributionDetailsClearErrorAction } from '../action'
import {
    LoadContributionDetailsAsyncAction,
    PatchContributionAction
} from '../async_action'
import { useContributionDetails } from '../hooks'
import { ContributionDetailState } from '../state'

jest.mock('../../../util/state', () => {
    const original = jest.requireActual('../../../util/state')
    return {
        ...original,
        useThunkReducer: jest.fn()
    }
})
const idPersistentTest = 'id-test'
describe('contribution details callback', () => {
    test('load callback', () => {
        const dispatch = jest.fn()
        ;(useThunkReducer as jest.Mock).mockReturnValue([
            new ContributionDetailState({}),
            dispatch
        ])
        const { loadContributionDetailsCallback } =
            useContributionDetails(idPersistentTest)
        loadContributionDetailsCallback()
        expect(dispatch.mock.calls).toEqual([
            [new LoadContributionDetailsAsyncAction(idPersistentTest)]
        ])
    })
    test('exits early', () => {
        const dispatch = jest.fn()
        ;(useThunkReducer as jest.Mock).mockReturnValue([
            new ContributionDetailState({ contribution: new Remote(undefined, true) }),
            dispatch
        ])
        const { loadContributionDetailsCallback } =
            useContributionDetails(idPersistentTest)
        loadContributionDetailsCallback()
        expect(dispatch.mock.calls).toEqual([])
    })
    test('patches contribution', () => {
        const patchPropsTest = {
            idPersistent: idPersistentTest,
            name: 'name test',
            description: 'updated description for contribution patch test',
            hasHeader: true
        }
        const dispatch = jest.fn()
        ;(useThunkReducer as jest.Mock).mockReturnValue([
            new ContributionDetailState({}),
            dispatch
        ])
        const { patchContributionDetailsCallback } =
            useContributionDetails(idPersistentTest)
        patchContributionDetailsCallback(patchPropsTest)
        expect(dispatch.mock.calls).toEqual([
            [new PatchContributionAction({ ...patchPropsTest })]
        ])
    })
    test('clear patch error', () => {
        const dispatch = jest.fn()
        ;(useThunkReducer as jest.Mock).mockReturnValue([
            new ContributionDetailState({}),
            dispatch
        ])
        const { clearPatchContributionErrorCallback } =
            useContributionDetails(idPersistentTest)
        clearPatchContributionErrorCallback()
        expect(dispatch.mock.calls).toEqual([
            [new PatchContributionDetailsClearErrorAction()]
        ])
    })
})
