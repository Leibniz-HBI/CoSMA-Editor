import { Remote } from '../../../util/state'
import { Contribution, ContributionStep } from '../../state'
import {
    ColumnDefinitionContributionSelectAction,
    FinalizeColumnAssignmentClearErrorAction,
    FinalizeColumnAssignmentErrorAction,
    FinalizeColumnAssignmentStartAction,
    FinalizeColumnAssignmentSuccessAction,
    LoadColumnDefinitionsContributionErrorAction,
    LoadColumnDefinitionsContributionStartAction,
    LoadColumnDefinitionsContributionSuccessAction,
    PatchColumnDefinitionContributionErrorAction,
    PatchColumnDefinitionContributionStartAction,
    PatchColumnDefinitionContributionSuccessAction,
    SetColumnDefinitionFormTabAction
} from '../actions'
import { columnDefinitionContributionReducer } from '../reducer'
import {
    ColumnDefinitionContribution,
    ColumnDefinitionsContributionState
} from '../state'

const contributionCandidateTest = new Contribution({
    name: 'test contribution',
    idPersistent: 'id-contribution-test',
    description: 'description of test contribution',
    anonymous: true,
    hasHeader: true,
    author: undefined,
    step: ContributionStep.Uploaded
})
const columnDefinitionContributionListTest = [0, 1, 2, 3].map(
    (idx) =>
        new ColumnDefinitionContribution({
            name: `test column definition contribution ${idx}`,
            idPersistent: `test-column-contribution-id-${idx}`,
            indexInFile: idx,
            idExistingPersistent: `test-column-definition-existing-id-${idx}`,
            discard: idx % 2 == 1
        })
)
describe('patch', () => {
    test('error', () => {
        const initialState = new ColumnDefinitionsContributionState({
            selectedColumnDefinition: new Remote(undefined, true)
        })
        const expectedState = new ColumnDefinitionsContributionState({
            selectedColumnDefinition: new Remote(undefined, false, 'error')
        })
        const endState = columnDefinitionContributionReducer(
            initialState,
            new PatchColumnDefinitionContributionErrorAction('error')
        )
        expect(endState).toEqual(expectedState)
    })
    test('start loading', () => {
        const initialState = new ColumnDefinitionsContributionState({
            selectedColumnDefinition: new Remote(undefined, false)
        })
        const expectedState = new ColumnDefinitionsContributionState({
            selectedColumnDefinition: new Remote(undefined, true)
        })
        const endState = columnDefinitionContributionReducer(
            initialState,
            new PatchColumnDefinitionContributionStartAction()
        )
        expect(endState).toEqual(expectedState)
    })
    test('unknown update', () => {
        const initialState = new ColumnDefinitionsContributionState({
            columns: new Remote({
                activeDefinitionsList: [
                    columnDefinitionContributionListTest[0],
                    columnDefinitionContributionListTest[2]
                ],
                discardedDefinitionsList: [columnDefinitionContributionListTest[1]],
                contributionCandidate: contributionCandidateTest
            }),
            selectedColumnDefinition: new Remote(
                columnDefinitionContributionListTest[1]
            )
        })
        const endState = columnDefinitionContributionReducer(
            initialState,
            new PatchColumnDefinitionContributionSuccessAction(
                columnDefinitionContributionListTest[3]
            )
        )
        expect(endState).toEqual(initialState)
    })
    test('update in active and selected', () => {
        const initialState = new ColumnDefinitionsContributionState({
            columns: new Remote({
                activeDefinitionsList: [
                    columnDefinitionContributionListTest[0],
                    columnDefinitionContributionListTest[2]
                ],
                discardedDefinitionsList: [
                    columnDefinitionContributionListTest[1],
                    columnDefinitionContributionListTest[3]
                ],

                contributionCandidate: contributionCandidateTest
            }),
            selectedColumnDefinition: new Remote(
                columnDefinitionContributionListTest[0]
            )
        })
        const updatedColumnDefinition = new ColumnDefinitionContribution({
            ...columnDefinitionContributionListTest[0],
            name: 'updated'
        })
        const expectedState = new ColumnDefinitionsContributionState({
            columns: new Remote({
                activeDefinitionsList: [
                    updatedColumnDefinition,
                    columnDefinitionContributionListTest[2]
                ],
                discardedDefinitionsList: [
                    columnDefinitionContributionListTest[1],
                    columnDefinitionContributionListTest[3]
                ],
                contributionCandidate: contributionCandidateTest
            }),
            selectedColumnDefinition: new Remote(updatedColumnDefinition)
        })
        const endState = columnDefinitionContributionReducer(
            initialState,
            new PatchColumnDefinitionContributionSuccessAction(updatedColumnDefinition)
        )
        expect(endState).toEqual(expectedState)
    })
    test('update in discarded and selected', () => {
        const initialState = new ColumnDefinitionsContributionState({
            columns: new Remote({
                activeDefinitionsList: [
                    columnDefinitionContributionListTest[0],
                    columnDefinitionContributionListTest[2]
                ],
                discardedDefinitionsList: [
                    columnDefinitionContributionListTest[1],
                    columnDefinitionContributionListTest[3]
                ],

                contributionCandidate: contributionCandidateTest
            }),
            selectedColumnDefinition: new Remote(
                columnDefinitionContributionListTest[3]
            )
        })
        const updatedColumnDefinition = new ColumnDefinitionContribution({
            ...columnDefinitionContributionListTest[3],
            name: 'updated'
        })
        const expectedState = new ColumnDefinitionsContributionState({
            columns: new Remote({
                activeDefinitionsList: [
                    columnDefinitionContributionListTest[0],
                    columnDefinitionContributionListTest[2]
                ],
                discardedDefinitionsList: [
                    columnDefinitionContributionListTest[1],
                    updatedColumnDefinition
                ],
                contributionCandidate: contributionCandidateTest
            }),
            selectedColumnDefinition: new Remote(updatedColumnDefinition)
        })
        const endState = columnDefinitionContributionReducer(
            initialState,
            new PatchColumnDefinitionContributionSuccessAction(updatedColumnDefinition)
        )
        expect(endState).toEqual(expectedState)
    })
    test('active to discarded beginning', () => {
        const initialState = new ColumnDefinitionsContributionState({
            columns: new Remote({
                activeDefinitionsList: [
                    columnDefinitionContributionListTest[0],
                    columnDefinitionContributionListTest[2]
                ],

                discardedDefinitionsList: [
                    columnDefinitionContributionListTest[1],
                    columnDefinitionContributionListTest[3]
                ],

                contributionCandidate: contributionCandidateTest
            }),
            selectedColumnDefinition: new Remote(
                columnDefinitionContributionListTest[3]
            )
        })
        const updatedColumnDefinition = new ColumnDefinitionContribution({
            ...columnDefinitionContributionListTest[0],
            discard: true
        })
        const expectedState = new ColumnDefinitionsContributionState({
            columns: new Remote({
                activeDefinitionsList: [columnDefinitionContributionListTest[2]],
                discardedDefinitionsList: [
                    updatedColumnDefinition,
                    columnDefinitionContributionListTest[1],
                    columnDefinitionContributionListTest[3]
                ],
                contributionCandidate: contributionCandidateTest
            }),
            selectedColumnDefinition: new Remote(updatedColumnDefinition)
        })
        const endState = columnDefinitionContributionReducer(
            initialState,
            new PatchColumnDefinitionContributionSuccessAction(updatedColumnDefinition)
        )
        expect(endState).toEqual(expectedState)
    })
    test('active to discarded end', () => {
        const initialState = new ColumnDefinitionsContributionState({
            columns: new Remote({
                activeDefinitionsList: [
                    columnDefinitionContributionListTest[0],
                    columnDefinitionContributionListTest[2]
                ],

                discardedDefinitionsList: [columnDefinitionContributionListTest[1]],

                contributionCandidate: contributionCandidateTest
            }),
            selectedColumnDefinition: new Remote(
                columnDefinitionContributionListTest[1]
            )
        })
        const updatedColumnDefinition = new ColumnDefinitionContribution({
            ...columnDefinitionContributionListTest[2],
            discard: true
        })
        const expectedState = new ColumnDefinitionsContributionState({
            columns: new Remote({
                activeDefinitionsList: [columnDefinitionContributionListTest[0]],
                discardedDefinitionsList: [
                    columnDefinitionContributionListTest[1],
                    updatedColumnDefinition
                ],
                contributionCandidate: contributionCandidateTest
            }),
            selectedColumnDefinition: new Remote(updatedColumnDefinition)
        })
        const endState = columnDefinitionContributionReducer(
            initialState,
            new PatchColumnDefinitionContributionSuccessAction(updatedColumnDefinition)
        )
        expect(endState).toEqual(expectedState)
    })
    test('discarded to active beginning', () => {
        const initialState = new ColumnDefinitionsContributionState({
            columns: new Remote({
                activeDefinitionsList: [columnDefinitionContributionListTest[2]],
                discardedDefinitionsList: [
                    columnDefinitionContributionListTest[1],
                    columnDefinitionContributionListTest[3]
                ],

                contributionCandidate: contributionCandidateTest
            }),
            selectedColumnDefinition: new Remote(
                columnDefinitionContributionListTest[3]
            )
        })
        const updatedColumnDefinition = new ColumnDefinitionContribution({
            ...columnDefinitionContributionListTest[1],
            discard: false
        })
        const expectedState = new ColumnDefinitionsContributionState({
            columns: new Remote({
                activeDefinitionsList: [
                    updatedColumnDefinition,
                    columnDefinitionContributionListTest[2]
                ],
                discardedDefinitionsList: [columnDefinitionContributionListTest[3]],
                contributionCandidate: contributionCandidateTest
            }),
            selectedColumnDefinition: new Remote(updatedColumnDefinition)
        })
        const endState = columnDefinitionContributionReducer(
            initialState,
            new PatchColumnDefinitionContributionSuccessAction(updatedColumnDefinition)
        )
        expect(endState).toEqual(expectedState)
    })
    test('discarded to active end', () => {
        const initialState = new ColumnDefinitionsContributionState({
            columns: new Remote({
                activeDefinitionsList: [
                    columnDefinitionContributionListTest[0],
                    columnDefinitionContributionListTest[2]
                ],
                discardedDefinitionsList: [
                    columnDefinitionContributionListTest[1],
                    columnDefinitionContributionListTest[3]
                ],

                contributionCandidate: contributionCandidateTest
            }),
            selectedColumnDefinition: new Remote(
                columnDefinitionContributionListTest[0]
            )
        })
        const updatedColumnDefinition = new ColumnDefinitionContribution({
            ...columnDefinitionContributionListTest[3],
            discard: false
        })
        const expectedState = new ColumnDefinitionsContributionState({
            columns: new Remote({
                activeDefinitionsList: [
                    columnDefinitionContributionListTest[0],
                    columnDefinitionContributionListTest[2],
                    updatedColumnDefinition
                ],
                discardedDefinitionsList: [columnDefinitionContributionListTest[1]],
                contributionCandidate: contributionCandidateTest
            }),
            selectedColumnDefinition: new Remote(updatedColumnDefinition)
        })
        const endState = columnDefinitionContributionReducer(
            initialState,
            new PatchColumnDefinitionContributionSuccessAction(updatedColumnDefinition)
        )
        expect(endState).toEqual(expectedState)
    })
})

