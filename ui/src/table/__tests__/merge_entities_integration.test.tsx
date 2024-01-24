/**
 * @jest-environment jsdom
 */

/* eslint-disable @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars */
jest.mock('@glideapps/glide-data-grid', () => {
    const actual = jest.requireActual('@glideapps/glide-data-grid')
    return {
        __esmodule: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
        DataEditor: jest.fn().mockImplementation((props: any) => <MockTable />),
        CompactSelection: actual.CompactSelection
    }
})
import { RenderOptions, render, screen, waitFor } from '@testing-library/react'
import { RemoteDataTable } from '../components'
import { ColumnState, TableState } from '../state'
import { TagType } from '../../column_menu/state'
import { ErrorManager, errorSlice } from '../../util/error/slice'
import { Remote, RemoteInterface, newRemote, useThunkReducer } from '../../util/state'
import {
    EntityMergeRequest,
    EntityMergeRequestStep,
    newEntityMergeRequest
} from '../../merge_request/entity/state'
import { TableSelectionState, tableSelectionSlice } from '../selection/slice'
import { configureStore } from '@reduxjs/toolkit'
import { entityMergeRequestsReducer } from '../../merge_request/entity/slice'
import { PropsWithChildren, Reducer } from 'react'
import { Provider } from 'react-redux'
import { UserInfo, UserPermissionGroup, UserState, mkUserState } from '../../user/state'
import { TableAction, ToggleEntityModalAction } from '../actions'
import { userSlice } from '../../user/slice'
import {
    EntityMergeRequestConflictsState,
    newEntityMergeRequestConflict
} from '../../merge_request/entity/conflicts/state'
import { entityMergeRequestConflictSlice } from '../../merge_request/entity/conflicts/slice'

