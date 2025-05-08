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
import {
    ContributionEntityState,
    newContributionEntityState,
    newScoredEntity
} from '../../state'
import { newRemote } from '../../../../util/state'
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
import { TagSelectionState, newTagSelectionState } from '../../../../column_menu/state'
import { tagSelectionSlice } from '../../../../column_menu/slice'
import { ContributionStep, newContribution } from '../../../state'

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
        tagSelection: TagSelectionState
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
            tagSelection: newTagSelectionState({})
        },
        ...renderOptions
    }: ExtendedRenderOptions = {}
) {
    const store = configureStore({
        reducer: {
            contributionEntity: contributionEntitySlice.reducer,
            contribution: contributionSlice.reducer,
            tagSelection: tagSelectionSlice.reducer
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
const personList = Array.from({ length: 60 }, (_val, idx) => {
    return {
        display_txt: `entity-${idx}`,
        display_txt_details: 'display_txt_detail',
        version: 0,
        id_persistent: `id-entity-${idx}`
    }
})
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
                        similarity: idx / 100.0,
                        id_match_column_persistent_list: [],
                        entity: {
                            display_txt: entity.display_txt + ` match 0`,
                            display_txt_details: 'display_txt_detail',
                            id_persistent: entity.id_persistent + '-0',
                            version: 0
                        }
                    },
                    {
                        similarity: idx / 100.0 + 0.001,
                        id_match_column_persistent_list: [],
                        entity: {
                            display_txt: entity.display_txt + ` match 1`,
                            display_txt_details: 'display_txt_detail',
                            id_persistent: entity.id_persistent + '-1',
                            version: 0
                        }
                    }
                ],
                assignedDuplicate:
                    idx % 10 == 0
                        ? {
                              similarity: idx / 10,
                              id_match_column_persistent_list: [],
                              entity: {
                                  display_txt: entity.display_txt + ' match 1',
                                  display_txt_details: 'display_txt_detail',
                                  id_persistent: entity.id_persistent + '-1',
                                  version: 0
                              }
                          }
                        : undefined
            }
        ])
    )
}
const idTagDef0 = 'id-tag-test-0'
const nameTagDef0 = 'tag def 0'
const idTagDefContribution0 = 'id-tag-def-contribution-0'
const idTagDef1 = 'id-tag-test-1'
const nameTagDef1 = 'tag def 1'
function initialResponses(fetchMock: Mock) {
    addResponseSequence(fetchMock, [
        [200, { entity_list: personList }],
        [200, { entity_list: [] }],
        [
            200,
            {
                column_list: [
                    {
                        id_persistent: idTagDef0,
                        name_path: [nameTagDef0],
                        name: nameTagDef0,
                        curated: true,
                        version: 0,
                        type: 'STRING'
                    },
                    {
                        id_persistent: idTagDef1,
                        name_path: [nameTagDef1],
                        name: nameTagDef1,
                        curated: true,
                        version: 0,
                        type: 'STRING'
                    }
                ]
            }
        ],
        [200, { column_list: [] }],
        [200, { column_list: [] }],
        [200, { matches: mkMatches(personList.slice(0, 50)) }],
        [200, { matches: mkMatches(personList.slice(50)) }],
        // empty response because no match tags.
        [200, { value_responses: [] }]
    ])
}
test('add tag values', async () => {
    const fetchMock = vi.fn()
    initialResponses(fetchMock)
    addValueResponses(fetchMock, idTagDef0, '1')
    const { store } = renderWithProviders(<EntitiesStep />, fetchMock)
    await waitFor(() => {
        expect(fetchMock.mock.calls.length).toEqual(7)
        const entity0 = screen.getByText('entity-1')
        entity0.click()
    })
    await addTagDefinitionByName(nameTagDef0)
    checkTagValueCalls(fetchMock, idTagDef0)
    await waitFor(() => {
        expect(fetchMock.mock.calls.length).toEqual(10)
    })
    addValueResponses(fetchMock, idTagDef1, '2')
    await addTagDefinitionByName(nameTagDef1)
    // check calls for additional values
    await waitFor(() => {
        expect(fetchMock.mock.calls.length).toEqual(12)
    })
    checkTagValueCalls(fetchMock, idTagDef1)
    // check final values!
    await waitFor(() => {
        const state = store.getState()
        expect(
            state.contributionEntity.tagDefinitions.map((tag) => tag.idPersistent)
        ).toEqual([idTagDef0, idTagDef1])
    })
    await waitFor(() => {
        const state = store.getState().contributionEntity
        for (let idx = 0; idx < 50; ++idx) {
            const entity = state.entities.value[idx]
            expect(entity.cellContents).toEqual([
                newRemote([
                    {
                        isExisting: false,
                        isRequested: false,
                        value: 'val-1-' + idx,
                        idPersistent: 'id-val-1-' + idx,
                        version: idx
                    }
                ]),
                newRemote([
                    {
                        isExisting: false,
                        isRequested: false,
                        value: 'val-2-' + idx,
                        idPersistent: 'id-val-2-' + idx,
                        version: idx
                    }
                ])
            ])
            expect(entity.similarEntities).toEqual(
                newRemote([
                    newScoredEntity({
                        displayTxt: entity.displayTxt + ` match 0`,
                        displayTxtDetails: 'display_txt_detail',
                        idPersistent: entity.idPersistent + '-0',
                        version: 0,
                        similarity: idx / 100,
                        cellContents: [
                            newRemote([
                                {
                                    idPersistent: `id-val-1-0-${idx}`,
                                    isExisting: true,
                                    isRequested: false,
                                    value: `val-1-0-${idx}`,
                                    version: idx
                                }
                            ]),
                            newRemote([
                                {
                                    idPersistent: `id-val-2-0-${idx}`,
                                    isExisting: true,
                                    isRequested: false,
                                    value: `val-2-0-${idx}`,
                                    version: idx
                                }
                            ])
                        ]
                    }),
                    newScoredEntity({
                        displayTxt: entity.displayTxt + ` match 1`,
                        idPersistent: entity.idPersistent + '-1',
                        displayTxtDetails: 'display_txt_detail',
                        version: 0,
                        similarity: idx / 100 + 0.001,
                        cellContents: [
                            newRemote([
                                {
                                    idPersistent: `id-val-1-1-${idx}`,
                                    isExisting: true,
                                    isRequested: false,
                                    value: `val-1-1-${idx}`,
                                    version: idx
                                }
                            ]),
                            newRemote([
                                {
                                    idPersistent: `id-val-2-1-${idx}`,
                                    isExisting: true,
                                    isRequested: false,
                                    value: `val-2-1-${idx}`,
                                    version: idx
                                }
                            ])
                        ]
                    })
                ])
            )
        }
        for (let idx = 50; idx < 60; ++idx) {
            const entity = state.entities.value[idx]
            expect(entity.cellContents[0]).toEqual(newRemote([]))
            expect(entity.similarEntities).toEqual(
                newRemote([
                    newScoredEntity({
                        displayTxt: entity.displayTxt + ` match 0`,
                        displayTxtDetails: 'display_txt_detail',
                        idPersistent: entity.idPersistent + '-0',
                        version: 0,
                        similarity: (idx - 50) / 100.0,
                        idMatchTagDefinitionPersistentList: [],
                        cellContents: [newRemote([]), newRemote([])]
                    }),
                    newScoredEntity({
                        displayTxt: entity.displayTxt + ` match 1`,
                        displayTxtDetails: 'display_txt_detail',
                        idPersistent: entity.idPersistent + '-1',
                        version: 0,
                        similarity: (idx - 50) / 100.0 + 0.001,
                        idMatchTagDefinitionPersistentList: [],
                        cellContents: [newRemote([]), newRemote([])]
                    })
                ])
            )
        }
    })
})
test('remove values', async () => {
    const fetchMock = vi.fn()
    initialResponses(fetchMock)
    addValueResponses(fetchMock, idTagDef0, '1')
    const { store } = renderWithProviders(<EntitiesStep />, fetchMock)
    await waitFor(() => {
        expect(fetchMock.mock.calls.length).toEqual(7)
        const entity0 = screen.getByText('entity-0')
        entity0.click()
    })
    await addTagDefinitionByName(nameTagDef0)
    await waitFor(() => {
        const state = store.getState()
        expect(state.contributionEntity.tagDefinitions.length).toEqual(1)
    })
    await addTagDefinitionByName(nameTagDef0)
    await waitFor(
        () => {
            const state = store.getState()
            expect(state.contributionEntity.tagDefinitions.length).toEqual(0)
            expect(state.contributionEntity.tagDefinitionMap).toEqual({})
            for (const entity of state.contributionEntity.entities.value) {
                expect(entity.cellContents.length).toEqual(0)
                for (const match of entity.similarEntities.value) {
                    expect(match.cellContents.length).toEqual(0)
                }
            }
        },
        { timeout: 3000 }
    )
})

