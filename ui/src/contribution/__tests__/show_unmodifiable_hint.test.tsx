/**
 * @vitest-environment jsdom
 */

import { vi } from 'vitest'
import { addResponseSequence } from '../../util/tests/response'
import {
    contributionValuesExtractedResponse,
    descriptionTest1,
    nameTest1
} from '../test_utils'
import { ContributionStepper } from '../components'
import { waitFor, screen } from '@testing-library/react'
import { renderWithProviders } from '../../util/tests/provider'

vi.mock('react-router-dom', () => {
    const loaderMock = vi.fn()
    loaderMock.mockReturnValue({
        idContributionPersistent: 'id-test-1',
        loaderData: ''
    })
    return { useLoaderData: loaderMock, useNavigate: vi.fn() }
})
test('Shows hint when step was completed', async () => {
    const fetchMock = vi.fn()
    addResponseSequence(fetchMock, [[200, contributionValuesExtractedResponse]])
    renderWithProviders(<ContributionStepper selectedIdx={1} />, fetchMock)
    await waitFor(() => {
        screen.getByText(
            'This step has already been completed and can not be changed anymore.'
        )
    })
})

test('Does not show hint for first step', async () => {
    const fetchMock = vi.fn()
    addResponseSequence(fetchMock, [[200, contributionValuesExtractedResponse]])
    renderWithProviders(<ContributionStepper selectedIdx={0} />, fetchMock)
    await waitFor(() => {
        const completedHint = screen.queryByText(
            'This step has already been completed and can not be changed anymore.'
        )
        expect(completedHint).toBeNull()
        screen.findByRole('textbox', { name: nameTest1 })
        screen.findByRole('textbox', { name: descriptionTest1 })
    })
})
