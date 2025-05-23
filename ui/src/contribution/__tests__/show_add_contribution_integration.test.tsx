/**
 * @vitest-environment jsdom
 */

import { waitFor, screen } from '@testing-library/react'
import {vi} from 'vitest'
import { addResponseSequence } from '../../util/tests/response'
import { renderWithProviders } from '../test_utils'
import { ContributionList } from '../components'
vi.mock('react-router-dom', () => {
    return { useNavigate: vi.fn() }
})

test('show modal', async () => {
    const fetchMock = vi.fn()
    addResponseSequence(fetchMock, [[200, { contributions: [] }]])
    const { store } = renderWithProviders(<ContributionList />, fetchMock)
    await waitFor(() => {
        const uploadButton = screen.getByRole('button', { name: 'Upload CSV' })
        uploadButton.click()
    })
    await waitFor(() => {
        screen.getByRole('form')
    })
    expect(store.getState().contribution.showAddContribution).toBeTruthy()
    const closeButton = screen.getByRole('button', { name: 'Close' })
    closeButton.click()
    await waitFor(() => {
        expect(screen.queryByRole('form')).toBeNull()
    })
    expect(store.getState().contribution.showAddContribution).toBeFalsy()
})
