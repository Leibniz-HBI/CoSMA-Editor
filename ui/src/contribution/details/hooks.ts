import { contributionDetailsReducer } from './reducer'
import { ContributionDetailState } from './state'
import { Remote, useThunkReducer } from '../../util/state'
import {
    LoadContributionDetailsAsyncAction,
    PatchContributionAction
} from './async_action'
import { Contribution } from '../state'
import { useAppDispatch } from '../../hooks'

export type PatchContributionCallback = ({
    name,
    description,
    hasHeader
}: {
    name?: string
    description?: string
    hasHeader?: boolean
}) => void

export type ContributionDetailProps = {
    remoteContribution: Remote<Contribution | undefined>
    patchContribution: Remote<undefined>
    loadContributionDetailsCallback: VoidFunction
    patchContributionDetailsCallback: PatchContributionCallback
}

export function useContributionDetails(idPersistent: string): ContributionDetailProps {
    const reduxDispatch = useAppDispatch()
    const [state, dispatch] = useThunkReducer(
        contributionDetailsReducer,
        new ContributionDetailState({}),
        reduxDispatch
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
        patchContributionDetailsCallback: ({ name, description, hasHeader }) => {
            dispatch(
                new PatchContributionAction({
                    idPersistent: idPersistent,
                    name: name,
                    description: description,
                    hasHeader: hasHeader
                })
            )
        }
    }
}
