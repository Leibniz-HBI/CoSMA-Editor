/**
 * @vitest-environment jsdom
 */

import { vi, Mock } from 'vitest'
import { RenderOptions, render, screen, waitFor } from '@testing-library/react'
import { EntityDetailsState, newEntity, newEntityDetailsState } from '../state'
import { newTableState, TableState } from '../../table/state'
import { configureStore } from '@reduxjs/toolkit'
import { entityDetailsReducer } from '../slice'
import { tableReducer } from '../../table/slice'
import { PropsWithChildren } from 'react'
import { Provider } from 'react-redux'
import { useEntity } from '../hooks'
import { newRemote } from '../../util/state'
import { mkUpUntilDateColumnId } from '../../util/misc'

function TestComponent({
    idEntity,
    upUntilTime = undefined
}: {
    idEntity: string
    upUntilTime?: Date | undefined
}) {
    const entity = useEntity(idEntity, upUntilTime)
    return <div>{entity.value?.displayTxt}</div>
}

test('uses entity from details state', async () => {
    const fetchMock = vi.fn()
    renderWithProviders(<TestComponent idEntity={idEntity} />, fetchMock, {
        preloadedState: {
            table: newTableState({}),
            entityDetails: newEntityDetailsState({
                entityByIdPersistentMap: {
                    [mkUpUntilDateColumnId(idEntity, undefined)]: newRemote(entity)
                }
            })
        }
    })
    await waitFor(() => {
        screen.getByText(displayTxt)
    })
    await waitFor(() => {
        expect(fetchMock.mock.calls).toEqual([])
    })
})
test('loads external entity', async () => {
    const fetchMock = vi.fn()
    addResponseSequence(fetchMock, [
        [
            200,
            {
                display_txt: displayTxt,
                id_persistent: idEntity,
                disabled: false,
                version: 0,
                display_txt_details: null,
                justification_txt: null
            }
        ]
    ])
    const { store } = renderWithProviders(
        <TestComponent idEntity={idEntity} />,
        fetchMock
    )
    await waitFor(() => {
        screen.getByText(displayTxt)
    })
    expect(store.getState()).toEqual({
        table: newTableState({}),
        entityDetails: newEntityDetailsState({
            entityByIdPersistentMap: { [idEntity]: newRemote(entity) }
        })
    })
    await waitFor(() => {
        expect(fetchMock.mock.calls).toEqual([
            [
                `http://127.0.0.1:8000/cosmae/api/entities?id_persistent=${idEntity}`,
                { credentials: 'include' }
            ]
        ])
    })
})
test('loads external entity with date', async () => {
    const fetchMock = vi.fn()
    const upUntilTime = new Date(2013, 5, 4)
    addResponseSequence(fetchMock, [
        [
            200,
            {
                display_txt: displayTxt,
                id_persistent: idEntity,
                disabled: false,
                version: 0,
                display_txt_details: null,
                justification_txt: null
            }
        ]
    ])
    const { store } = renderWithProviders(
        <TestComponent idEntity={idEntity} upUntilTime={upUntilTime} />,
        fetchMock
    )
    await waitFor(() => {
        screen.getByText(displayTxt)
    })
    expect(store.getState()).toEqual({
        table: newTableState({}),
        entityDetails: newEntityDetailsState({
            entityByIdPersistentMap: {
                [idEntity + '@' + upUntilTime.getTime().toString()]: newRemote(entity)
            }
        })
    })
    await waitFor(() => {
        expect(fetchMock.mock.calls).toEqual([
            [
                `http://127.0.0.1:8000/cosmae/api/entities?id_persistent=${idEntity}&up_until_time=${encodeURIComponent(
                    upUntilTime.toISOString()
                )}`,
                { credentials: 'include' }
            ]
        ])
    })
})

const idEntity = '15188a39-abbf-4e84-9c1a-900cbca6168d',
    displayTxt = 'Display Text',
    entity = newEntity({
        idPersistent: idEntity,
        displayTxt: displayTxt,
        version: 0,
        disabled: false
    })

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: {
        table: TableState
        entityDetails: EntityDetailsState
    }
}

export function renderWithProviders(
    ui: React.ReactElement,
    fetchMock: Mock,
    {
        preloadedState = {
            entityDetails: newEntityDetailsState({}),
            table: newTableState({})
        },
        ...renderOptions
    }: ExtendedRenderOptions = {}
) {
    const store = configureStore({
        reducer: {
            entityDetails: entityDetailsReducer,
            table: tableReducer
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
            vi.fn(async () => {
                await new Promise((promise) => setTimeout(promise, 50))
                return {
                    status: status_code,
                    json: () => Promise.resolve(rsp)
                }
            }) as Mock
        )
    }
}
