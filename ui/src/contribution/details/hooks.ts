import { contributionDetailsReducer } from './reducer'
import { ContributionDetailState } from './state'
import { Remote, useThunkReducer } from '../../util/state'
import {
    LoadContributionDetailsAsyncAction,
    PatchContributionAction
} from './async_action'
import { Contribution } from '../state'
import { PatchContributionDetailsClearErrorAction } from './action'

export type PatchContributionCallback = ({
    name,
    description,
    anonymous,
    hasHeader
}: {
    name?: string
    description?: string
    anonymous?: boolean
    hasHeader?: boolean
}) => void

export type ContributionDetailProps = {
    remoteContribution: Remote<Contribution | undefined>
    patchContribution: Remote<undefined>
    loadContributionDetailsCallback: VoidFunction
    patchContributionDetailsCallback: PatchContributionCallback
    clearPatchContributionErrorCallback: VoidFunction
}

export function useContributionDetails(idPersistent: string): ContributionDetailProps {
    const [state, dispatch] = useThunkReducer(
        contributionDetailsReducer,
        new ContributionDetailState({})
    )
    return {
        remoteContribution: state.contribution,
        patchContribution: state.contributionPatch,
        loadContributionDetailsCallback: () => {
            if (state.contribution.isLoading) {
                return
            }
            dispatch(new LoadContributionDetailsAsyncAction(idPersistent))
        },
        patchContributionDetailsCallback: ({
            name,
            description,
            anonymous,
            hasHeader
        }) => {
            dispatch(
                new PatchContributionAction({
                    idPersistent: idPersistent,
                    name: name,
                    description: description,
                    isAnonymous: anonymous,
                    hasHeader: hasHeader
                })
            )
        },
        clearPatchContributionErrorCallback: () => {
            dispatch(new PatchContributionDetailsClearErrorAction())
        }
    }
}
