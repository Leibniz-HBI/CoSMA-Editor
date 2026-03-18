import { combineReducers, configureStore } from '@reduxjs/toolkit'
import { notificationReducer } from './util/notification/slice'
import { userSlice } from './user/slice'
import { columnManagementReducer } from './column_management/slice'
import { contributionColumnDefinitionSlice } from './contribution/columns/slice'
import { contributionEntitySlice } from './contribution/entity/slice'
import { contributionSlice } from './contribution/slice'
import { columnSelectionReducer } from './column_menu/slice'
import { tableSelectionSlice } from './table/selection/slice'
import { entityMergeRequestConflictSlice } from './merge_request/entity/conflicts/slice'
import { entityMergeRequestsReducer } from './merge_request/entity/slice'
import { displayTxtManagementReducer } from './management/display_txt/slice'
import { columnMergeRequestsReducer } from './merge_request/slice'
import { columnMergeRequestConflictsReducer } from './merge_request/conflicts/slice'
import { commentsReducer } from './comments/slice'
import { tableReducer } from './table/slice'
import { editSessionReducer } from './session/slice'
import { entityDetailsReducer } from './entity/slice'
import { permissionsReducer } from './permissions/slice'
import { authReducer } from './auth/slice'
import { client as cosmaeClient } from './openapi/cosmae/client.gen'
import { client as allauthClient } from './openapi/allauth/client.gen'
import { config } from './config'
import { Fetch } from './util/type'
import { dataPublicationReducer } from './management/data_publication/slice'
import { getCookie } from './util/cookie'

const rootReducer = combineReducers({
    notification: notificationReducer,
    user: userSlice.reducer,
    columnManagement: columnManagementReducer,
    columnSelection: columnSelectionReducer,
    contributionColumnDefinition: contributionColumnDefinitionSlice.reducer,
    contributionEntity: contributionEntitySlice.reducer,
    contribution: contributionSlice.reducer,
    tableSelection: tableSelectionSlice.reducer,
    entityMergeRequests: entityMergeRequestsReducer,
    columnMergeRequests: columnMergeRequestsReducer,
    columnMergeRequestConflicts: columnMergeRequestConflictsReducer,
    entityMergeRequestConflicts: entityMergeRequestConflictSlice.reducer,
    entityDetails: entityDetailsReducer,
    displayTxtManagement: displayTxtManagementReducer,
    dataPublication: dataPublicationReducer,
    comments: commentsReducer,
    table: tableReducer,
    permissions: permissionsReducer,
    editSession: editSessionReducer,
    auth: authReducer
})

export function setupStore(preloadedState?: RootState) {
    const store = configureStore({
        reducer: rootReducer,
        middleware: (getDefaultMiddleware) =>
            getDefaultMiddleware({ thunk: { extraArgument: fetch } }),
        preloadedState
    })
    setBaseUrls(fetch)
    return store
}

const store = setupStore()

export default store

export type RootState = ReturnType<typeof rootReducer>
export type AppStore = ReturnType<typeof setupStore>
export type AppDispatch = AppStore['dispatch']

const modifyMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
function csrfRequestInterceptor(request: Request) {
    if (modifyMethods.has(request.method)) {
        const csrfToken = getCookie('csrftoken')
        if (csrfToken) {
            request.headers.set('X-CSRFToken', csrfToken)
        }
    }
    return request
}

export function setBaseUrls(fetch?: Fetch | undefined) {
    if (config.api_url !== undefined && config.api_url !== '') {
        allauthClient.setConfig({
            baseUrl: config.api_url,
            credentials: 'include',
            fetch
        })
        cosmaeClient.setConfig({
            baseUrl: config.api_url,
            credentials: 'include',
            fetch
        })
    }
    allauthClient.interceptors.request.use(csrfRequestInterceptor)
    cosmaeClient.interceptors.request.use(csrfRequestInterceptor)
}
