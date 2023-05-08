import { useReducer, useCallback, Dispatch, Reducer } from 'react'
import { LogoutAction } from '../user/actions'
import { useLogoutCallback } from '../user/hooks'
import { AsyncAction } from './async_action'

type ThunkMiddlewareDispatch<U> = <V>(
    action: AsyncAction<U, V> | U
) => Promise<V | undefined>

/**
 * Makes a dispatch function for elementary actions also handle async actions.
 * @param reducer The function that generates a new state from a state and a elementary action.
 * @returns A dispatch function that can also handle asynchronous actions.
 */
function thunker<U>(
    dispatch: Dispatch<U>,
    userDispatch?: Dispatch<LogoutAction>
): ThunkMiddlewareDispatch<U> {
    return function <V>(action: AsyncAction<U, V> | U): Promise<V | undefined> {
        if (action instanceof AsyncAction<U, V>) {
            return (action as AsyncAction<U, V>).run(dispatch, userDispatch)
        } else {
            dispatch(action)
            return Promise.resolve(undefined)
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
    const logoutDispatch = useLogoutCallback()
    const [state, dispatch] = useReducer(reducer, initialState)
    return [
        state,
        // eslint-disable-next-line react-hooks/exhaustive-deps
        useCallback(thunker<U>(dispatch as Dispatch<U>, logoutDispatch), [initialState])
    ]
}

export class Remote<U> {
    value: U
    isLoading: boolean
    errorMsg?: string

    constructor(value: U, isLoading?: boolean, errorMsg?: string) {
        this.value = value
        this.isLoading = !!isLoading
        this.errorMsg = errorMsg
    }

    withoutError() {
        return new Remote<U>(this.value, this.isLoading)
    }

    withError(errorMsg: string) {
        return new Remote<U>(this.value, false, errorMsg)
    }

    startLoading() {
        return new Remote<U>(this.value, true)
    }

    success(value: U) {
        return new Remote(value, false)
    }
}
