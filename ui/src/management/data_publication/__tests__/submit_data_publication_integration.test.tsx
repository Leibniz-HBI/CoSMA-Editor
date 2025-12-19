/**
 * @vitest-environment jsdom
 */

import { addResponseSequence, expectFetchCallList } from '../../../util/tests/response'
import { setDate } from '../../../util/tests/setDate'
import { DataPublicationForm } from '../components'
import userEvent, { UserEvent } from '@testing-library/user-event'
import { screen, waitFor } from '@testing-library/react'
import { act } from 'react'
import { renderWithProviders } from '../../../util/tests/provider'
import { newRemote } from '../../../util/state'
import { DataPublicationStep, newDataPublicationMetadata } from '../state'
import { Mock } from 'vitest'

describe('success', () => {
    test('full input', async () => {
        const fetchMock = vi.fn()
        addResponseSequence(fetchMock, [[200, apiResponseSuccess]])
        const { store } = renderWithProviders(<DataPublicationForm />, fetchMock)
        const user = userEvent.setup()
        await submitDataPublicationForm(user, name)
        await waitFor(() => {
            expect(store.getState().dataPublication.metaDataList).toEqual(
                newRemote([
                    newDataPublicationMetadata({
                        name,
                        idPersistent,
                        step: step as DataPublicationStep,
                        startDateString: startDate.toISOString(),
                        endDateString: endDate.toISOString(),
                        isWorking: false
                    })
                ])
            )
        })
        await expectCall(fetchMock, startDate)
    })
    test('missing start date', async () => {
        const fetchMock = vi.fn()
        addResponseSequence(fetchMock, [[200, apiResponseSuccess]])
        const { store } = renderWithProviders(<DataPublicationForm />, fetchMock)
        const user = userEvent.setup()
        await submitDataPublicationForm(user, name, 0)
        await waitFor(() => {
            expect(store.getState().dataPublication.metaDataList).toEqual(
                newRemote([
                    newDataPublicationMetadata({
                        name,
                        idPersistent,
                        step: step as DataPublicationStep,
                        startDateString: startDate.toISOString(),
                        endDateString: endDate.toISOString(),
                        isWorking: false
                    })
                ])
            )
        })
        await expectCall(fetchMock, undefined)
    })
})
describe('errors', () => {
    test('server error', async () => {
        const msg = 'Could not create data publication'
        const fetchMock = vi.fn()
        addResponseSequence(fetchMock, [[500, { msg }]])
        const { store } = renderWithProviders(<DataPublicationForm />, fetchMock)
        const user = userEvent.setup()
        await submitDataPublicationForm(user, name)
        await waitFor(() => {
            expect(store.getState().notification.notificationList).toEqual([
                {
                    id: expect.anything(),
                    msg,
                    type: 'error'
                }
            ])
            expect(store.getState().dataPublication.metaDataList).toEqual(newRemote(undefined))
        })
    })
    test('short name', async () => {
        const fetchMock = vi.fn()
        renderWithProviders(<DataPublicationForm />, fetchMock)
        const user = userEvent.setup()
        await submitDataPublicationForm(user, 'ab')
        await waitFor(() => {
            expect(fetchMock).not.toHaveBeenCalled()
        })
    })
})

async function expectCall(fetchMock: Mock, startDate: Date | undefined) {
    await expectFetchCallList(fetchMock.mock.calls, [
        [
            'http://127.0.0.1:8000/cosmae/api/manage/data_publication',
            {
                method: 'PUT',
                body: {
                    name,
                    end_time: endDate.toISOString(),
                    start_time:startDate?.toISOString()
                }
            }
        ]
    ])
}

async function submitDataPublicationForm(
    user: UserEvent,
    name: string,
    startDay = 4,
    endDay = 20
) {
    const [nameInput, startInput, endInput] = await waitFor(() => {
        const inputs = screen.getAllByRole('textbox')
        expect(inputs).toHaveLength(3)
        return inputs
    })

    await act(async () => {
        await user.type(nameInput, name)
    })
    if (startDay >0) {
        await setDate(user, startInput, startDay)
    }
    await setDate(user, endInput, endDay)
    const submitButton = screen.getByRole('button', { name: 'Create' })
    await user.click(submitButton)
}

const name = 'Test Publication',
    [startDate, endDate] = makeDates(),
    idPersistent = 'bdba2737-1f35-4600-93cb-1b4496cba65f',
    step = 'Curated'

function makeDates() {
    const startDate = new Date(Date.now()),
        endDate = new Date(Date.now())
    startDate.setDate(4)
    startDate.setHours(0, 0, 0, 0)
    endDate.setDate(20)
    endDate.setHours(23, 59, 59, 999)
    return [startDate, endDate]
}

const apiResponseSuccess = {
    name,
    id_persistent: idPersistent,
    step,
    start_time: startDate.toISOString(),
    end_time: endDate.toISOString(),
    error_message: null,
    error_details: null,
    is_working: false
}
