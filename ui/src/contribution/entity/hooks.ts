import { Remote, useThunkReducer } from '../../util/state'
import { LoadContributionDetailsAsyncAction } from '../details/async_action'
import { CompleteEntityAssignmentClearErrorAction } from './action'
import {
    CompleteEntityAssignmentAction,
    GetContributionEntitiesAction,
    GetContributionEntityDuplicateCandidatesAction,
    PutDuplicateAction
} from './async_actions'
import { contributionEntityReducer } from './reducer'
import { ContributionEntityState } from './state'

export type PutDuplicateCallback = (
    idEntityOriginPersistent: string,
    idEntityDestinationPersistent?: string
) => void

export function useContributionEntities(idContributionPersistent: string) {
    const [state, dispatch] = useThunkReducer(
        contributionEntityReducer,
        new ContributionEntityState({
            entities: new Remote([]),
            contributionCandidate: new Remote(undefined)
        })
    )

    const isLoading = state.contributionCandidate.isLoading || state.entities.isLoading
    return {
        getEntityDuplicatesCallback: () => {
            if (isLoading) {
                return
            }
            dispatch(new LoadContributionDetailsAsyncAction(idContributionPersistent))
            dispatch(new GetContributionEntitiesAction(idContributionPersistent)).then(
                (entities) =>
                    dispatch(
                        new GetContributionEntityDuplicateCandidatesAction({
                            idContributionPersistent,
                            entityIdPersistentList:
                                entities?.map((entity) => entity.idPersistent) || []
                        })
                    )
            )
        },
        isLoading: isLoading,
        contributionCandidate: state.contributionCandidate,
        entities: state.entities,
        minLoadingIdx: state.minEntityLoadingIndex(),
        completeEntityAssignment: state.completeEntityAssignment,
        completeEntityAssignmentCallback: () => {
            if (state.completeEntityAssignment.isLoading) {
                return
            }
            dispatch(new CompleteEntityAssignmentAction(idContributionPersistent))
        },
        clearEntityAssignmentErrorCallback: () =>
            dispatch(new CompleteEntityAssignmentClearErrorAction()),
        isDuplicates: state.isDuplicates(),
        putDuplicateCallback: (
            idEntityOriginPersistent: string,
            idEntityDestinationPersistent?: string
        ) =>
            dispatch(
                new PutDuplicateAction({
                    idContributionPersistent,
                    idEntityOriginPersistent,
                    idEntityDestinationPersistent
                })
            )
    }
}
