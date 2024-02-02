import { PayloadAction, createSlice } from '@reduxjs/toolkit'
import { Contribution } from './state'
import { RemoteInterface, newRemote } from '../util/state'
export interface ContributionState {
    selectedContribution: RemoteInterface<Contribution | undefined>
    isUploadingContribution: boolean
    contributions: RemoteInterface<Contribution[]>
    showAddContribution: boolean
}
export function newContributionState({
    selectedContribution = newRemote(undefined),
    isUploadingContribution = false,
    contributions = newRemote([]),
    showAddContribution = false
}: {
    selectedContribution?: RemoteInterface<Contribution | undefined>
    isUploadingContribution?: boolean
    contributions?: RemoteInterface<Contribution[]>
    showAddContribution?: boolean
}) {
    return {
        selectedContribution,
        isUploadingContribution,
        contributions,
        showAddContribution
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
    toggleShowAddContribution
} = contributionSlice.actions
