import {
    PreloadedState,
    applyMiddleware,
    combineReducers,
    configureStore
} from '@reduxjs/toolkit'
import { errorSlice } from './util/error/slice'
import { userSlice } from './user/slice'

const rootReducer = combineReducers({
    error: errorSlice.reducer,
    user: userSlice.reducer
})
export function setupStore(preloadedState?: PreloadedState<RootState>) {
    return configureStore({
        reducer: rootReducer,
        middleware: (getDefaultMiddleware) =>
            getDefaultMiddleware({ thunk: { extraArgument: fetch } }),
        preloadedState
    })
}

const store = setupStore()

export default store

export type RootState = ReturnType<typeof rootReducer>
export type AppStore = ReturnType<typeof setupStore>
export type AppDispatch = AppStore['dispatch']
