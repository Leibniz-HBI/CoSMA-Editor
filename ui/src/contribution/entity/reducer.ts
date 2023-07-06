import { Remote } from '../../util/state'
import {
    LoadContributionDetailsAction,
    LoadContributionDetailsErrorAction,
    LoadContributionDetailsStartAction,
    LoadContributionDetailsSuccessAction
} from '../details/action'
import {
    CompleteEntityAssignmentClearErrorAction,
    CompleteEntityAssignmentErrorAction,
    CompleteEntityAssignmentStartAction,
    CompleteEntityAssignmentSuccessAction,
    ContributionEntityAction,
    GetContributionEntitiesErrorAction,
    GetContributionEntitiesStartAction,
    GetContributionEntitiesSuccessAction,
    GetContributionEntityDuplicatesAction,
    GetContributionEntityDuplicatesErrorAction,
    GetContributionEntityDuplicatesStartAction,
    GetContributionEntityDuplicatesSuccessAction,
    PutDuplicateClearErrorAction,
    PutDuplicateErrorAction,
    PutDuplicateStartAction,
    PutDuplicateSuccessAction
} from './action'
import { ContributionEntityState, EntityWithDuplicates } from './state'

export function contributionEntityReducer(
    state: ContributionEntityState,
    action: ContributionEntityAction | LoadContributionDetailsAction
) {
    if (action instanceof GetContributionEntityDuplicatesAction) {
        const idx = state.entityMap.get(action.idPersistent)
        if (
            idx === undefined ||
            state.entities.value[idx].idPersistent != action.idPersistent
        ) {
            return state
        }
        return new ContributionEntityState({
            ...state,
            entities: state.entities.map((entities) => [
                ...entities.slice(0, idx),
                contributionEntityDuplicateReducer(entities[idx], action),
                ...entities.slice(idx + 1)
            ])
        })
    }
    if (action instanceof GetContributionEntitiesStartAction) {
        return new ContributionEntityState({
            ...state,
            entities: state.entities.startLoading()
        })
    }
    if (action instanceof GetContributionEntitiesSuccessAction) {
        return new ContributionEntityState({
            ...state,
            entities: state.entities.success(action.entities)
        })
    }
    if (action instanceof GetContributionEntitiesErrorAction) {
        return new ContributionEntityState({
            ...state,
            entities: state.entities.withError(action.msg)
        })
    }
    if (action instanceof LoadContributionDetailsStartAction) {
        return new ContributionEntityState({
            ...state,
            contributionCandidate: state.contributionCandidate.startLoading()
        })
    }
    if (action instanceof LoadContributionDetailsSuccessAction) {
        return new ContributionEntityState({
            ...state,
            contributionCandidate: state.contributionCandidate.success(
                action.contribution
            )
        })
    }
    if (action instanceof LoadContributionDetailsErrorAction) {
        return new ContributionEntityState({
            ...state,
            contributionCandidate: state.contributionCandidate.withError(action.msg)
        })
    }
    if (action instanceof CompleteEntityAssignmentStartAction) {
        return new ContributionEntityState({
            ...state,
            completeEntityAssignment: state.completeEntityAssignment.startLoading()
        })
    }
    if (action instanceof CompleteEntityAssignmentSuccessAction) {
        return new ContributionEntityState({
            ...state,
            completeEntityAssignment: state.completeEntityAssignment.success(true)
        })
    }
    if (action instanceof CompleteEntityAssignmentErrorAction) {
        return new ContributionEntityState({
            ...state,
            completeEntityAssignment: new Remote(false, false, action.msg)
        })
    }
    if (action instanceof CompleteEntityAssignmentClearErrorAction) {
        return new ContributionEntityState({
            ...state,
            completeEntityAssignment: state.completeEntityAssignment.withoutError()
        })
    }
    return state
}

export function contributionEntityDuplicateReducer(
    state: EntityWithDuplicates,
    action: GetContributionEntityDuplicatesAction
) {
    if (action instanceof PutDuplicateStartAction) {
        return new EntityWithDuplicates({
            ...state,
            assignedDuplicate: state.assignedDuplicate.startLoading()
        })
    }
    if (action instanceof PutDuplicateSuccessAction) {
        return new EntityWithDuplicates({
            ...state,
            assignedDuplicate: state.assignedDuplicate.success(action.assignedDuplicate)
        })
    }
    if (action instanceof PutDuplicateErrorAction) {
        return new EntityWithDuplicates({
            ...state,
            assignedDuplicate: state.assignedDuplicate.withError(action.msg)
        })
    }
    if (action instanceof PutDuplicateClearErrorAction) {
        return new EntityWithDuplicates({
            ...state,
            assignedDuplicate: state.assignedDuplicate.withoutError()
        })
    }
    if (action instanceof GetContributionEntityDuplicatesStartAction) {
        return new EntityWithDuplicates({
            ...state,
            similarEntities: state.similarEntities.startLoading()
        })
    }
    if (action instanceof GetContributionEntityDuplicatesSuccessAction) {
        return new EntityWithDuplicates({
            ...state,
            similarEntities: state.similarEntities.success(action.scoredEntities),
            assignedDuplicate: new Remote(action.assignedDuplicate)
        })
    }
    if (action instanceof GetContributionEntityDuplicatesErrorAction) {
        return new EntityWithDuplicates({
            ...state,
            similarEntities: state.similarEntities.withError(action.msg)
        })
    }
    return state
}
