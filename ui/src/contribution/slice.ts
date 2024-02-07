import { PayloadAction, createSlice } from '@reduxjs/toolkit'
import { Contribution } from './state'
import { RemoteInterface, newRemote } from '../util/state'

const initialCountdownValue = 5

export interface ContributionState {
    selectedContribution: RemoteInterface<Contribution | undefined>
    isUploadingContribution: boolean
    contributions: RemoteInterface<Contribution[]>
    showAddContribution: boolean
    patchSelectedContribution: boolean
    reloadDelay: number
}
export function newContributionState({
    selectedContribution = newRemote(undefined),
    isUploadingContribution = false,
    contributions = newRemote([]),
    showAddContribution = false,
    patchSelectedContribution = false,
    reloadDelay = initialCountdownValue
}: {
    selectedContribution?: RemoteInterface<Contribution | undefined>
    isUploadingContribution?: boolean
    contributions?: RemoteInterface<Contribution[]>
    showAddContribution?: boolean
    patchSelectedContribution?: boolean
    reloadDelay?: number
}) {
    return {
        selectedContribution,
        isUploadingContribution,
        contributions,
        showAddContribution,
        patchSelectedContribution,
        reloadDelay
    }
}

const initialState: ContributionState = newContributionState({})

export const contributionSlice = createSlice({
    name: 'contribution',
    initialState,
    reducers: {
        getContributionListStart(state: ContributionState) {
            state.contributions.isLoading = true
        },
        getContributionListEnd(
            state: ContributionState,
            action: PayloadAction<Contribution[] | undefined>
        ) {
            state.contributions.isLoading = false
            const contributions = action.payload
            if (contributions !== undefined) {
                state.contributions.value = contributions
            }
        },
        getContributionStart(state: ContributionState) {
            state.selectedContribution.isLoading = true
        },
        getContributionSuccess(
            state: ContributionState,
            action: PayloadAction<Contribution>
        ) {
            state.selectedContribution.value = action.payload
            state.selectedContribution.isLoading = false
        },
        clearSelectedContribution(state: ContributionState) {
            state.selectedContribution.value = undefined
        },
        uploadContributionStart(state: ContributionState) {
            state.isUploadingContribution = true
        },
        uploadContributionEnd(state: ContributionState) {
            state.isUploadingContribution = false
        },
        toggleShowAddContribution(state: ContributionState) {
            state.showAddContribution = !state.showAddContribution
        },
        patchSelectedContributionStart(state: ContributionState) {
            state.patchSelectedContribution = true
        },
        patchSelectedContributionEnd(
            state: ContributionState,
            action: PayloadAction<Contribution | undefined>
        ) {
            const contribution = action.payload
            if (contribution !== undefined) {
                state.selectedContribution = newRemote(contribution)
            }
            state.patchSelectedContribution = false
        },
        resetDelay(state: ContributionState) {
            state.reloadDelay = initialCountdownValue
        },
        decrementDelay(state: ContributionState) {
            state.reloadDelay = state.reloadDelay - 1
        },
        resetSelectedContribution(state: ContributionState) {
            state.selectedContribution = newRemote(undefined)
        }
    }
})

export const {
    getContributionListStart,
    getContributionListEnd,
    getContributionStart,
    getContributionSuccess,
    clearSelectedContribution,
    uploadContributionStart,
    uploadContributionEnd,
    toggleShowAddContribution,
    patchSelectedContributionStart,
    patchSelectedContributionEnd,
    decrementDelay,
    resetDelay,
    resetSelectedContribution
} = contributionSlice.actions
