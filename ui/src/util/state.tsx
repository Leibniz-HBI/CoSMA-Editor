import { useReducer, useCallback, Dispatch, Reducer } from "react"

type ThunkMiddlewareDispatch<T, U> = (action: AsyncAction<T, U> | U) => void


/**
 * Base class for asynchronous actions.
 */
export abstract class AsyncAction<T, U>{
    abstract run(dispatch: Dispatch<U>, state: T): Promise<void>;
}

/**
 * Makes a dispatch function for elementary actions also handle async actions.
 * @param reducer The function that generates a new state from a state and a elementary action.
 * @param state The current state.
 * @returns A dispatch function that can also handle asynchronous actions.
 */
function thunker<T, U>(dispatch: Dispatch<U>, state: T): ThunkMiddlewareDispatch<T, U> {
    return function (action: AsyncAction<T, U> | U) {
        if (action instanceof AsyncAction<T, U>) {
            (action as AsyncAction<T, U>).run(dispatch, state)
        }
        else {
            dispatch(action)
        }
    }
}


/**
 * Hook for creating a dispatch method that can also handle async actions.
 * @param reducer The function that generates a new state from a state and an action
 * @param initialState The initial state.
 * @returns The current state and the function for dispatching actions on the state.
 */
export function useThunkReducer<T, U>(reducer: Reducer<T, U>, initialState: T): [T, ThunkMiddlewareDispatch<T, U>] {
    const [state, dispatch] = useReducer(reducer, initialState)
    return [state, useCallback(thunker<T, U>((dispatch as Dispatch<U>), state), [initialState])]
}
