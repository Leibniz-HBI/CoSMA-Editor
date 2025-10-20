/**
 * @vitest-environment jsdom
 */

import {vi, Mock }  from 'vitest'
import { RenderOptions, render, waitFor, screen } from '@testing-library/react'
import {
    MergeRequestState,
    MergeRequestStep,
    newMergeRequest,
    newMergeRequestState
} from '../state'
import {
    NotificationManager,
    NotificationType,
    newNotification,
    newNotificationManager,
    notificationReducer
} from '../../util/notification/slice'
import { columnMergeRequestsReducer } from '../slice'
import { configureStore } from '@reduxjs/toolkit'
import { PropsWithChildren } from 'react'
import { Provider } from 'react-redux'
import { ReviewList } from '../components'
import { newRemote } from '../../util/state'
import { UserPermissionGroup, newPublicUserInfo, newUserInfo } from '../../user/state'
import { ColumnType, newColumn } from '../../column_menu/state'
import { useNavigate } from 'react-router-dom'
import { AuthState, newAuthState } from '../../auth/state'
import { authReducer } from '../../auth/slice'

vi.mock('react-router-dom', () => {
    const mockNavigate = vi.fn()
    return {
        useNavigate: vi.fn().mockReturnValue(mockNavigate)
    }
})
interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: {
        notification: NotificationManager
        columnMergeRequests: MergeRequestState
        auth: AuthState
    }
}

