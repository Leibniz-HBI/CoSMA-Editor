/**
 * @jest-environment jsdom
 */
import { RenderOptions, render, waitFor, screen } from '@testing-library/react'
import { RemoteInterface, newRemote } from '../../../util/state'
import {
    EntityMergeRequest,
    EntityMergeRequestStep,
    newEntityMergeRequest
} from '../state'
import { configureStore } from '@reduxjs/toolkit'
import { entityMergeRequestsReducer } from '../slice'
import { PropsWithChildren } from 'react'
import { Provider } from 'react-redux'
import { EntityMergeRequests } from '../components'
import { newEntity } from '../../../table/state'
import { UserPermissionGroup } from '../../../user/state'
import { ErrorManager, errorSlice, newErrorState } from '../../../util/error/slice'
import { useNavigate } from 'react-router-dom'

jest.mock('react-router-dom', () => {
    const navigateCallbackMock = jest.fn()
    const useNavigateMock = jest.fn().mockReturnValue(navigateCallbackMock)
    return { useNavigate: useNavigateMock }
})
jest.mock('uuid', () => {
    return {
        v4: () => 'id-error-test'
    }
})

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: {
        entityMergeRequests: {
            entityMergeRequests: RemoteInterface<EntityMergeRequest[] | undefined>
        }
        error: ErrorManager
    }
}

export function renderWithProviders(
    ui: React.ReactElement,
    fetchMock: jest.Mock,
    {
        preloadedState = {
            entityMergeRequests: { entityMergeRequests: newRemote(undefined) },
            error: { errorList: [], errorMap: {} }
        },
        ...renderOptions
    }: ExtendedRenderOptions = {}
) {
    const store = configureStore({
        reducer: {
            entityMergeRequests: entityMergeRequestsReducer,
            error: errorSlice.reducer
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
const idEntityMr0 = 'id-entity-mr-0'
const displayTextOrigin0 = 'Entity Origin 0'
const idPersistentOrigin0 = 'id-entity-origin-0'
const versionOrigin0 = 5550
const displayTextDestination0 = 'Entity Destination 0'
const idPersistentDestination0 = 'id-entity-destination-0'
const versionDestination0 = 4440
const userName0 = 'user 0'
const idUser0 = 'user-id-0'
const permissionGroup0 = 'COMMISSIONER'
const idEntityMr1 = 'id-entity-mr-1'
const displayTextOrigin1 = 'Entity Origin 1'
const idPersistentOrigin1 = 'id-entity-origin-1'
const versionOrigin1 = 5551
const displayTextDestination1 = 'Entity Destination 1'
const idPersistentDestination1 = 'id-entity-destination-1'
const versionDestination1 = 4441
const userName1 = 'user 1'
const idUser1 = 'user-id-1'
const permissionGroup1 = 'EDITOR'

test('success', async () => {
    const fetchMock = jest.fn()
    addSuccessResponse(fetchMock)
    const { store } = renderWithProviders(<EntityMergeRequests />, fetchMock)
    await waitFor(() => {
        screen.getByText(displayTextOrigin0)
        screen.getByText(displayTextDestination0)
        screen.getByText(displayTextOrigin1)
        screen.getByText(displayTextDestination1)
    })
    expect(store.getState()).toEqual({
        error: { errorList: [], errorMap: {} },
        entityMergeRequests: {
            entityMergeRequests: newRemote([
                newEntityMergeRequest({
                    idPersistent: idEntityMr0,
                    entityOrigin: newEntity({
                        idPersistent: idPersistentOrigin0,
                        displayTxt: displayTextOrigin0,
                        version: versionOrigin0,
                        disabled: false
                    }),
                    entityDestination: newEntity({
                        idPersistent: idPersistentDestination0,
                        displayTxt: displayTextDestination0,
                        version: versionDestination0,
                        disabled: false
                    }),
                    createdBy: {
                        idPersistent: idUser0,
                        userName: userName0,
                        permissionGroup: 'Commissioner' as UserPermissionGroup
                    },
                    state: 'open' as EntityMergeRequestStep
                }),
                newEntityMergeRequest({
                    idPersistent: idEntityMr1,
                    entityOrigin: newEntity({
                        idPersistent: idPersistentOrigin1,
                        displayTxt: displayTextOrigin1,
                        version: versionOrigin1,
                        disabled: false
                    }),
                    entityDestination: newEntity({
                        idPersistent: idPersistentDestination1,
                        displayTxt: displayTextDestination1,
                        version: versionDestination1,
                        disabled: false
                    }),
                    createdBy: {
                        idPersistent: idUser1,
                        userName: userName1,
                        permissionGroup: 'Editor' as UserPermissionGroup
                    },
                    state: 'open' as EntityMergeRequestStep
                })
            ])
        }
    })
    expect(fetchMock.mock.calls).toEqual([
        [
            'http://127.0.0.1:8000/cosmae/api/merge_requests/entities',
            { credentials: 'include' }
        ]
    ])
})

test('navigate to conflicts', async () => {
    const fetchMock = jest.fn()
    addSuccessResponse(fetchMock)
    renderWithProviders(<EntityMergeRequests />, fetchMock)
    await waitFor(() => {
        screen.getByText(displayTextOrigin0).click()
        expect((useNavigate() as jest.Mock).mock.calls).toEqual([
            [`/review/entities/${idEntityMr0}`]
        ])
    })
})
test('error', async () => {
    const fetchMock = jest.fn()
    addResponseSequence(fetchMock, [[400, { msg: 'error' }]])
    const { store } = renderWithProviders(<EntityMergeRequests />, fetchMock)
    await waitFor(() => {
        expect(store.getState()).toEqual({
            entityMergeRequests: { entityMergeRequests: newRemote(undefined) },
            error: {
                errorList: [newErrorState('error', 'id-error-test')],
                errorMap: { 'id-error-test': 0 }
            }
        })
    })
    expect(fetchMock.mock.calls).toEqual([
        [
            'http://127.0.0.1:8000/cosmae/api/merge_requests/entities',
            { credentials: 'include' }
        ]
    ])
})
function addSuccessResponse(fetchMock: jest.Mock) {
    addResponseSequence(fetchMock, [
        [
            200,
            {
                entity_merge_requests: [
                    {
                        id_persistent: idEntityMr0,
                        origin: {
                            display_txt: displayTextOrigin0,
                            id_persistent: idPersistentOrigin0,
                            version: versionOrigin0,
                            disabled: false
                        },
                        destination: {
                            display_txt: displayTextDestination0,
                            id_persistent: idPersistentDestination0,
                            version: versionDestination0,
                            disabled: false
                        },
                        created_by: {
                            user_name: userName0,
                            id_persistent: idUser0,
                            permission_group: permissionGroup0
                        },
                        state: 'OPEN'
                    },
                    {
                        id_persistent: idEntityMr1,
                        origin: {
                            display_txt: displayTextOrigin1,
                            id_persistent: idPersistentOrigin1,
                            version: versionOrigin1,
                            disabled: false
                        },
                        destination: {
                            display_txt: displayTextDestination1,
                            id_persistent: idPersistentDestination1,
                            version: versionDestination1,
                            disabled: false
                        },
                        created_by: {
                            user_name: userName1,
                            id_persistent: idUser1,
                            permission_group: permissionGroup1
                        },
                        state: 'OPEN'
                    }
                ]
            }
        ]
    ])
}
