import { useReducer, useCallback, Dispatch, Reducer } from 'react'
import { AsyncAction } from './async_action'
import { AppDispatch } from '../store'

export type ThunkMiddlewareDispatch<U> = <V>(
    action: AsyncAction<U, V> | U
) => Promise<V | undefined>

/**
 * Makes a dispatch function for elementary actions also handle async actions.
 * @param reducer The function that generates a new state from a state and a elementary action.
 * @returns A dispatch function that can also handle asynchronous actions.
 */
function thunker<U>(
    dispatch: Dispatch<U>,
    reduxDispatch: AppDispatch
): ThunkMiddlewareDispatch<U> {
    return function <V>(action: AsyncAction<U, V> | U): Promise<V | undefined> {
        if (action instanceof AsyncAction) {
            return (action as AsyncAction<U, V>).run(dispatch, reduxDispatch)
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
    initialState: T,
    reduxDispatch: AppDispatch
): [T, ThunkMiddlewareDispatch<U>] {
    const [state, dispatch] = useReducer(reducer, initialState)
    return [
        state,
        // eslint-disable-next-line react-hooks/exhaustive-deps
        useCallback(thunker<U>(dispatch as Dispatch<U>, reduxDispatch), [
            initialState,
            reduxDispatch
        ])
    ]
}

export interface RemoteInterface<U> {
    value: U
    isLoading: boolean
    errorMsg?: string
}

export function newRemote<U>(
    value: U,
    isLoading?: boolean,
    errorMsg?: string
): RemoteInterface<U> {
    return { value, isLoading: isLoading ?? false, errorMsg }
}

export class Remote<U> implements RemoteInterface<U> {
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

    withError(errorMsg?: string) {
        return new Remote<U>(this.value, false, errorMsg)
    }

    startLoading() {
        return new Remote<U>(this.value, true)
    }

    success(value: U) {
        return new Remote(value, false)
    }

    map<V>(fun: (u: U) => V): Remote<V> {
        return new Remote<V>(fun(this.value), this.isLoading, this.errorMsg)
    }
}
