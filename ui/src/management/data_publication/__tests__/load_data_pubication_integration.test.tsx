/**
 * @vitest-environment jsdom
 */

import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../util/tests/provider'
import { DataPublicationList } from '../components'
import { DataPublicationStep, newDataPublicationMetadata } from '../state'
import { addResponseSequence, expectFetchCallList } from '../../../util/tests/response'
import { newRemote } from '../../../util/state'
import { newNotification, NotificationType } from '../../../util/notification/slice'

test('success', async () => {
    const fetchMock = vi.fn()
    addResponseSequence(fetchMock, [[200, apiResponseSuccess]])
    const { store } = renderWithProviders(<DataPublicationList />, fetchMock)
    await waitFor(() => {
        screen.getByText(namePublication0)
        screen.getByText(namePublication1)
    })
    const state = store.getState()
    expect(state.dataPublication.metaDataList).toEqual(
        newRemote([
            newDataPublicationMetadata({
                name: namePublication0,
                idPersistent: idPersistent0,
                step: step0 as DataPublicationStep,
                startDateString: startDateString0,
                endDateString: endDateString0,
                isWorking: false
            }),
            newDataPublicationMetadata({
                name: namePublication1,
                idPersistent: idPersistent1,
                step: step1 as DataPublicationStep,
                startDateString: startDateString1,
                endDateString: endDateString1,
                isWorking: false
            })
        ])
    )
    expect(state.notification.notificationList).toHaveLength(0)
    await expectFetchCallList(fetchMock.mock.calls, [
        ['http://127.0.0.1:8000/cosmae/api/manage/data_publication', { method: 'GET' }]
    ])
})

test('error', async () => {
    const fetchMock = vi.fn()
    const msg = 'Could not load data publication metadata list'
    addResponseSequence(fetchMock, [[500, { msg }]])
    const { store } = renderWithProviders(<DataPublicationList />, fetchMock)
    await waitFor(() => {
        expect(store.getState().notification.notificationList).toEqual([
            newNotification({
                id: expect.anything(),
                msg,
                type: NotificationType.Error
            })
        ])
    })
    expect(screen.queryByText(namePublication0)).toBeNull()
    expect(screen.queryByText(namePublication1)).toBeNull()
    expect(store.getState().dataPublication.metaDataList).toEqual(
        newRemote([])
    )
})

const namePublication0 = 'Publication Zero'
const idPersistent0 = 'pub-000'
const step0 = 'Completed'
const startDateString0 = '2023-01-01T00:00:00.000Z'
const endDateString0 = '2023-06-01T00:00:00.000Z'

const namePublication1 = 'Publication One'
const idPersistent1 = 'pub-001'
const step1 = 'Curated'
const startDateString1 = '2023-02-01T00:00:00.000Z'
const endDateString1 = '2023-07-01T00:00:00.000Z'

const apiResponseSuccess = {
    metadata_list: [
        {
            name: namePublication0,
            id_persistent: idPersistent0,
            step: step0,
            start_time: startDateString0,
            end_time: endDateString0,
            error: null,
            error_details: null,
            is_working: false
        },
        {
            name: namePublication1,
            id_persistent: idPersistent1,
            step: step1,
            start_time: startDateString1,
            end_time: endDateString1,
            error: null,
            error_details: null,
            is_working: false
        }
    ]
}
