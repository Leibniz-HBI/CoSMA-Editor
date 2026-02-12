/**
 * @vitest-environment jsdom
 */

import { waitFor, screen } from '@testing-library/react'
import { NotificationType, newNotification } from '../../../util/notification/slice'
import { PreviewConnector } from '../components'
import { useNavigate } from 'react-router-dom'
import { newColumnDefinitionsContributionState, newValuePreview } from '../state'
import { newRemote } from '../../../util/state'
import { vi, Mock } from 'vitest'
import { addResponseSequence, expectFetchCallList } from '../../../util/tests/response'
import { renderWithProviders } from '../../../util/tests/provider'

vi.mock('react-router-dom', () => {
    const navigateMock = vi.fn()
    return { useNavigate: vi.fn().mockReturnValue(navigateMock) }
})

beforeEach(() => {
    ;(useNavigate() as Mock).mockRestore()
})

const idContributionPersistent = 'id-contribution'
const idColumnPersistent = 'id-column'
const idDestinationPersistent = 'id-destination'

test('get preview success', async () => {
    const contributionValue = 'value'
    const contributionValue1 = 'value 1'
    const destinationValue = 'value destination'
    const destinationValue1 = 'value destination1'
    const destinationValue2 = 'value destination2'
    const fetchMock = vi.fn()
    addResponseSequence(fetchMock, [
        [
            200,
            {
                contribution_values: [contributionValue, contributionValue1],
                destination_values: [
                    destinationValue,
                    destinationValue1,
                    destinationValue2
                ]
            }
        ]
    ])
    const { store } = renderWithProviders(
        <PreviewConnector
            idContributionPersistent={idContributionPersistent}
            idColumnPersistent={idColumnPersistent}
            idExistingPersistent={idDestinationPersistent}
        />,
        fetchMock
    )
    await waitFor(() => {
        screen.getByText(contributionValue)
        screen.getByText(contributionValue1)
        screen.getByText(destinationValue)
        screen.getByText(destinationValue1)
        screen.getByText(destinationValue2)
    })
    expectFetchCallList(fetchMock.mock.calls, [
        [
            'http://127.0.0.1:8000/cosmae/api/contributions/' +
                `${idContributionPersistent}/preview/${idColumnPersistent}`,
            { credentials: 'include' }
        ]
    ])
    expect(store.getState().contributionColumnDefinition).toEqual(
        newColumnDefinitionsContributionState({
            preview: newRemote(
                newValuePreview(
                    [contributionValue, contributionValue1],
                    [destinationValue, destinationValue1, destinationValue2]
                )
            )
        })
    )
})

test('get preview error', async () => {
    const testError = 'Could not get preview'
    const fetchMock = vi.fn()
    addResponseSequence(fetchMock, [
        [
            500,
            {
                msg: testError
            }
        ]
    ])
    const { store } = renderWithProviders(
        <PreviewConnector
            idContributionPersistent={idContributionPersistent}
            idColumnPersistent={idColumnPersistent}
            idExistingPersistent={idDestinationPersistent}
        />,
        fetchMock
    )
    await waitFor(() => {
        const state = store.getState()
        expect(state.contributionColumnDefinition).toEqual(
            newColumnDefinitionsContributionState({})
        )
        expect(state.notification.notificationList).toEqual([
            newNotification({
                type: NotificationType.Error,
                msg: testError,
                id: expect.anything()
            })
        ])
    })
})
