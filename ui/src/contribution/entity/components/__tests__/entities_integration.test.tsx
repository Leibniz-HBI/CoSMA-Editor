/**
 * @vitest-environment jsdom
 */
vi.mock('@glideapps/glide-data-grid', () => ({
    __esmodule: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    DataEditor: vi.fn().mockImplementation((props: any) => <MockTable />)
}))
import { vi, Mock } from 'vitest'
import { waitFor, screen } from '@testing-library/react'
import { newContributionEntityState } from '../../state'
import { newRemote } from '../../../../util/state'
import { ContributionStep, newContribution } from '../../../state'
import { newContributionState } from '../../../slice'
import { EntitiesStep } from '../../components'
import { emptyState, renderWithProviders } from '../../../../util/tests/provider'
import { newColumnSelectionState } from '../../../../column_menu/state'
import { addResponseSequence } from '../../../../util/tests/response'
import { act } from 'react'
import userEvent from '@testing-library/user-event'

vi.mock('react-router-dom', () => {
    const loaderMock = vi.fn()
    loaderMock.mockReturnValue({
        idContributionPersistent: 'id-contribution-test',
        stepData: ''
    })
    return { useLoaderData: loaderMock, useNavigate: vi.fn() }
})
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
function MockTable(props: any) {
    return <div className="mock"></div>
}

const idContribution = 'id-contribution-test'
const entityList = Array.from({ length: 60 }, (_val, idx) => {
    return {
        display_txt: `entity-${idx}`,
        display_txt_details: 'display_txt_detail',
        version: 0,
        id_persistent: `id-entity-${idx}`
    }
})
const idColumn0 = 'id-column-test-0'
const nameColumn0 = 'column def 0'

function mkMatches(
    entities: {
        id_persistent: string
        display_txt: string
        version: number
    }[]
) {
    return Object.fromEntries(
        entities.map((entity, idx) => [
            entity.id_persistent,
            {
                matches: [
                    {
                        similarity: idx / 100,
                        entity: {
                            display_txt: entity.display_txt + ` match 0`,
                            display_txt_details: 'display_txt_detail',
                            id_persistent: entity.id_persistent + '-0',
                            version: 0
                        }
                    },
                    {
                        similarity: idx / 100 + 0.01,
                        entity: {
                            display_txt: entity.display_txt + ` match  1`,
                            display_txt_details: 'display_txt_detail',
                            id_persistent: entity.id_persistent + '-1',
                            version: 0
                        }
                    }
                ],
                assignedDuplicate:
                    idx % 10 == 0
                        ? {
                              display_txt: entity.display_txt + ' match 1',
                              display_txt_details: 'display_txt_detail',
                              id_persistent: entity.id_persistent + '-1',
                              version: 0
                          }
                        : undefined
            }
        ])
    )
}
function initialResponses(fetchMock: Mock) {
    addResponseSequence(fetchMock, [
        [200, { entity_list: entityList, next_offset: 500 }],
        [200, { entity_list: [], next_offset: -1 }],
        [
            200,
            {
                column_list: [
                    {
                        id_persistent: idColumn0,
                        name_path: [nameColumn0],
                        name: nameColumn0,
                        curated: true,
                        version: 0,
                        type: 'STRING'
                    }
                ]
            }
        ],
        [200, { matches: mkMatches(entityList.slice(0, 4)) }],
        [200, { column_list: [] }],
        [200, { matches: mkMatches(entityList.slice(4, 12)) }],
        [200, { matches: mkMatches(entityList.slice(12, 28)) }],
        [200, { matches: mkMatches(entityList.slice(28, 60)) }],
        [200, { value_responses: [] }]
    ])
}
test('get duplicates', async () => {
    const fetchMock = vi.fn()
    initialResponses(fetchMock)
    const { container, store } = renderWithProviders(
        <EntitiesStep />,
        fetchMock,
        initialState
    )
    const entitySelectionElement = await waitFor(() => {
        expect(fetchMock.mock.calls).toHaveLength(8)
        const entitySelection = screen.getByText('entity-1')
        expect(
            store.getState().contributionEntity.entities.value?.at(0)?.similarEntities
                .isLoading
        ).toEqual(false)
        return entitySelection
    })
    const user = userEvent.setup()
    await act(async () => {
        await user.click(entitySelectionElement)
    })
    await waitFor(() => {
        const mockElements = container.getElementsByClassName('mock')
        expect(mockElements.length).toEqual(1)
        for (let idx = 0; idx < 60; ++idx) {
            expect(
                store.getState().contributionEntity.entities.value?.at(idx)
                    ?.similarEntities.value.length
            ).toEqual(2)
        }
        expect(
            store
                .getState()
                .contributionEntity.entities.value?.filter(
                    (entity) => entity.similarEntities.isLoading == true
                ).length
        ).toEqual(0)
    })
})
test('select entity', async () => {
    const fetchMock = vi.fn()
    initialResponses(fetchMock)
    const { container, store } = renderWithProviders(
        <EntitiesStep />,
        fetchMock,
        initialState
    )
    await waitFor(() => {
        screen.getByText('Please select an entity')
        expect(fetchMock.mock.calls).toHaveLength(8)
    })
    const entitySelectionElement = await waitFor(() => {
        expect(
            store.getState().contributionEntity.entities.value?.at(0)?.similarEntities
                .isLoading
        ).toEqual(false)
        return screen.getByRole('button', { name: 'entity-2' })
    })
    entitySelectionElement.click()
    const user = userEvent.setup()
    await act(async () => {
        await user.click(entitySelectionElement)
    })
    await waitFor(
        () => {
            expect(store.getState().contributionEntity.selectedEntityIdx).toEqual(2)
            const mockElements = container.getElementsByClassName('mock')
            expect(mockElements.length).toEqual(1)
        },
        { timeout: 3000 }
    )
})

const preloadedState = {
        ...emptyState,
        contributionEntity: newContributionEntityState({}),
        contribution: newContributionState({
            selectedContribution: newRemote(
                newContribution({
                    idPersistent: idContribution,
                    name: 'contribution test',
                    description: 'A contribution used in tests',
                    hasHeader: true,
                    step: ContributionStep.ValuesExtracted,
                    emptyValues: 'null,na',
                    author: 'author-test'
                })
            )
        }),
        columnSelection: newColumnSelectionState({}),
        notification: { notificationList: [], notificationMap: {} }
    },
    initialState = { preloadedState }
