/**
 * @jest-environment jsdom
 */
jest.mock('@glideapps/glide-data-grid', () => ({
    __esmodule: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    DataEditor: jest.fn().mockImplementation((props: any) => <MockTable />)
}))
import { RenderOptions, render, waitFor, screen } from '@testing-library/react'
import { ContributionEntityState, newContributionEntityState } from '../state'
import { configureStore } from '@reduxjs/toolkit'
import { contributionEntitySlice } from '../slice'
import { ContributionState, contributionSlice, newContributionState } from '../../slice'
import { PropsWithChildren } from 'react'
import { Provider } from 'react-redux'
import { EntitiesStep } from '../components'
import { TagSelectionState, newTagSelectionState } from '../../../column_menu/state'
import { tagSelectionSlice } from '../../../column_menu/slice'
import {
    NotificationManager,
    NotificationType,
    notificationReducer
} from '../../../util/notification/slice'

jest.mock('react-router-dom', () => {
    const loaderMock = jest.fn()
    loaderMock.mockReturnValue('id-contribution-test')
    return { useLoaderData: loaderMock, useNavigate: jest.fn() }
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
        notification: NotificationManager
    }
}

export function renderWithProviders(
    ui: React.ReactElement,
    fetchMock: jest.Mock,
    {
        preloadedState = {
            contributionEntity: newContributionEntityState({}),
            contribution: newContributionState({}),
            tagSelection: newTagSelectionState({}),
            notification: { notificationList: [], notificationMap: {} }
        },
        ...renderOptions
    }: ExtendedRenderOptions = {}
) {
    const store = configureStore({
        reducer: {
            contributionEntity: contributionEntitySlice.reducer,
            contribution: contributionSlice.reducer,
            tagSelection: tagSelectionSlice.reducer,
            notification: notificationReducer
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
const contributionTest = {
    id_persistent: idContribution,
    name: 'contribution test',
    description: 'A contribution used in tests',
    has_header: true,
    state: 'VALUES_EXTRACTED',
    author: 'author-test'
}
const personList = Array.from({ length: 60 }, (_val, idx) => {
    return {
        display_txt: `entity-${idx}`,
        display_txt_details: 'display_txt_detail',
        version: 0,
        id_persistent: `id-entity-${idx}`
    }
})
const idTagDef0 = 'id-tag-test-0'
const nameTagDef0 = 'tag def 0'
function initialResponses(fetchMock: jest.Mock) {
    addResponseSequence(fetchMock, [
        [200, { contributionTest }],
        [200, { persons: personList }],
        [200, { persons: [] }],
        [
            200,
            {
                tag_definitions: [
                    {
                        id_persistent: idTagDef0,
                        name_path: [nameTagDef0],
                        name: nameTagDef0,
                        curated: true,
                        version: 0,
                        type: 'STRING'
                    }
                ]
            }
        ],
        [200, { tag_definitions: [] }],
        [200, { matches: mkMatches(personList.slice(0, 50)) }],
        [200, { matches: mkMatches(personList.slice(50)) }]
    ])
}

test('success', async () => {
    const fetchMock = jest.fn()
    initialResponses(fetchMock)
    addResponseSequence(fetchMock, [[200, {}]])
    const { store } = renderWithProviders(<EntitiesStep />, fetchMock)
    await waitFor(() => {
        expect(fetchMock.mock.calls.length).toEqual(7)
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
    expect(fetchMock.mock.calls.at(-1)).toEqual([
        `http://127.0.0.1:8000/cosmae/api/contributions/${idContribution}/entity_assignment_complete`,
        { method: 'POST', credentials: 'include' }
    ])
})

test('error', async () => {
    const fetchMock = jest.fn()
    initialResponses(fetchMock)
    const errorMsg = 'Could not finalize'
    addResponseSequence(fetchMock, [[500, { msg: errorMsg }]])
    const { store } = renderWithProviders(<EntitiesStep />, fetchMock)
    await waitFor(() => {
        expect(fetchMock.mock.calls.length).toEqual(7)
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
})
