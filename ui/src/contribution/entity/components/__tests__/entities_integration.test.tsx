/**
 * @vitest-environment jsdom
 */
vi.mock('@glideapps/glide-data-grid', () => ({
    __esmodule: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    DataEditor: vi.fn().mockImplementation((props: any) => <MockTable />)
}))
import { vi, Mock } from 'vitest'
import { RenderOptions, render, waitFor, screen } from '@testing-library/react'
import { ContributionEntityState, newContributionEntityState } from '../../state'
import { newRemote } from '../../../../util/state'
import { ContributionStep, newContribution } from '../../../state'
import { configureStore } from '@reduxjs/toolkit'
import { contributionEntitySlice } from '../../slice'
import {
    ContributionState,
    contributionSlice,
    newContributionState
} from '../../../slice'
import { PropsWithChildren } from 'react'
import { Provider } from 'react-redux'
import { EntitiesStep } from '../../components'
import {
    ColumnSelectionState,
    newColumnSelectionState
} from '../../../../column_menu/state'
import { columnSelectionReducer } from '../../../../column_menu/slice'
import {
    NotificationManager,
    notificationReducer
} from '../../../../util/notification/slice'

vi.mock('react-router-dom', () => {
    const loaderMock = vi.fn()
    loaderMock.mockReturnValue('id-contribution-test')
    return { useLoaderData: loaderMock, useNavigate: vi.fn() }
})
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
function MockTable(props: any) {
    return <div className="mock"></div>
}

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: {
        contributionEntity: ContributionEntityState
        contribution: ContributionState
        columnSelection: ColumnSelectionState
        notification: NotificationManager
    }
}

export function renderWithProviders(
    ui: React.ReactElement,
    fetchMock: Mock,
    {
        preloadedState = {
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
        ...renderOptions
    }: ExtendedRenderOptions = {}
) {
    const store = configureStore({
        reducer: {
            contributionEntity: contributionEntitySlice.reducer,
            contribution: contributionSlice.reducer,
            columnSelection: columnSelectionReducer,
            error: notificationReducer
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
        [200, { entity_list: entityList }],
        [200, { entity_list: [] }],
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
        [200, { column_list: [] }],
        [200, { matches: mkMatches(entityList.slice(0, 50)) }],
        [200, { value_responses: [] }],
        [200, { matches: mkMatches(entityList.slice(50)) }]
    ])
}
test('get duplicates', async () => {
    const fetchMock = vi.fn()
    initialResponses(fetchMock)
    const { container, store } = renderWithProviders(<EntitiesStep />, fetchMock)
    await waitFor(() => {
        screen.getByText('entity-1')
        expect(
            store.getState().contributionEntity.entities.value[0].similarEntities
                .isLoading
        ).toEqual(false)
    })
    await waitFor(() => {
        const entitySelectionElement = screen.getByText('entity-1')
        entitySelectionElement.click()
    })
    await waitFor(() => {
        const mockElements = container.getElementsByClassName('mock')
        expect(mockElements.length).toEqual(1)
        for (let idx = 0; idx < 60; ++idx) {
            expect(
                store.getState().contributionEntity.entities.value[idx].similarEntities
                    .value.length
            ).toEqual(2)
        }
        expect(
            store
                .getState()
                .contributionEntity.entities.value.filter(
                    (entity) => entity.similarEntities.isLoading == true
                ).length
        ).toEqual(0)
    })
})
test('select entity', async () => {
    const fetchMock = vi.fn()
    initialResponses(fetchMock)
    addResponseSequence(fetchMock, [])
    const { container, store } = renderWithProviders(<EntitiesStep />, fetchMock)
    await waitFor(() => {
        screen.getByText('Please select an entity')
    })
    await waitFor(() => {
        const entitySelectionElement = screen.getByText('entity-1')
        entitySelectionElement.click()
    })
    await waitFor(() => {
        const mockElements = container.getElementsByClassName('mock')
        expect(mockElements.length).toEqual(1)
    })
    expect(store.getState().contributionEntity.selectedEntityIdx).toEqual(1)
})
