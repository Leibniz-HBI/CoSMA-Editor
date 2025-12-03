/**
 * @vitest-environment jsdom
 */

import { vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { newEntity, newEntityDetailsState } from '../state'
import { newTableState } from '../../table/state'
import { useEntity } from '../hooks'
import { newRemote } from '../../util/state'
import { mkUpUntilDateColumnId } from '../../util/misc'
import { emptyState, renderWithProviders } from '../../util/tests/provider'
import { addResponseSequence, expectFetchCallList } from '../../util/tests/response'

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
            ...emptyState,
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
                entity_map: {
                    [idEntity]: {
                        display_txt: displayTxt,
                        id_persistent: idEntity,
                        disabled: false,
                        version: 0,
                        display_txt_details: null,
                        justification_txt: null
                    }
                }
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
    await waitFor(async () => {
        const state = store.getState()
        expect(state.entityDetails).toEqual(
            newEntityDetailsState({
                entityByIdPersistentMap: { [idEntity]: newRemote(entity) }
            })
        )
    })
    await expectFetchCallList(fetchMock.mock.calls, [
        [
            'http://127.0.0.1:8000/cosmae/api/entities/details',
            {
                credentials: 'include',
                method: 'POST',
                body: { id_entity_persistent_list: [idEntity] }
            }
        ]
    ])
})
test('loads external entity with date', async () => {
    const fetchMock = vi.fn()
    const upUntilTime = new Date(2013, 5, 4)
    addResponseSequence(fetchMock, [
        [
            200,
            {
                entity_map: {
                    [idEntity]: {
                        display_txt: displayTxt,
                        id_persistent: idEntity,
                        disabled: false,
                        version: 0,
                        display_txt_details: null,
                        justification_txt: null
                    }
                }
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
    await waitFor(async () => {
        expect(store.getState().entityDetails).toEqual(
            newEntityDetailsState({
                entityByIdPersistentMap: {
                    [idEntity + '@' + upUntilTime.getTime().toString()]:
                        newRemote(entity)
                }
            })
        )
    })
    await expectFetchCallList(fetchMock.mock.calls, [
        [
            'http://127.0.0.1:8000/cosmae/api/entities/details',
            {
                credentials: 'include',
                method: 'POST',
                body: {
                    id_entity_persistent_list: [idEntity],
                    up_until_time: upUntilTime.toISOString()
                }
            }
        ]
    ])
})

const idEntity = '15188a39-abbf-4e84-9c1a-900cbca6168d',
    displayTxt = 'Display Text',
    entity = newEntity({
        idPersistent: idEntity,
        displayTxt: displayTxt,
        version: 0,
        disabled: false
    })