export function renderWithProviders(
    ui: React.ReactElement,
    fetchMock: Mock,
    {
        preloadedState = {
            columnMergeRequests: newMergeRequestState({}),
            notification: { notificationList: [], notificationMap: {} },
            auth: newAuthState({
                user: newRemote(
                    newUserInfo({
                        username: 'logged in user',
                        idPersistent: 'id-logged-in-user',
                        email: 'user@logged.in',
                        namesPersonal: 'name logged in',
                        idColumnPersistentList: [],
                        permissionGroup: UserPermissionGroup.CONTRIBUTOR
                    })
                )
            })
        },
        ...renderOptions
    }: ExtendedRenderOptions = {}
) {
    const store = configureStore({
        reducer: {
            notification: notificationReducer,
            columnMergeRequests: columnMergeRequestsReducer,
            auth: authReducer
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
function addResponseSequence(mock: Mock, responses: [number, unknown][]) {
    for (const tpl of responses) {
        const [status_code, rsp] = tpl
        mock.mockImplementationOnce(
            vi.fn(() =>
                Promise.resolve({
                    status: status_code,
                    json: () => Promise.resolve(rsp)
                })
            ) as Mock
        )
    }
}
const idUser = 'id-user'
const nameUser = 'user name'
const idUser1 = 'id-user-1'
const nameUser1 = 'name user 1'

const namePathColumn = ['name', 'path']
const idColumn = 'id-column'
const versionColumn = 46
const namePathColumn1 = ['name', 'path', 'column 1']
const idColumn1 = 'id-Column-1'
const versionColumn1 = 57

const idMergeRequest = 'id-mr-test'

const mergeRequest = {
    id_persistent: idMergeRequest,
    state: 'OPEN',
    disable_origin_on_merge: true,
    created_by: {
        id_persistent: idUser,
        username: nameUser,
        permission_group: 'CONTRIBUTOR'
    },
    assigned_to: {
        id_persistent: idUser1,
        username: nameUser1,
        permission_group: 'CONTRIBUTOR'
    },
    destination: {
        name_path: namePathColumn,
        id_persistent: idColumn,
        type: 'STRING',
        hidden: false,
        curated: false,
        version: versionColumn
    },
    origin: {
        name_path: namePathColumn1,
        id_persistent: idColumn1,
        type: 'FLOAT',
        hidden: false,
        curated: false,
        version: versionColumn1
    }
}
const mergeRequest1 = {
    id_persistent: idMergeRequest,
    state: 'OPEN',
    disable_origin_on_merge: false,
    assigned_to: {
        id_persistent: idUser,
        username: nameUser,
        permission_group: 'CONTRIBUTOR'
    },
    created_by: {
        id_persistent: idUser1,
        username: nameUser1,
        permission_group: 'CONTRIBUTOR'
    },
    origin: {
        name_path: namePathColumn,
        id_persistent: idColumn,
        type: 'STRING',
        hidden: false,
        curated: false,
        version: versionColumn
    },
    destination: {
        name_path: namePathColumn1,
        id_persistent: idColumn1,
        type: 'FLOAT',
        hidden: false,
        curated: false,
        version: versionColumn1
    }
}

test('success', async () => {
    const fetchMock = vi.fn()
    addResponseSequence(fetchMock, [
        [200, { assigned: [mergeRequest1], created: [mergeRequest] }]
    ])
    const { store } = renderWithProviders(<ReviewList />, fetchMock)

    await waitFor(() => {
        const items = screen.getAllByText(
            (_, element) => element?.textContent === 'column 1'
        )
        expect(items.length).toEqual(2)
        items[0].click()
    })
    await waitFor(() => {
        expect((useNavigate() as Mock).mock.calls).toEqual([
            [`/review/columns/${idMergeRequest}`]
        ])
    })
    expect(store.getState().notification).toEqual(newNotificationManager({}))
    expect(store.getState().columnMergeRequests).toEqual({
        byCategory: newRemote({
            created: [
                newMergeRequest({
                    idPersistent: idMergeRequest,
                    createdBy: newPublicUserInfo({
                        idPersistent: idUser,
                        username: nameUser,
                        permissionGroup: UserPermissionGroup.CONTRIBUTOR
                    }),
                    assignedTo: newPublicUserInfo({
                        idPersistent: idUser1,
                        username: nameUser1,
                        permissionGroup: UserPermissionGroup.CONTRIBUTOR
                    }),
                    destinationColumn: newColumn({
                        namePath: namePathColumn,
                        idPersistent: idColumn,
                        columnType: ColumnType.String,
                        curated: false,
                        hidden: false,
                        version: versionColumn
                    }),
                    originColumn: newColumn({
                        namePath: namePathColumn1,
                        idPersistent: idColumn1,
                        columnType: ColumnType.Float,
                        curated: false,
                        hidden: false,
                        version: versionColumn1
                    }),
                    step: MergeRequestStep.Open,
                    disableOriginOnMerge: true
                })
            ],
            assigned: [
                newMergeRequest({
                    idPersistent: idMergeRequest,
                    assignedTo: newPublicUserInfo({
                        idPersistent: idUser,
                        username: nameUser,
                        permissionGroup: UserPermissionGroup.CONTRIBUTOR
                    }),
                    createdBy: newPublicUserInfo({
                        idPersistent: idUser1,
                        username: nameUser1,
                        permissionGroup: UserPermissionGroup.CONTRIBUTOR
                    }),
                    originColumn: newColumn({
                        namePath: namePathColumn,
                        idPersistent: idColumn,
                        columnType: ColumnType.String,
                        curated: false,
                        hidden: false,
                        version: versionColumn
                    }),
                    destinationColumn: newColumn({
                        namePath: namePathColumn1,
                        idPersistent: idColumn1,
                        columnType: ColumnType.Float,
                        curated: false,
                        hidden: false,
                        version: versionColumn1
                    }),
                    step: MergeRequestStep.Open,
                    disableOriginOnMerge: false
                })
            ]
        })
    })
})

test('error', async () => {
    const fetchMock = vi.fn()
    const testError = 'test error column mr'
    addResponseSequence(fetchMock, [[500, { msg: testError }]])
    const { store } = renderWithProviders(<ReviewList />, fetchMock)
    await waitFor(() => {
        expect(store.getState()).toEqual({
            columnMergeRequests: newMergeRequestState({}),
            notification: newNotificationManager({
                notificationList: [
                    newNotification({
                        msg: testError,
                        type: NotificationType.Error,
                        id: expect.anything()
                    })
                ],
                notificationMap: expect.anything(),
                helpPath: undefined
            }),
            auth: expect.anything()
        })
    })
})
