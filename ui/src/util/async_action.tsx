import { Dispatch } from 'react'
import { LogoutAction } from '../user/actions'

/**
 * Base class for asynchronous actions.
 */

export abstract class AsyncAction<U, V> {
    abstract run(
        dispatch: Dispatch<U>,
        logoutDispatch?: Dispatch<LogoutAction>
    ): Promise<V>
}
