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
            state.showAddContribution = false
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
                const contributionIndex = state.contributions.value.findIndex(
                    (c) => c.idPersistent === contribution.idPersistent
                )
                if (contributionIndex !== -1 && contribution !== undefined) {
                    if (contribution.markedForDeletion) {
                        state.contributions.value.splice(contributionIndex, 1)
                    } else {
                        state.contributions.value[contributionIndex] = contribution
                    }
                }
            }
            state.patchSelectedContribution = false
        },
        setJustificationOfContribution(
            state: ContributionState,
            action: PayloadAction<{
                idContributionPersistent: string
                justification: string
            }>
        ) {
            if (
                state.selectedContribution.value?.idPersistent ===
                action.payload.idContributionPersistent
            ) {
                state.selectedContribution.value.justification =
                    action.payload.justification
            }
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
    resetSelectedContribution,
    setJustificationOfContribution
} = contributionSlice.actions
