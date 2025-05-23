/**
 * @vitest-environment jsdom
 */

import { waitFor } from '@testing-library/react'
import { NotificationType } from '../../util/notification/slice'
import { ContributionStepper } from '../components'
import { vi } from 'vitest'
import { renderWithProviders } from '../test_utils'
import { addResponseSequence } from '../../util/tests/response'

vi.mock('react-router-dom', () => {
    const loaderMock = vi.fn()
    loaderMock.mockReturnValue('id-contribution-test')
    return { useLoaderData: loaderMock, useNavigate: vi.fn() }
})
vi.mock('uuid', () => {
    return {
        v4: () => 'id-error-test'
    }
})

export const idContribution = 'id-contribution-test'
export const contributionColumnActiveRsp0 = {
    name: 'column definition contribution test active 0',
    id_persistent: 'id-active-0',
    index_in_file: 0,
    discard: false
}
export const contributionColumnActiveRsp1 = {
    name: 'column definition contribution test active 2',
    id_persistent: 'id-active-2',
    index_in_file: 2,
    discard: false
}
const errorMsg = 'Test Error'
const errorDetails = 'Description of a test error'
const authorTest = 'author test'
const contributionRsp = {
    name: 'contribution test',
    id_persistent: idContribution,
    description: 'a contribution for tests',
    step: 'COLUMNS_EXTRACTED',
    has_header: true,
    author: authorTest,
    error_msg: errorMsg,
    error_details: errorDetails
}
test('sets error', async () => {
    const fetchMock = vi.fn()
    addResponseSequence(fetchMock, [[200, contributionRsp]])
    const { store } = renderWithProviders(
        <ContributionStepper selectedIdx={0} />,
        fetchMock
    )
    const expectedMessage = `${errorMsg}\n${errorDetails}`
    await waitFor(() => {
        const state = store.getState()
        expect(state.notification).toEqual({
            notificationList: [
                {
                    id: 'id-error-test',
                    msg: expectedMessage,
                    type: NotificationType.Error
                }
            ],
            notificationMap: { 'id-error-test': 0 }
        })
    })
})
