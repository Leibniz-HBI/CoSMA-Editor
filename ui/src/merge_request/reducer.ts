import {
    GetMergeRequestsErrorAction,
    GetMergeRequestsStartAction,
    GetMergeRequestsSuccessAction,
    MergeRequestAction
} from './actions'
import { MergeRequestByCategory, MergeRequestState } from './state'

export function mergeRequestReducer(
    state: MergeRequestState,
    action: MergeRequestAction
) {
    if (action instanceof GetMergeRequestsStartAction) {
        return new MergeRequestState({
            ...state,
            byCategory: state.byCategory.startLoading()
        })
    }
    if (action instanceof GetMergeRequestsSuccessAction) {
        return new MergeRequestState({
            ...state,
            byCategory: state.byCategory.success(
                new MergeRequestByCategory({
                    assigned: action.assigned,
                    created: action.created
                })
            )
        })
    }
    if (action instanceof GetMergeRequestsErrorAction) {
        return new MergeRequestState({
            ...state,
            byCategory: state.byCategory.withError(action.msg)
        })
    }
    return state
}