describe('load contribution column definitions', () => {
    test('start', () => {
        const initialState = new ColumnDefinitionsContributionState({
            columns: new Remote({
                activeDefinitionsList: [],
                discardedDefinitionsList: [],
                contributionCandidate: contributionCandidateTest
            })
        })
        const expectedState = new ColumnDefinitionsContributionState({
            columns: new Remote(
                {
                    activeDefinitionsList: [],
                    discardedDefinitionsList: [],
                    contributionCandidate: contributionCandidateTest
                },
                true
            )
        })
        const endState = columnDefinitionContributionReducer(
            initialState,
            new LoadColumnDefinitionsContributionStartAction()
        )
        expect(endState).toEqual(expectedState)
    })
    test('error', () => {
        const initialState = new ColumnDefinitionsContributionState({
            columns: new Remote(
                {
                    activeDefinitionsList: [],
                    discardedDefinitionsList: [],
                    contributionCandidate: contributionCandidateTest
                },
                true
            )
        })
        const expectedState = new ColumnDefinitionsContributionState({
            columns: new Remote(
                {
                    activeDefinitionsList: [],
                    discardedDefinitionsList: [],
                    contributionCandidate: contributionCandidateTest
                },
                false,
                'test error'
            )
        })
        const endState = columnDefinitionContributionReducer(
            initialState,
            new LoadColumnDefinitionsContributionErrorAction('test error')
        )
        expect(endState).toEqual(expectedState)
    })
    test('success', () => {
        const contributionCandidateTest1 = new Contribution({
            name: 'test contribution 1',
            idPersistent: 'id-contribution-test-1',
            description: 'description of test contribution with number 1',
            step: ContributionStep.EntitiesAssigned,
            anonymous: true,
            hasHeader: false
        })
        const activeColumns = [
            columnDefinitionContributionListTest[0],
            columnDefinitionContributionListTest[2]
        ]
        const discardedColumns = [
            columnDefinitionContributionListTest[1],
            columnDefinitionContributionListTest[3]
        ]
        const initialState = new ColumnDefinitionsContributionState({
            columns: new Remote(
                {
                    activeDefinitionsList: [],
                    discardedDefinitionsList: [],
                    contributionCandidate: contributionCandidateTest
                },
                true
            ),
            createTabSelected: true
        })
        const expectedState = new ColumnDefinitionsContributionState({
            columns: new Remote({
                activeDefinitionsList: activeColumns,
                discardedDefinitionsList: discardedColumns,
                contributionCandidate: contributionCandidateTest1
            }),
            createTabSelected: false,
            selectedColumnDefinition: new Remote(activeColumns[0])
        })
        const endState = columnDefinitionContributionReducer(
            initialState,
            new LoadColumnDefinitionsContributionSuccessAction(
                activeColumns,
                discardedColumns,
                contributionCandidateTest1
            )
        )
        expect(endState).toEqual(expectedState)
    })
})
describe('finalize column assignment', () => {
    test('start', () => {
        const initialState = new ColumnDefinitionsContributionState({
            finalizeColumnAssignment: new Remote(true)
        })
        const expectedState = new ColumnDefinitionsContributionState({
            finalizeColumnAssignment: new Remote(false, true)
        })
        const endState = columnDefinitionContributionReducer(
            initialState,
            new FinalizeColumnAssignmentStartAction()
        )
        expect(endState).toEqual(expectedState)
    })
    test('success', () => {
        const initialState = new ColumnDefinitionsContributionState({
            finalizeColumnAssignment: new Remote(false, true)
        })
        const expectedState = new ColumnDefinitionsContributionState({
            finalizeColumnAssignment: new Remote(true)
        })
        const endState = columnDefinitionContributionReducer(
            initialState,
            new FinalizeColumnAssignmentSuccessAction()
        )
        expect(endState).toEqual(expectedState)
    })
    test('error', () => {
        const initialState = new ColumnDefinitionsContributionState({
            finalizeColumnAssignment: new Remote(false, true)
        })
        const expectedState = new ColumnDefinitionsContributionState({
            finalizeColumnAssignment: new Remote(false, false, 'error')
        })
        const endState = columnDefinitionContributionReducer(
            initialState,
            new FinalizeColumnAssignmentErrorAction('error')
        )
        expect(endState).toEqual(expectedState)
    })
    test(' clear error', () => {
        const initialState = new ColumnDefinitionsContributionState({
            finalizeColumnAssignment: new Remote(false, false, 'error')
        })
        const expectedState = new ColumnDefinitionsContributionState({
            finalizeColumnAssignment: new Remote(false)
        })
        const endState = columnDefinitionContributionReducer(
            initialState,
            new FinalizeColumnAssignmentClearErrorAction()
        )
        expect(endState).toEqual(expectedState)
    })
})
describe('misc', () => {
    test('set create state', () => {
        const initialState = new ColumnDefinitionsContributionState({
            createTabSelected: true
        })
        const expectedState = new ColumnDefinitionsContributionState({
            createTabSelected: false
        })
        const endState = columnDefinitionContributionReducer(
            initialState,
            new SetColumnDefinitionFormTabAction(false)
        )
        expect(endState).toEqual(expectedState)
    })
    test('select column definition', () => {
        const initialState = new ColumnDefinitionsContributionState({})
        const expectedState = new ColumnDefinitionsContributionState({
            selectedColumnDefinition: new Remote(
                columnDefinitionContributionListTest[0]
            )
        })
        const endState = columnDefinitionContributionReducer(
            initialState,
            new ColumnDefinitionContributionSelectAction(
                columnDefinitionContributionListTest[0]
            )
        )
        expect(endState).toEqual(expectedState)
    })
})
