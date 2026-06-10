/**
 * @vitest-environment jsdom
 */

import { waitFor, screen } from '@testing-library/react'
import { ContributionStepper } from '../components'
import { vi } from 'vitest'
import { addResponseSequence, expectFetchCall } from '../../util/tests/response'
import { contributionEntitiesAssignedResponse } from '../test_utils'
import { renderWithProviders } from '../../util/tests/provider'

vi.mock('react-router-dom', () => {
    const mockNavigate = vi.fn()
    return {
        useNavigate: vi.fn().mockReturnValue(mockNavigate),
        useLoaderData: vi
            .fn()
            .mockReturnValue({ idContributionPersistent: 'id-test-1', stepData: '' })
    }
})
vi.mock('../../config', async () => {
    return { ...(await vi.importActual('../../config')), secondDelay: 100 }
})

test('reloads automatically', async () => {
    const fetchMock = vi.fn()
    addResponseSequence(fetchMock, [
        [200, { ...contributionEntitiesAssignedResponse }],
        [200, { ...contributionEntitiesAssignedResponse }],
        [200, { ...contributionEntitiesAssignedResponse, state: 'MERGED' }]
    ])
    renderWithProviders(
        <ContributionStepper selectedIdx={3}></ContributionStepper>,
        fetchMock
    )
    await waitFor(() => {
        screen.getByText(/not yet available/i)
    })
    await waitFor(
        async () => {
            expect(fetchMock.mock.calls.length).toEqual(3)
            for (let idx = 0; idx < 3; ++idx) {
                await expectFetchCall(fetchMock.mock.calls[idx], [
                    'http://127.0.0.1:8000/cosmae/api/contributions/id-test-1',
                    { credentials: 'include' }
                ])
            }
        },
        { timeout: 2000 }
    )
    await waitFor(() => {
        screen.getByRole('button', { name: 'Review Merge Requests' })
    })
})