function addValueResponses(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetchMock: Mock<any, any>,
    idTagDef: string,
    suffix: string
) {
    addResponseSequence(fetchMock, [
        [
            200,
            {
                value_responses: personList.slice(0, 50).flatMap((entity, idx) => [
                    // contributed instance
                    {
                        id_entity_persistent: entity.id_persistent,
                        id_column: idTagDefContribution0,
                        id_column_requested_persistent: idTagDef,
                        is_existing: false,
                        version: idx,
                        value: `val-${suffix}-` + idx,
                        id_persistent: `id-val-${suffix}-` + idx
                    },
                    //existing instance for first match
                    {
                        id_entity_persistent: entity.id_persistent + '-0',
                        id_column_requested_persistent: idTagDef,
                        id_column: idTagDef,
                        is_existing: true,
                        version: idx,
                        value: `val-${suffix}-0-` + idx,
                        id_persistent: `id-val-${suffix}-0-` + idx
                    },
                    // existing instance for second match
                    {
                        id_entity_persistent: entity.id_persistent + '-1',
                        id_column: idTagDef,
                        id_column_requested_persistent: idTagDef,
                        is_existing: true,
                        version: idx,
                        value: `val-${suffix}-1-` + idx,
                        id_persistent: `id-val-${suffix}-1-` + idx
                    }
                ])
            }
        ],
        // no further values
        [200, { value_responses: [] }]
    ])
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function checkTagValueCalls(fetchMock: Mock<any, any>, idTagDef: string) {
    expect(fetchMock.mock.calls.at(-2)).toEqual([
        'http://127.0.0.1:8000/cosmae/api/values/entities',
        {
            credentials: 'include',
            method: 'POST',
            body: JSON.stringify({
                id_column_persistent_list: [idTagDef],
                id_entity_persistent_list: personList
                    .slice(0, 50)
                    .flatMap((entity) => [
                        entity.id_persistent,
                        entity.id_persistent + '-0',
                        entity.id_persistent + '-1'
                    ]),
                id_contribution_persistent: idContribution
            })
        }
    ])
    expect(fetchMock.mock.calls.at(-1)).toEqual([
        'http://127.0.0.1:8000/cosmae/api/values/entities',
        {
            credentials: 'include',
            method: 'POST',
            body: JSON.stringify({
                id_column_persistent_list: [idTagDef],
                id_entity_persistent_list: personList
                    .slice(50)
                    .flatMap((entity) => [
                        entity.id_persistent,
                        entity.id_persistent + '-0',
                        entity.id_persistent + '-1'
                    ]),
                id_contribution_persistent: idContribution
            })
        }
    ])
}

async function addTagDefinitionByName(nameTagDef: string) {
    await waitFor(() => {
        const additionalTagButtons = screen.getByRole('button', {
            name: /show additional tag values/i
        })
        additionalTagButtons.click()
    })
    let tagDefLabel: HTMLElement | undefined
    await waitFor(() => {
        tagDefLabel = screen.getByText(nameTagDef)
    })
    const tagListItem =
        tagDefLabel?.parentElement?.parentElement?.parentElement?.parentElement
            ?.parentElement
    const tagButton = tagListItem?.children[1]
    expect(tagButton?.className).toEqual('icon')
    ;(tagButton as HTMLElement)?.click()

    screen.getByRole('button', { name: /close/i }).click()
}
