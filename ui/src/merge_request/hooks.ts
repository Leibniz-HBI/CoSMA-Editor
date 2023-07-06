import { useThunkReducer } from '../util/state'
import { GetMergeRequestsAction } from './async_actions'
import { mergeRequestReducer } from './reducer'
import { MergeRequestState } from './state'

export function useMergeRequests() {
    const [state, dispatch] = useThunkReducer(
        mergeRequestReducer,
        new MergeRequestState({})
    )
    return {
        getMergeRequestsCallback: () => dispatch(new GetMergeRequestsAction()),
        isLoading: state.byCategory.isLoading,
        created: state.byCategory.value.created,
        assigned: state.byCategory.value.assigned
    }
}
