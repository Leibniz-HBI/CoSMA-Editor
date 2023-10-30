import { PayloadAction, createSlice } from '@reduxjs/toolkit'
import { Contribution } from './state'
import { RemoteInterface, newRemote } from '../util/state'
export interface ContributionState {
    selectedContribution: RemoteInterface<Contribution | undefined>
}
const initialState: ContributionState = {
    selectedContribution: newRemote(undefined)
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
        }
    }
})

export const {
    getContributionStart,
    getContributionSuccess,
    clearSelectedContribution
} = contributionSlice.actions
