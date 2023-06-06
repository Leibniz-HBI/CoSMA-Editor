import { Remote, useThunkReducer } from '../../../util/state'
import { Contribution, ContributionStep } from '../../state'
import {
    ColumnDefinitionContributionSelectAction,
    SetColumnDefinitionFormTabAction
} from '../actions'
import {
    LoadColumnDefinitionsContributionAction,
    PatchColumnDefinitionContributionAction
} from '../async_actions'
import { useColumnDefinitionsContribution } from '../hooks'
import {
    ColumnDefinitionContribution,
    ColumnDefinitionsContributionState
} from '../state'

jest.mock('../../../util/state', () => {
    return { ...jest.requireActual('../../../util/state'), useThunkReducer: jest.fn() }
})
const columnDefinitionTest = new ColumnDefinitionContribution({
    name: 'column definition contribution test',
    idPersistent: 'id-column-def-contribution-test',
    indexInFile: 3,
    discard: false
})
const contributionTest = new Contribution({
    name: 'contribution test',
    idPersistent: 'id-contribution-test',
    description: 'a contribution candidate for tests.',
    step: ContributionStep.Merged,
    anonymous: true,
    hasHeader: true
})
describe('contribution column hook', () => {
    test('load column contributions', () => {
        const dispatch = jest.fn()
        ;(useThunkReducer as jest.Mock).mockReturnValueOnce([
            new ColumnDefinitionsContributionState({}),
            dispatch
        ])
        const { loadColumnDefinitionsContributionCallback } =
            useColumnDefinitionsContribution('id-persistent-test')
        loadColumnDefinitionsContributionCallback()
        expect(dispatch.mock.calls).toEqual([
            [new LoadColumnDefinitionsContributionAction('id-persistent-test')]
        ])
    })
    test('early exit when loading column contributions', () => {
        const dispatch = jest.fn()
        ;(useThunkReducer as jest.Mock).mockReturnValueOnce([
            new ColumnDefinitionsContributionState({
                columns: new Remote(
                    {
                        activeDefinitionsList: [],
                        discardedDefinitionList: [],
                        contributionCandidate: contributionTest
                    },
                    true
                )
            }),
            dispatch
        ])
        const { loadColumnDefinitionsContributionCallback } =
            useColumnDefinitionsContribution('id-persistent-test')
        loadColumnDefinitionsContributionCallback()
        expect(dispatch.mock.calls).toEqual([])
    })
    test('select column', () => {
        const dispatch = jest.fn()
        ;(useThunkReducer as jest.Mock).mockReturnValueOnce([
            new ColumnDefinitionsContributionState({}),
            dispatch
        ])
        const { selectColumnDefinitionContributionCallback } =
            useColumnDefinitionsContribution('id-persistent-test')
        selectColumnDefinitionContributionCallback(columnDefinitionTest)
        expect(dispatch.mock.calls).toEqual([
            [new ColumnDefinitionContributionSelectAction(columnDefinitionTest)]
        ])
    })
    test('open column creation menu', () => {
        const dispatch = jest.fn()
        ;(useThunkReducer as jest.Mock).mockReturnValueOnce([
            new ColumnDefinitionsContributionState({}),
            dispatch
        ])
        const { selectColumnCreationTabCallback } =
            useColumnDefinitionsContribution('id-persistent-test')
        selectColumnCreationTabCallback(true)
        expect(dispatch.mock.calls).toEqual([
            [new SetColumnDefinitionFormTabAction(true)]
        ])
    })
    test('set existing callback with no definition selected', () => {
        const dispatch = jest.fn()
        ;(useThunkReducer as jest.Mock).mockReturnValueOnce([
            new ColumnDefinitionsContributionState({}),
            dispatch
        ])
        const { setExistingCallback } =
            useColumnDefinitionsContribution('id-persistent-test')
        setExistingCallback('id-test')
        expect(dispatch.mock.calls).toEqual([])
    })
    test('set existing callback', () => {
        const dispatch = jest.fn()
        ;(useThunkReducer as jest.Mock).mockReturnValueOnce([
            new ColumnDefinitionsContributionState({
                columns: new Remote({
                    activeDefinitionsList: [],
                    discardedDefinitionList: [],
                    contributionCandidate: contributionTest
                }),
                selectedColumnDefinition: new Remote(columnDefinitionTest)
            }),
            dispatch
        ])
        const { setExistingCallback } =
            useColumnDefinitionsContribution('id-contribution-test')
        setExistingCallback('id-existing-test')
        expect(dispatch.mock.calls).toEqual([
            [
                new PatchColumnDefinitionContributionAction({
                    idPersistent: columnDefinitionTest.idPersistent,
                    idExistingPersistent: 'id-existing-test',
                    idContributionPersistent: 'id-contribution-test'
                })
            ]
        ])
    })
    test('discard', () => {
        const dispatch = jest.fn()
        ;(useThunkReducer as jest.Mock).mockReturnValueOnce([
            new ColumnDefinitionsContributionState({
                columns: new Remote({
                    activeDefinitionsList: [],
                    discardedDefinitionList: [],
                    contributionCandidate: contributionTest
                }),
                selectedColumnDefinition: new Remote(columnDefinitionTest)
            }),
            dispatch
        ])
        const { discardCallback } =
            useColumnDefinitionsContribution('id-contribution-test')
        discardCallback('id-for-discard-test', true)
        expect(dispatch.mock.calls).toEqual([
            [
                new PatchColumnDefinitionContributionAction({
                    idPersistent: 'id-for-discard-test',
                    idContributionPersistent: 'id-contribution-test',
                    discard: true
                })
            ]
        ])
    })
})
