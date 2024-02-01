import { Dispatch } from 'react'
import { AppDispatch } from '../store'

/**
 * Base class for asynchronous actions.
 */

export abstract class AsyncAction<U, V> {
    abstract run(dispatch: Dispatch<U>, reduxDispatch: AppDispatch): Promise<V>
}