jest.mock('react', () => {
    const actual = jest.requireActual('react')
    const useEffectMock = jest.fn()
    useEffectMock.mockImplementationOnce((callBack, dependencies) => {})
    useEffectMock.mockImplementation(actual.useEffect)
    return {
        __esmodule: true,
        ...actual,
        /// make sure we do not load data.
        useEffect: useEffectMock
    }
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
function MockTable(props: any) {
    return <div className="mock"></div>
}
interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: {
        entityMergeRequests: {
            entityMergeRequests: RemoteInterface<EntityMergeRequest[] | undefined>
        }
        entityMergeRequestConflicts: EntityMergeRequestConflictsState
        error: ErrorManager
        tableSelection: TableSelectionState
        user: UserState
    }
}

export function renderWithProviders(
    ui: React.ReactElement,
    fetchMock: jest.Mock,
    {
        preloadedState = {
            entityMergeRequests: { entityMergeRequests: newRemote(undefined) },
            entityMergeRequestConflicts: {
                conflicts: newRemote(undefined),
                mergeRequest: newRemote(undefined),
                newlyCreated: false,
                reverseOriginDestination: newRemote(undefined),
                merge: newRemote(undefined)
            },
            error: { errorList: [], errorMap: {} },
            tableSelection: {
                current: undefined,
                cols: [],
                rows: [0, 1],
                rowSelectionOrder: [0, 1]
            },
            user: mkUserState({ userInfo })
        },
        ...renderOptions
    }: ExtendedRenderOptions = {}
) {
    const store = configureStore({
        reducer: {
            entityMergeRequests: entityMergeRequestsReducer,
            error: errorSlice.reducer,
            tableSelection: tableSelectionSlice.reducer,
            entityMergeRequestConflicts: entityMergeRequestConflictSlice.reducer,
            user: userSlice.reducer
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

function addResponseSequence(mock: jest.Mock, responses: [number, unknown][]) {
    for (const tpl of responses) {
        const [status_code, rsp] = tpl
        mock.mockImplementationOnce(
            jest.fn(() =>
                Promise.resolve({
                    status: status_code,
                    json: () => Promise.resolve(rsp)
                })
            ) as jest.Mock
        )
    }
}
const testColumns = [
    new ColumnState({
        tagDefinition: {
            idPersistent: 'test_column_0',
            namePath: ['test title 0'],
            columnType: TagType.String,
            curated: false,
            version: 0,
            hidden: false
        },
        cellContents: new Remote([])
    }),
    new ColumnState({
        tagDefinition: {
            idPersistent: 'test_column_1',
            namePath: ['test title 1'],
            columnType: TagType.String,
            curated: false,
            version: 0,
            hidden: false
        },
        cellContents: new Remote([])
    })
]
const idEntity0 = 'id-entity-0, '
const displayTxt0 = ' Entity 0'
const versionEntity0 = 1230
const idEntity1 = 'id-entity-1, '
const displayTxt1 = ' Entity 1'
const versionEntity1 = 1231
const entities = [
    {
        idPersistent: idEntity0,
        displayTxt: displayTxt0,
        displayTxtDetails: 'display_txt_detail',
        version: versionEntity0,
        disabled: false
    },
    {
        idPersistent: idEntity1,
        displayTxt: displayTxt1,
        displayTxtDetails: 'display_txt_detail',
        version: versionEntity1,
        disabled: false
    }
]
jest.mock('../../util/state', () => {
    return {
        __esmodule: true,
        ...jest.requireActual('../../util/state'),
        useThunkReducer: jest.fn()
    }
})
const nameUser = 'userNameTest'
const idUser = 'id-user-test'
const userInfo = new UserInfo({
    userName: nameUser,
    idPersistent: idUser,
    namesPersonal: 'name test',
    email: 'mail@test.url',
    permissionGroup: UserPermissionGroup.COMMISSIONER
})
const idMrPersistent = 'id-entity-merge-request'
test('start entity duplicate merging', async () => {
    const reducerMock = jest.fn()
    ;(useThunkReducer as jest.Mock).mockImplementation(
        (reducer: Reducer<TableState, TableAction>, state: TableState) => {
            return [
                new TableState({
                    entities,
                    columnStates: testColumns,
                    columnIndices: new Map(
                        testColumns.map((col, idx) => [
                            col.tagDefinition.idPersistent,
                            idx
                        ])
                    ),
                    frozenColumns: 1,
                    selectedColumnHeaderBounds: undefined,
                    isLoading: false,
                    loadDataErrorState: undefined,
                    submitValuesErrorState: undefined,
                    entityAddState: new Remote(false),
                    showEntityMergingModal: false
                }),
                reducerMock
            ]
        }
    )
    const fetchMock = jest.fn()
    const mergeRequestApi = {
        id_persistent: idMrPersistent,
        created_by: {
            id_persistent: idUser,
            user_name: nameUser,
            permission_group: 'COMMISSIONER'
        },
        origin: {
            display_txt: displayTxt0,
            display_txt_details: 'display_txt_detail',
            version: versionEntity0,
            id_persistent: idEntity0,
            disabled: false
        },
        destination: {
            display_txt: displayTxt1,
            display_txt_details: 'display_txt_detail',
            version: versionEntity1,
            id_persistent: idEntity1,
            disabled: false
        },
        state: 'OPEN'
    }
    addResponseSequence(fetchMock, [[200, mergeRequestApi]])
    const { store } = renderWithProviders(
        <RemoteDataTable userInfoPromise={() => Promise.resolve(userInfo)} />,
        fetchMock
    )
    await waitFor(() => {
        const mergeButton = screen.getByRole('button', { name: /merge entities/i })
        mergeButton.click()
    })
    await waitFor(() => {
        expect(store.getState().entityMergeRequestConflicts).toEqual({
            newlyCreated: true,
            reverseOriginDestination: newRemote(undefined),
            mergeRequest: newRemote(
                newEntityMergeRequest({
                    idPersistent: idMrPersistent,
                    createdBy: {
                        idPersistent: idUser,
                        userName: nameUser,
                        permissionGroup: UserPermissionGroup.COMMISSIONER
                    },
                    entityOrigin: {
                        idPersistent: idEntity0,
                        displayTxt: displayTxt0,
                        displayTxtDetails: 'display_txt_detail',
                        version: versionEntity0,
                        disabled: false
                    },
                    entityDestination: {
                        idPersistent: idEntity1,
                        displayTxt: displayTxt1,
                        displayTxtDetails: 'display_txt_detail',
                        version: versionEntity1,
                        disabled: false
                    },
                    state: EntityMergeRequestStep.OPEN
                })
            ),
            conflicts: newRemote(undefined),
            merge: newRemote(undefined)
        })
    })
    expect(fetchMock.mock.calls).toEqual([
        [
            `http://127.0.0.1:8000/cosmae/api/merge_requests/entities/${idEntity0}/${idEntity1}`,
            { credentials: 'include', method: 'PUT' }
        ]
    ])
    expect(reducerMock.mock.calls).toEqual([[new ToggleEntityModalAction(true)]])
})
