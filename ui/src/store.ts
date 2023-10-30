import { PreloadedState, combineReducers, configureStore } from '@reduxjs/toolkit'
import { errorSlice } from './util/error/slice'
import { userSlice } from './user/slice'
import { tagManagementSlice } from './tag_management/slice'
import { contributionColumnDefinitionSlice } from './contribution/columns/slice'
import { contributionEntitySlice } from './contribution/entity/slice'
import { contributionSlice } from './contribution/slice'
import { tagSelectionSlice } from './column_menu/slice'

const rootReducer = combineReducers({
    error: errorSlice.reducer,
    user: userSlice.reducer,
    tagManagement: tagManagementSlice.reducer,
    tagSelection: tagSelectionSlice.reducer,
    contributionColumnDefinition: contributionColumnDefinitionSlice.reducer,
    contributionEntity: contributionEntitySlice.reducer,
    contribution: contributionSlice.reducer
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
