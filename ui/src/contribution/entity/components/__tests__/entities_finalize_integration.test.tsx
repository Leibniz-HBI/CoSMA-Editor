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
import { newContributionState } from '../../../slice'
import { EntitiesStep } from '../../components'
import { newColumnSelectionState } from '../../../../column_menu/state'
import { NotificationType } from '../../../../util/notification/slice'
import { useNavigate } from 'react-router-dom'
import { ContributionStep, newContribution } from '../../../state'
import { newRemote } from '../../../../util/state'
import { emptyState, renderWithProviders } from '../../../../util/tests/provider'
import { addResponseSequence } from '../../../../util/tests/response'

vi.mock('react-router-dom', () => {
    const loaderMock = vi.fn()
    loaderMock.mockReturnValue('id-contribution-test')
    const navigateMock = vi.fn()
    return {
        useLoaderData: loaderMock,
        useNavigate: vi.fn().mockReturnValue(navigateMock)
    }
})
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
function MockTable(props: any) {
    return <div className="mock"></div>
}

beforeEach(() => {
    ;(useNavigate() as Mock).mockClear()
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

const idContribution = 'id-contribution-test'
const personList = Array.from({ length: 60 }, (_val, idx) => {
    return {
        display_txt: `entity-${idx}`,
        display_txt_details: 'display_txt_detail',
        version: 0,
        id_persistent: `id-entity-${idx}`
    }
})
const idColumn0 = 'id-column-test-0'
const nameColumn0 = 'column def 0'
function initialResponses(fetchMock: Mock) {
    addResponseSequence(fetchMock, [
        [200, { entity_list: personList, next_offset: 500 }],
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
        [200, { column_list: [] }],
        [200, { matches: mkMatches(personList.slice(0, 50)) }],
        [200, { matches: mkMatches(personList.slice(50)) }]
    ])
}

test('success', async () => {
    const fetchMock = vi.fn()
    initialResponses(fetchMock)
    addResponseSequence(fetchMock, [[200, {}]])
    addResponseSequence(fetchMock, [
        [
            200,
            {
                id_persistent: idContribution,
                name: 'contribution test',
                description: 'A contribution used in tests',
                has_header: true,
                author: 'author-test',
                state: 'ENTITIES_ASSIGNED'
            }
        ]
    ])
    const { store } = renderWithProviders(<EntitiesStep />, fetchMock, initialState)
    await waitFor(() => {
        expect(fetchMock.mock.calls.length).toEqual(6)
    })
    const button = screen.getByRole('button', { name: /Confirm Assigned Duplicates/i })
    button.click()
    await waitFor(() => {
        const notifications = store.getState().notification.notificationList
        expect(notifications.length).toEqual(1)
        const notification = notifications[0]
        expect(notification.type).toEqual(NotificationType.Success)
        expect(notification.msg).toEqual('Duplicates successfully assigned.')
    })
    await waitFor(() => {
        expect(store.getState().contribution.selectedContribution.value?.step).toEqual(
            ContributionStep.EntitiesAssigned
        )
    })
    expect(fetchMock.mock.calls.at(-2)).toEqual([
        `http://127.0.0.1:8000/cosmae/api/contributions/${idContribution}/entity_assignment_complete`,
        { method: 'POST', credentials: 'include' }
    ])
    expect(fetchMock.mock.calls.at(-1)).toEqual([
        `http://127.0.0.1:8000/cosmae/api/contributions/${idContribution}`,
        { credentials: 'include' }
    ])
    expect((useNavigate() as Mock).mock.calls).toEqual([
        [`/contribute/${idContribution}/complete`]
    ])
})

test('error', async () => {
    const fetchMock = vi.fn()
    initialResponses(fetchMock)
    const errorMsg = 'Could not finalize'
    addResponseSequence(fetchMock, [[500, { msg: errorMsg }]])
    const { store } = renderWithProviders(<EntitiesStep />, fetchMock, initialState)
    await waitFor(() => {
        expect(fetchMock.mock.calls.length).toEqual(6)
    })
    const completeButton = screen.getByRole('button', {
        name: /Confirm Assigned Duplicates/i
    })
    completeButton.click()
    await waitFor(() => {
        const notifications = store.getState().notification.notificationList
        expect(notifications.length).toEqual(1)
        const notification = notifications[0]
        expect(notification.type).toEqual(NotificationType.Error)
        expect(notification.msg).toEqual(errorMsg)
    })
    expect(fetchMock.mock.calls.at(-1)).toEqual([
        `http://127.0.0.1:8000/cosmae/api/contributions/${idContribution}/entity_assignment_complete`,
        { method: 'POST', credentials: 'include' }
    ])
    expect((useNavigate() as Mock).mock.calls).toEqual([])
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
