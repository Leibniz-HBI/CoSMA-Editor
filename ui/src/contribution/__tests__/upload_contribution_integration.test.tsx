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
import { useNavigate } from 'react-router-dom'
import {
    EditSessionParticipantType,
    EditSessionState,
    newEditSession,
    newEditSessionParticipant,
    newEditSessionState
} from '../../session/state'
import { editSessionReducer } from '../../session/slice'
import { newRemote } from '../../util/state'

jest.mock('react-router-dom', () => {
    const navigateMock = jest.fn()
    return { useNavigate: jest.fn().mockReturnValue(navigateMock) }
})
interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: {
        contribution: ContributionState
        notification: NotificationManager
        editSession: EditSessionState
    }
}

beforeEach(() => {
    ;(useNavigate() as jest.Mock).mockRestore()
})

export function renderWithProviders(
    ui: React.ReactElement,
    fetchMock: jest.Mock,
    {
        preloadedState = {
            contribution: newContributionState({}),
            notification: { notificationList: [], notificationMap: {} },
            editSession: newEditSessionState({
                editSessionOwnerList: newRemote([
                    newEditSession({
                        idPersistent: idEditSession,
                        name: nameSession,
                        owner,
                        participantList: [],
                        participantMap: {}
                    })
                ])
            })
        },
        ...renderOptions
    }: ExtendedRenderOptions = {}
) {
    const store = configureStore({
        reducer: {
            contribution: contributionSlice.reducer,
            notification: notificationReducer,
            editSession: editSessionReducer
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
        expect(feedbacks.length).toEqual(4)
        expect(feedbacks[0].textContent).not.toEqual('')
        expect(feedbacks[2].textContent).not.toEqual('')
        expect(fetchMock.mock.calls).toEqual([])
        expect((useNavigate() as jest.Mock).mock.calls).toEqual([])
    })
})
test('feedback for short name', async () => {
    const fetchMock = jest.fn()
    const { container } = renderWithProviders(<UploadForm />, fetchMock)
    checkEmptyFeedbacks(container)
    await submitFormWithValues(container, 'aa')
    await waitFor(() => {
        const feedbacks = container.getElementsByClassName('invalid-feedback')
        expect(feedbacks.length).toEqual(4)
        expect(feedbacks[0].textContent).not.toEqual('')
        expect(feedbacks[2].textContent).not.toEqual('')
        expect(fetchMock.mock.calls).toEqual([])
        expect((useNavigate() as jest.Mock).mock.calls).toEqual([])
    })
})
test('feedback for no edit session', async () => {
    const fetchMock = jest.fn()
    const { container } = renderWithProviders(<UploadForm />, fetchMock)
    checkEmptyFeedbacks(container)
    await submitFormWithValues(container, nameTest, fileTest, false)
    await waitFor(() => {
        const feedbacks = container.getElementsByClassName('invalid-feedback')
        expect(feedbacks.length).toEqual(4)
        const sessionFeedback = screen.getByText('Please select an edit session.')
        expect(sessionFeedback.parentElement?.parentElement?.className).toEqual(
            'text-danger row'
        )
        expect(fetchMock.mock.calls).toEqual([])
        expect((useNavigate() as jest.Mock).mock.calls).toEqual([])
    })
})
test('submit correct name', async () => {
    const fetchMock = jest.fn()
    addResponseSequence(fetchMock, [
        [200, jsonEditSessionResponse],
        [200, jsonEditSessionResponse],
        [200, { id_persistent: idPersistentReturn }],
    ])
    const { store, container } = renderWithProviders(<UploadForm />, fetchMock)
    checkEmptyFeedbacks(container)
    await submitFormWithValues(container, nameTest, fileTest, true)
    checkEmptyFeedbacks(container)
    await waitFor(() => {
        expect(store.getState().notification.notificationList).toEqual([
            expect.objectContaining({
                type: NotificationType.Success,
                msg: 'Successfully added contribution.'
            })
        ])
    })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock).toHaveBeenCalledWith(
        'http://127.0.0.1/api/contributions',
        expect.objectContaining({ method: 'POST', credentials: 'include' })
    )
    checkFormData(fetchMock.mock.calls[2][1].body, {
        name: nameTest,
        description: '',
        empty_values: 'nan,null,na',
        id_edit_session_persistent: idEditSession,
        has_header: 'false'
    })
    expect((useNavigate() as jest.Mock).mock.calls).toEqual([
        [`/contribute/${idPersistentReturn}/columns`]
    ])
})
test('submit with description and header', async () => {
    const fetchMock = jest.fn()
    const description = 'test description'
    addResponseSequence(fetchMock, [
        [200, jsonEditSessionResponse],
        [200, jsonEditSessionResponse],
        [200, { id_persistent: idPersistentReturn }]
    ])
    const { store, container } = renderWithProviders(<UploadForm />, fetchMock)
    checkEmptyFeedbacks(container)
    await submitFormWithValues(container, nameTest, fileTest, true, description, true)
    checkEmptyFeedbacks(container)
    await waitFor(() => {
        expect(store.getState().notification.notificationList).toEqual([
            expect.objectContaining({
                type: NotificationType.Success,
                msg: 'Successfully added contribution.'
            })
        ])
    })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock).toHaveBeenCalledWith(
        'http://127.0.0.1/api/contributions',
        expect.objectContaining({ method: 'POST', credentials: 'include' })
    )
    checkFormData(fetchMock.mock.calls[2][1].body, {
        name: nameTest,
        description: description,
        empty_values: 'nan,null,na',
        has_header: 'true',
        id_edit_session_persistent: idEditSession
    })
    expect((useNavigate() as jest.Mock).mock.calls).toEqual([
        [`/contribute/${idPersistentReturn}/columns`]
    ])
})
test('error', async () => {
    const fetchMock = jest.fn()
    const msg = 'test error'
    addResponseSequence(fetchMock, [
        [200, jsonEditSessionResponse],
        [200, jsonEditSessionResponse],
        [500, { msg }]
    ])
    const { store, container } = renderWithProviders(<UploadForm />, fetchMock)
    checkEmptyFeedbacks(container)
    await submitFormWithValues(container, nameTest, fileTest, true)
    checkEmptyFeedbacks(container)
    await waitFor(() => {
        expect(store.getState().notification.notificationList).toEqual([
            expect.objectContaining({
                type: NotificationType.Error,
                msg: `Could not upload contribution. Reason: "${msg}".`
            })
        ])
    })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock).toHaveBeenCalledWith(
        'http://127.0.0.1/api/contributions',
        expect.objectContaining({ method: 'POST', credentials: 'include' })
    )
    checkFormData(fetchMock.mock.calls[2][1].body, {
        name: nameTest,
        description: '',
        empty_values: 'nan,null,na',
        has_header: 'false',
        id_edit_session_persistent: idEditSession
    })
    expect((useNavigate() as jest.Mock).mock.calls).toEqual([])
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

const nameTest = 'aaaaaaaaaaaa'
const fileTest = new File([''], 'test.csv', { type: 'text.csv' })
const idPersistentReturn = 'id-persistent-return'
const idEditSession = '7553fa55-f11f-48a7-aebb-4dcaa3af0ae3'
const nameSession = 'edit session for test'
const idOwner = 'id-owner'
const nameOwner = 'owner'
const owner = newEditSessionParticipant({
    id: idOwner,
    name: nameOwner,
    type: EditSessionParticipantType.internal
})
const jsonOwner = {
    type_participant: 'INTERNAL',
    id_participant: idOwner,
    name_participant: nameOwner
}
const jsonEditSessionResponse = {
    edit_session_list: [
        {
            id_persistent: idEditSession,
            name: nameSession,
            owner: jsonOwner,
            participant_list: [jsonOwner]
        }
    ]
}

async function submitFormWithValues(
    container: HTMLElement,
    name?: string,
    fileInput?: File,
    selectEditSession?: boolean,
    description?: string,
    hasHeader?: boolean,
    empty_values?: string
) {
    const user = userEvent.setup()
    const inputs = screen.getAllByRole('textbox')
    expect(inputs.length).toEqual(3)
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
    if (empty_values !== undefined) {
        await user.type(inputs[2], empty_values)
    }
    if (selectEditSession) {
        const sessionButton = await screen.findByText('Select Edit Session')
        sessionButton.click()
        await waitFor(async () => {
            const session = await screen.findByText(nameSession)
            session.click()
        })
        await waitFor(async () => {
            await screen.findByText(`Edit Session: ${nameSession}`)
        })
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
