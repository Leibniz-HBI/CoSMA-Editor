/**
 * @vitest-environment jsdom
 */
import { addResponseSequence, expectFetchCallList } from '../../../util/tests/response'
import { ContributionDetailsStep } from '../components'
import { renderWithProviders } from '../../../util/tests/provider'
import { screen, waitFor } from '@testing-library/react'
import { contribution1, descriptionTest0, idSessionTest0, idTest0, nameTest0, preloadedState } from '../test_utils'
import { Mock, vi } from 'vitest'
import { useNavigate } from 'react-router-dom'

vi.mock('react-router-dom', () => {
    const mockNavigate = vi.fn()
    return {
        useNavigate: vi.fn().mockReturnValue(mockNavigate),
        useLoaderData: vi
            .fn()
            .mockReturnValue({ idContributionPersistent: 'id-test-0', stepData: '' })
    }
})

beforeEach(() => {
    vi.clearAllMocks()
})

test('success', async () => {
    const fetchMock = vi.fn()
    addResponseSequence(fetchMock, [
        [
            200,
            {
                name: nameTest0,
                id_persistent: idTest0,
                description: descriptionTest0,
                author: 'author_test',
                step: 'UPLOADED',
                empty_values: '',
                id_edit_session_persistent: idSessionTest0,
                mark_delete: true
            }
        ]
    ])
    const {store} = renderWithProviders(<ContributionDetailsStep />, fetchMock, { preloadedState })
    const nameInput = screen.getByRole('textbox', { name: /name/i })
    expect((nameInput as HTMLInputElement).value).toEqual(nameTest0)
    const deleteButton = screen.getByRole('button', { name: /delete/i })
    deleteButton.click()
    const confirmButton = await waitFor(async () => {
        screen.getByText('Are you sure you want to delete this contribution?')
        return screen.getByRole('button', { name: /confirm deletion/i })
    })
    confirmButton.click()
    const navigateButton = await waitFor(() => {
        const state = store.getState()
        expect(state.contribution.selectedContribution.value?.markedForDeletion).toBeTruthy()
        expect(state.contribution.contributions.value).toEqual([contribution1])
        expect(state.notification.notificationList).toEqual([{
            id: expect.any(String),
            type: 'success',
            msg: 'Contribution deleted successfully.'
        }])
        return screen.getByRole('button', { name: /go to contribution list/i })

    })
    navigateButton.click()
    await waitFor(() => {
        expect((useNavigate() as Mock).mock.calls[0][0]).toEqual('/contribute')
    })
    await expectFetchCallList(fetchMock.mock.calls, [
        [
            `http://127.0.0.1:8000/cosmae/api/contributions/${idTest0}`,
            {
                method: 'PATCH',
                body: {
                    mark_delete: true
                }
            }
        ]
    ])
})
