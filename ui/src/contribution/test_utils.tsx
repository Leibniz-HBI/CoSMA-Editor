import { render, RenderOptions } from '@testing-library/react'
import { contributionSlice, ContributionState, newContributionState } from './slice'
import { NotificationManager, notificationReducer } from '../util/notification/slice'
import { Mock } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import { PropsWithChildren } from 'react'
import { Provider } from 'react-redux'
import { EditSessionState, newEditSessionState } from '../session/state'
import { editSessionReducer } from '../session/slice'
import {
    ColumnDefinitionsContributionState,
    newColumnDefinitionsContributionState
} from './columns/state'
import { contributionColumnDefinitionSlice } from './columns/slice'
import { ColumnSelectionState, newColumnSelectionState } from '../column_menu/state'
import { columnSelectionReducer } from '../column_menu/slice'

export const nameTest0 = 'contribution test 0'
export const descriptionTest0 = 'a contribution for tests'
export const idTest0 = 'id-test-0'
export const authorTest1 = 'author test 1'
export const contributionResponse0 = {
    name: nameTest0,
    description: descriptionTest0,
    id_persistent: idTest0,
    author: authorTest1,
    has_header: false,
    state: 'UPLOADED',
    empty_values: 'nan,na'
}
export const nameTest1 = 'contribution test 1'
export const descriptionTest1 = 'another contribution for tests'
export const idTest1 = 'id-test-1'
export const contributionValuesAssignedResponse = {
    name: nameTest1,
    description: descriptionTest1,
    id_persistent: idTest1,
    has_header: true,
    state: 'VALUES_ASSIGNED',
    author: authorTest1,
    empty_values: 'null,none'
}
export const contributionEntitiesAssignedResponse = {
    name: nameTest1,
    description: descriptionTest1,
    id_persistent: idTest1,
    has_header: true,
    state: 'ENTITIES_ASSIGNED',
    author: authorTest1
}
export const contributionValuesExtractedResponse = {
    name: nameTest1,
    description: descriptionTest1,
    id_persistent: idTest1,
    has_header: true,
    state: 'VALUES_EXTRACTED',
    author: authorTest1
}
export interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: {
        contributionColumnDefinition: ColumnDefinitionsContributionState
        contribution: ContributionState
        columnSelection: ColumnSelectionState
        notification: NotificationManager
        editSession: EditSessionState
    }
}

export const defaultState = {
    contributionColumnDefinition: newColumnDefinitionsContributionState({}),
    contribution: newContributionState({}),
    columnSelection: newColumnSelectionState({}),
    notification: { notificationList: [], notificationMap: {} },
    editSession: newEditSessionState({})
}
export function renderWithProviders(
    ui: React.ReactElement,
    fetchMock: Mock,
    { preloadedState = defaultState, ...renderOptions }: ExtendedRenderOptions = {}
) {
    const store = configureStore({
        reducer: {
            contributionColumnDefinition: contributionColumnDefinitionSlice.reducer,
            contribution: contributionSlice.reducer,
            columnSelection: columnSelectionReducer,
            notification: notificationReducer,
            editSession: editSessionReducer
        },
        middleware: (getDefaultMiddleware) =>
            getDefaultMiddleware({ thunk: { extraArgument: fetchMock } }),
        preloadedState
    })
    function Wrapper({ children }: PropsWithChildren<object>): JSX.Element {
        return <Provider store={store}>{children}</Provider>
    }

    // Return an object with the store and all of RTL's query functions
    return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) }
}
