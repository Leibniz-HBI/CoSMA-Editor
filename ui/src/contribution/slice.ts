import { PayloadAction, createSlice } from '@reduxjs/toolkit'
import { Contribution } from './state'
import { RemoteInterface, newRemote } from '../util/state'
export interface ContributionState {
    selectedContribution: RemoteInterface<Contribution | undefined>
    isUploadingContribution: boolean
}
export function newContributionState({
    selectedContribution = newRemote(undefined),
    isUploadingContribution = false
}: {
    selectedContribution?: RemoteInterface<Contribution | undefined>
    isUploadingContribution?: boolean
}) {
    return { selectedContribution, isUploadingContribution }
}

const initialState: ContributionState = {
    selectedContribution: newRemote(undefined),
    isUploadingContribution: false
}
export const contributionSlice = createSlice({
    name: 'contribution',
    initialState,
    reducers: {
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
        }
    }
})

export const {
    getContributionStart,
    getContributionSuccess,
    clearSelectedContribution,
    uploadContributionStart,
    uploadContributionEnd
} = contributionSlice.actions
