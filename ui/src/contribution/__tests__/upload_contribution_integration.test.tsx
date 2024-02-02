/**
 * @jest-environment jsdom
 */

import { RenderOptions, render, waitFor, screen } from '@testing-library/react'
import {
    NotificationManager,
    NotificationType,
    notificationReducer
} from '../../util/notification/slice'
import { ContributionState, contributionSlice, newContributionState } from '../slice'
import { configureStore } from '@reduxjs/toolkit'
import { PropsWithChildren } from 'react'
import { Provider } from 'react-redux'
import { UploadForm } from '../components'
import userEvent from '@testing-library/user-event'

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: {
        contribution: ContributionState
        notification: NotificationManager
    }
}

export function renderWithProviders(
    ui: React.ReactElement,
    fetchMock: jest.Mock,
    {
        preloadedState = {
            contribution: newContributionState({}),
            notification: { notificationList: [], notificationMap: {} }
        },
        ...renderOptions
    }: ExtendedRenderOptions = {}
) {
    const store = configureStore({
        reducer: {
            contribution: contributionSlice.reducer,
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
test('empty does not submit', async () => {
    const fetchMock = jest.fn()
    const { container } = renderWithProviders(<UploadForm />, fetchMock)
    checkEmptyFeedbacks(container)
    const button = screen.getByText('Submit')
    button.click()
    await waitFor(() => {
        const feedbacks = getFeedbacks(container)
        expect(feedbacks.length).toEqual(3)
        expect(feedbacks[0].textContent).not.toEqual('')
        expect(feedbacks[2].textContent).not.toEqual('')
        expect(fetchMock.mock.calls).toEqual([])
    })
})
test('feedback for short name', async () => {
    const fetchMock = jest.fn()
    const { container } = renderWithProviders(<UploadForm />, fetchMock)
    checkEmptyFeedbacks(container)
    await submitFormWithValues(container, 'aa')
    await waitFor(() => {
        const feedbacks = container.getElementsByClassName('invalid-feedback')
        expect(feedbacks.length).toEqual(3)
        expect(feedbacks[0].textContent).not.toEqual('')
        expect(feedbacks[2].textContent).not.toEqual('')
        expect(fetchMock.mock.calls).toEqual([])
    })
})
const nameTest = 'aaaaaaaaaaaa'
const fileTest = new File([''], 'test.csv', { type: 'text.csv' })
test('submit correct name', async () => {
    const fetchMock = jest.fn()
    addResponseSequence(fetchMock, [[200, {}]])
    const { store, container } = renderWithProviders(<UploadForm />, fetchMock)
    checkEmptyFeedbacks(container)
    await submitFormWithValues(container, nameTest, fileTest)
    checkEmptyFeedbacks(container)
    await waitFor(() => {
        expect(store.getState().notification.notificationList).toEqual([
            expect.objectContaining({
                type: NotificationType.Success,
                msg: 'Successfully added contribution.'
            })
        ])
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
        'http://127.0.0.1:8000/cosmae/api/contributions',
        expect.objectContaining({ method: 'POST', credentials: 'include' })
    )
    checkFormData(fetchMock.mock.calls[0][1].body, {
        name: nameTest,
        description: '',
        has_header: 'false'
    })
})
test('submit with description and header', async () => {
    const fetchMock = jest.fn()
    const description = 'test description'
    addResponseSequence(fetchMock, [[200, {}]])
    const { store, container } = renderWithProviders(<UploadForm />, fetchMock)
    checkEmptyFeedbacks(container)
    await submitFormWithValues(container, nameTest, fileTest, description, true)
    checkEmptyFeedbacks(container)
    await waitFor(() => {
        expect(store.getState().notification.notificationList).toEqual([
            expect.objectContaining({
                type: NotificationType.Success,
                msg: 'Successfully added contribution.'
            })
        ])
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
        'http://127.0.0.1:8000/cosmae/api/contributions',
        expect.objectContaining({ method: 'POST', credentials: 'include' })
    )
    checkFormData(fetchMock.mock.calls[0][1].body, {
        name: nameTest,
        description: description,
        has_header: 'true'
    })
})
test('error', async () => {
    const fetchMock = jest.fn()
    const msg = 'test error'
    addResponseSequence(fetchMock, [[500, { msg }]])
    const { store, container } = renderWithProviders(<UploadForm />, fetchMock)
    checkEmptyFeedbacks(container)
    await submitFormWithValues(container, nameTest, fileTest)
    checkEmptyFeedbacks(container)
    await waitFor(() => {
        expect(store.getState().notification.notificationList).toEqual([
            expect.objectContaining({
                type: NotificationType.Error,
                msg: `Could not upload contribution. Reason: "${msg}".`
            })
        ])
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
        'http://127.0.0.1:8000/cosmae/api/contributions',
        expect.objectContaining({ method: 'POST', credentials: 'include' })
    )
    checkFormData(fetchMock.mock.calls[0][1].body, {
        name: nameTest,
        description: '',
        has_header: 'false'
    })
})

function checkFormData(formData: FormData, object: { [key: string]: unknown }) {
    const formDataObject: { [key: string]: unknown } = Array.from(
        formData.entries()
    ).reduce((acc, f) => ({ ...acc, [f[0]]: f[1] }), {})
    expect(formDataObject.file).not.toBeUndefined()
    formDataObject.file = undefined
    object.file = undefined
    expect(formDataObject).toEqual(object)
}
function checkEmptyFeedbacks(container: HTMLElement) {
    const feedbacks = container.getElementsByClassName('invalid-feedback')
    for (let i = 0; i < feedbacks.length; ++i) {
        expect(feedbacks[i].textContent).toEqual('')
    }
}

async function submitFormWithValues(
    container: HTMLElement,
    name?: string,
    fileInput?: File,
    description?: string,
    hasHeader?: boolean
) {
    const user = userEvent.setup()
    const inputs = screen.getAllByRole('textbox')
    expect(inputs.length).toEqual(2)
    if (name !== undefined) {
        await user.type(inputs[0], name)
    }
    if (description !== undefined) {
        await user.type(inputs[1], description)
    }
    if (hasHeader) {
        const checkbox = screen.getByRole('checkbox')
        await user.click(checkbox)
    }
    if (fileInput !== undefined) {
        const fileInput = container.getElementsByClassName('form-control')[2]
        await user.upload(fileInput as HTMLElement, fileTest)
    }
    const button = screen.getByText('Submit')
    button.click()
}

function getFeedbacks(container: HTMLElement) {
    return container.getElementsByClassName('invalid-feedback')
}
