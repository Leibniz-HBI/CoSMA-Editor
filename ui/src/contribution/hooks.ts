import { Remote, useThunkReducer } from '../util/state'
import {
    UploadContributionClearErrorAction,
    ToggleShowAddContributionAction
} from './actions'
import { LoadContributionsAction, UploadContributionAction } from './async_actions'
import { contributionReducer } from './reducer'
import { Contribution, ContributionState } from './state'

export type SubmitUploadCallback = ({
    name,
    description,
    anonymous,
    hasHeader,
    file
}: {
    name: string
    description: string
    anonymous: boolean
    hasHeader: boolean
    file: File
}) => void

export type ContributionListProps = {
    contributions: Remote<Contribution[]>
    showAddContribution: Remote<boolean>
    loadContributionsCallback: VoidFunction
    toggleShowAddContributionCallback: VoidFunction
    submitUploadCallback: SubmitUploadCallback
    clearUploadErrorCallback: VoidFunction
}

export function useContribution(): ContributionListProps {
    const [state, dispatch] = useThunkReducer(
        contributionReducer,
        new ContributionState({})
    )
    return {
        contributions: state.contributions,
        showAddContribution: state.showAddContribution,
        loadContributionsCallback: () => {
            if (state.contributions.isLoading) {
                return
            }
            dispatch(new LoadContributionsAction())
        },
        toggleShowAddContributionCallback: () =>
            dispatch(new ToggleShowAddContributionAction()),
        submitUploadCallback: ({ name, description, anonymous, hasHeader, file }) => {
            dispatch(
                new UploadContributionAction({
                    name: name,
                    description: description,
                    isAnonymous: anonymous,
                    hasHeader: hasHeader,
                    file: file
                })
            )
        },
        clearUploadErrorCallback: () =>
            dispatch(new UploadContributionClearErrorAction())
    }
}
