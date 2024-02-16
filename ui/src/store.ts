import { PreloadedState, combineReducers, configureStore } from '@reduxjs/toolkit'
import { notificationReducer } from './util/notification/slice'
import { userSlice } from './user/slice'
import { tagManagementSlice } from './tag_management/slice'
import { contributionColumnDefinitionSlice } from './contribution/columns/slice'
import { contributionEntitySlice } from './contribution/entity/slice'
import { contributionSlice } from './contribution/slice'
import { tagSelectionSlice } from './column_menu/slice'
import { tableSelectionSlice } from './table/selection/slice'
import { entityMergeRequestConflictSlice } from './merge_request/entity/conflicts/slice'
import { entityMergeRequestsReducer } from './merge_request/entity/slice'
import { displayTxtManagementReducer } from './management/display_txt/slice'
import { tagMergeRequestsReducer } from './merge_request/slice'

const rootReducer = combineReducers({
    notification: notificationReducer,
    user: userSlice.reducer,
    tagManagement: tagManagementSlice.reducer,
    tagSelection: tagSelectionSlice.reducer,
    contributionColumnDefinition: contributionColumnDefinitionSlice.reducer,
    contributionEntity: contributionEntitySlice.reducer,
    contribution: contributionSlice.reducer,
    tableSelection: tableSelectionSlice.reducer,
    entityMergeRequests: entityMergeRequestsReducer,
    tagMergeRequests: tagMergeRequestsReducer,
    entityMergeRequestConflicts: entityMergeRequestConflictSlice.reducer,
    displayTxtManagement: displayTxtManagementReducer
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
