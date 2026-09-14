/**
 * @vitest-environment jsdom
 */
import { vi, Mock } from 'vitest'
import { waitFor, screen} from '@testing-library/react'
import { CloseButton} from '../components'
import {
    addResponseSequence,
    expectFetchCallList
} from '../../../../util/tests/response'
import { renderWithProviders } from '../../../../util/tests/provider'
import { useNavigate } from 'react-router-dom'

vi.mock('react-router-dom', () => {
    const navigateCallbackMock = vi.fn()
    const useNavigateMock = vi.fn().mockReturnValue(navigateCallbackMock)
    return { useNavigate: useNavigateMock }
})
vi.mock('react-router-dom', () => {
    const useNavigateMock = vi.fn()
    const navigateMock = vi.fn()
    useNavigateMock.mockReturnValue(navigateMock)
    return { useNavigate: useNavigateMock }
})
const idTest = 'id-entity-merge-request-test'
describe('CloseButton', () => {
    it('should call the close endpoint when clicked', async () => {
        const fetchMock = vi.fn()
        addResponseSequence(fetchMock, [[200, {}]])
        const { store } = renderWithProviders(
            <CloseButton idMergeRequestPersistent={idTest} />,
            fetchMock
        )
        const button = await waitFor(() =>
            screen.getByRole('button', { name: /close/i })
        )
        button.click()
        await waitFor(() => {
            expect(store.getState().notification.notificationList).toEqual([
                {
                    msg: 'Merge request closed.',
                    type: 'success',
                    id: expect.any(String)
                }
            ])
        })
        expect(useNavigate() as Mock).toHaveBeenCalledWith('/review')
        await expectFetchCallList(fetchMock.mock.calls, [
            [
                'http://127.0.0.1:8000/cosmae/api/merge_requests/entities/' + idTest,
                { method: 'PATCH', body: { state: 'CLOSED' } }
            ]
        ])
    })
})
