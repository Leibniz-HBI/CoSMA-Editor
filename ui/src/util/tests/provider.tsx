import { Mock } from 'vitest'
import { render, RenderOptions } from '@testing-library/react'
import {
    newNotificationManager,
    NotificationManager,
    notificationReducer
} from '../notification/slice'
import { newTableState, TableState } from '../../table/state'
import { ColumnSelectionState, newColumnSelectionState } from '../../column_menu/state'
import { newUserState, UserState } from '../../user/state'
import { AuthState, newAuthState } from '../../auth/state'
import { EntityDetailsState, newEntityDetailsState } from '../../entity/state'
import { EditSessionState, newEditSessionState } from '../../session/state'
import { configureStore } from '@reduxjs/toolkit'
import { tableSelectionSlice, TableSelectionState } from '../../table/selection/slice'
import { tableReducer } from '../../table/slice'
import { columnSelectionReducer } from '../../column_menu/slice'
import { userSlice } from '../../user/slice'
import { authReducer } from '../../auth/slice'
import { editSessionReducer } from '../../session/slice'
import { entityDetailsReducer } from '../../entity/slice'
import { PropsWithChildren } from 'react'
import { Provider } from 'react-redux'
import { setBaseUrls } from '../../store'
import {
    contributionSlice,
    ContributionState,
    newContributionState
} from '../../contribution/slice'
import {
    ContributionEntityState,
    newContributionEntityState
} from '../../contribution/entity/state'
import { contributionEntitySlice } from '../../contribution/entity/slice'
import {
    ColumnDefinitionsContributionState,
    newColumnDefinitionsContributionState
} from '../../contribution/columns/state'
import { contributionColumnDefinitionSlice } from '../../contribution/columns/slice'
import { DisplayTxtManagementState } from '../../management/display_txt/state'
import { displayTxtManagementReducer } from '../../management/display_txt/slice'
import { newRemote } from '../state'
import {
    EntityMergeRequestConflictsState,
    newEntityMergeRequestConflictsState
} from '../../merge_request/entity/conflicts/state'
import { entityMergeRequestConflictSlice } from '../../merge_request/entity/conflicts/slice'
import { dataPublicationReducer } from '../../management/data_publication/slice'
import {
    DataPublicationState,
    newDataPublicationState
} from '../../management/data_publication/state'
import { ColumnManagementState } from '../../column_management/state'
import { columnManagementReducer } from '../../column_management/slice'
import { MergeRequestState, newMergeRequestState } from '../../merge_request/state'
import { columnMergeRequestsReducer } from '../../merge_request/slice'
import { entityMergeRequestsReducer } from '../../merge_request/entity/slice'
import { EntityMergeRequestState } from '../../merge_request/entity/state'
import { MergeRequestConflictResolutionState, newMergeRequestConflictResolutionState } from '../../merge_request/conflicts/state'
import { columnMergeRequestConflictsReducer } from '../../merge_request/conflicts/slice'

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: {
        notification: NotificationManager
        table: TableState
        tableSelection: TableSelectionState
        columnManagement: ColumnManagementState
        columnSelection: ColumnSelectionState
        user: UserState
        auth: AuthState
        editSession: EditSessionState
        entityDetails: EntityDetailsState
        contribution: ContributionState
        contributionEntity: ContributionEntityState
        contributionColumnDefinition: ColumnDefinitionsContributionState
        displayTxtManagement: DisplayTxtManagementState
        entityMergeRequestConflicts: EntityMergeRequestConflictsState
        columnMergeRequestConflicts: MergeRequestConflictResolutionState
        dataPublication: DataPublicationState
        columnMergeRequests: MergeRequestState
        entityMergeRequests: EntityMergeRequestState
    }
}
export const emptyState = {
    notification: newNotificationManager({}),
    table: newTableState({}),
    tableSelection: { rows: [], cols: [], rowSelectionOrder: [] },
    columnSelection: newColumnSelectionState({}),
    columnManagement: {
        ownershipRequests: newRemote({ petitioned: [], received: [] }),
        putOwnershipRequest: newRemote(undefined)
    },
    user: newUserState({}),
    auth: newAuthState({}),
    entityDetails: newEntityDetailsState({}),
    editSession: newEditSessionState({}),
    contribution: newContributionState({}),
    contributionEntity: newContributionEntityState({}),
    contributionColumnDefinition: newColumnDefinitionsContributionState({}),
    displayTxtManagement: { columns: newRemote([]) },
    entityMergeRequestConflicts: newEntityMergeRequestConflictsState({}),
    columnMergeRequestConflicts: newMergeRequestConflictResolutionState({}),
    dataPublication: newDataPublicationState({}),
    columnMergeRequests: newMergeRequestState({}),
    entityMergeRequests: { entityMergeRequests: newRemote(undefined) }
}
export function renderWithProviders(
    ui: React.ReactElement,
    fetchMock: Mock,
    { preloadedState = emptyState, ...renderOptions }: ExtendedRenderOptions = {}
) {
    const store = configureStore({
        reducer: {
            notification: notificationReducer,
            tableSelection: tableSelectionSlice.reducer,
            table: tableReducer,
            columnManagement: columnManagementReducer,
            columnSelection: columnSelectionReducer,
            user: userSlice.reducer,
            auth: authReducer,
            editSession: editSessionReducer,
            entityDetails: entityDetailsReducer,
            contribution: contributionSlice.reducer,
            contributionEntity: contributionEntitySlice.reducer,
            contributionColumnDefinition: contributionColumnDefinitionSlice.reducer,
            displayTxtManagement: displayTxtManagementReducer,
            entityMergeRequestConflicts: entityMergeRequestConflictSlice.reducer,
            columnMergeRequestConflicts: columnMergeRequestConflictsReducer,
            dataPublication: dataPublicationReducer,
            columnMergeRequests: columnMergeRequestsReducer,
            entityMergeRequests: entityMergeRequestsReducer
        },
        middleware: (getDefaultMiddleware) =>
            getDefaultMiddleware({ thunk: { extraArgument: fetchMock } }),
        preloadedState
    })
    function Wrapper({ children }: PropsWithChildren<object>): JSX.Element {
        return <Provider store={store}>{children}</Provider>
    }
    setBaseUrls(fetchMock)

    // Return an object with the store and all of RTL's query functions
    return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) }
}
