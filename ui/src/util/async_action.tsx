import { Dispatch } from 'react'
import { LogoutAction } from '../user/actions'
import { AppDispatch } from '../store'

/**
 * Base class for asynchronous actions.
 */

export abstract class AsyncAction<U, V> {
    abstract run(
        dispatch: Dispatch<U>,
        reduxDispatch: AppDispatch,
        logoutDispatch?: Dispatch<LogoutAction>
    ): Promise<V>
}
