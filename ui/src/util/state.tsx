import { useReducer, useCallback, Dispatch, Reducer } from 'react'

type ThunkMiddlewareDispatch<U> = <V>(action: AsyncAction<U, V> | U) => Promise<U | V>

/**
 * Base class for asynchronous actions.
 */
export abstract class AsyncAction<U, V> {
    abstract run(dispatch: Dispatch<U>): Promise<V>
}

/**
 * Makes a dispatch function for elementary actions also handle async actions.
 * @param reducer The function that generates a new state from a state and a elementary action.
 * @returns A dispatch function that can also handle asynchronous actions.
 */
function thunker<U>(dispatch: Dispatch<U>): ThunkMiddlewareDispatch<U> {
    return function <V>(action: AsyncAction<U, V> | U): Promise<U | V> {
        if (action instanceof AsyncAction<U, V>) {
            return (action as AsyncAction<U, V>).run(dispatch)
        } else {
            dispatch(action)
            return Promise.resolve(action)
        }
    }
}

/**
 * Hook for creating a dispatch method that can also handle async actions.
 * @param reducer The function that generates a new state from a state and an action
 * @param initialState The initial state.
 * @returns The current state and the function for dispatching actions on the state.
 */
export function useThunkReducer<T, U>(
    reducer: Reducer<T, U>,
    initialState: T
): [T, ThunkMiddlewareDispatch<U>] {
    const [state, dispatch] = useReducer(reducer, initialState)
    return [
        state,
        // eslint-disable-next-line react-hooks/exhaustive-deps
        useCallback(thunker<U>(dispatch as Dispatch<U>), [initialState])
    ]
}
