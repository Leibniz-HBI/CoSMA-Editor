/**
 * @jest-environment jsdom
 */

import { RenderOptions, render, waitFor, screen } from '@testing-library/react'
import {
    NotificationManager,
    NotificationType,
    notificationReducer
} from '../../../util/notification/slice'
import { ContributionState, contributionSlice, newContributionState } from '../../slice'
import { configureStore } from '@reduxjs/toolkit'
import { PropsWithChildren } from 'react'
import { Provider } from 'react-redux'
import { ContributionDetailsStep } from '../components'
import userEvent from '@testing-library/user-event'
import { ContributionStep, newContribution } from '../../state'
import { newRemote } from '../../../util/state'
jest.mock('react-router-dom', () => {
    const mockNavigate = jest.fn()
    return {
        useNavigate: jest.fn().mockReturnValue(mockNavigate),
        useLoaderData: jest.fn().mockReturnValue('id-test-0')
    }
})

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
            contribution: newContributionState({
                selectedContribution: newRemote(
                    newContribution({
                        name: nameTest0,
                        description: descriptionTest0,
                        idPersistent: idTest0,
                        author: authorTest,
                        hasHeader: false,
                        step: ContributionStep.ColumnsExtracted,
                        emptyValues: emptyValuesTest
                    })
                )
            }),
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
const nameTest0 = 'contribution test 0'
const descriptionTest0 = 'a contribution for tests'
const idTest0 = 'id-test-0'
const authorTest = 'author test'
const emptyValuesTest = 'empty,absent'

test('no submit for short input', async () => {
    const fetchMock = jest.fn()
    const { container } = renderWithProviders(<ContributionDetailsStep />, fetchMock)
    const feedbacks = container.getElementsByClassName('invalid-feedback')
    for (let i = 0; i < feedbacks.length; ++i) {
        expect(feedbacks[i].textContent).toEqual('')
    }
    const user = userEvent.setup()
    await waitFor(async () => {
        const inputs = screen.getAllByRole('textbox')
        const button = screen.getByText('Edit')
        await user.clear(inputs[0])
        await user.type(inputs[0], 'aa')
        await user.clear(inputs[1])
        await user.click(button)
    })
    await waitFor(() => {
        expect(fetchMock.mock.calls).toEqual([])
        const feedbacks = container.getElementsByClassName('invalid-feedback')
        expect(feedbacks.length).toEqual(3)
        expect(feedbacks[0].textContent).not.toEqual('')
        expect(feedbacks[1].textContent).toEqual('')
        expect(feedbacks[2].textContent).toEqual('')
    })
})
const changedName = 'changed name use in tests'
test('submit for changed name', async () => {
    const fetchMock = jest.fn()
    addResponseSequence(fetchMock, [
        [
            200,
            {
                id_persistent: idTest0,
                name: changedName,
                has_header: false,
                description: descriptionTest0,
                state: 'COLUMNS_EXTRACTED',
                author: authorTest,
                empty_values: emptyValuesTest
            }
        ]
    ])
    const { container, store } = renderWithProviders(
        <ContributionDetailsStep />,
        fetchMock
    )
    const feedbacks = container.getElementsByClassName('invalid-feedback')
    for (let i = 0; i < feedbacks.length; ++i) {
        expect(feedbacks[i].textContent).toEqual('')
    }
    const user = userEvent.setup()
    await waitFor(async () => {
        const inputs = screen.getAllByRole('textbox')
        const button = screen.getByText('Edit')
        await user.clear(inputs[0])
        await user.type(inputs[0], changedName)
        await user.click(button)
    })
    await waitFor(() => {
        expect(fetchMock.mock.calls).toEqual([
            [
                `http://127.0.0.1:8000/cosmae/api/contributions/${idTest0}`,
                {
                    credentials: 'include',
                    method: 'PATCH',
                    body: JSON.stringify({
                        name: changedName,
                        description: descriptionTest0,
                        has_header: false,
                        empty_values: emptyValuesTest
                    })
                }
            ]
        ])
        const feedbacks = container.getElementsByClassName('invalid-feedback')
        expect(feedbacks.length).toEqual(3)
        expect(feedbacks[0].textContent).toEqual('')
        expect(feedbacks[1].textContent).toEqual('')
        expect(feedbacks[2].textContent).toEqual('')
    })
    expect(store.getState()).toEqual({
        contribution: newContributionState({
            selectedContribution: newRemote(
                newContribution({
                    name: changedName,
                    description: descriptionTest0,
                    hasHeader: false,
                    step: ContributionStep.ColumnsExtracted,
                    idPersistent: idTest0,
                    emptyValues: emptyValuesTest,
                    author: authorTest
                })
            )
        }),
        notification: { notificationList: [], notificationMap: {} }
    })
})

test('submit for changed empty values', async () => {
    const fetchMock = jest.fn()
    const changedEmptyValues = 'null,nan,na'
    addResponseSequence(fetchMock, [
        [
            200,
            {
                id_persistent: idTest0,
                name: changedName,
                has_header: false,
                description: descriptionTest0,
                state: 'COLUMNS_EXTRACTED',
                author: authorTest,
                empty_values: changedEmptyValues
            }
        ]
    ])
    const { container, store } = renderWithProviders(
        <ContributionDetailsStep />,
        fetchMock
    )
    const feedbacks = container.getElementsByClassName('invalid-feedback')
    for (let i = 0; i < feedbacks.length; ++i) {
        expect(feedbacks[i].textContent).toEqual('')
    }
    expect(
        store.getState().contribution.selectedContribution.value?.emptyValues
    ).toEqual(emptyValuesTest)
    const user = userEvent.setup()
    await waitFor(async () => {
        const inputs = screen.getAllByRole('textbox')
        const button = screen.getByText('Edit')
        await user.clear(inputs[1])
        await user.type(inputs[1], changedEmptyValues)
        await user.click(button)
    })
    await waitFor(() => {
        expect(fetchMock.mock.calls).toEqual([
            [
                `http://127.0.0.1:8000/cosmae/api/contributions/${idTest0}`,
                {
                    credentials: 'include',
                    method: 'PATCH',
                    body: JSON.stringify({
                        name: nameTest0,
                        description: descriptionTest0,
                        has_header: false,
                        empty_values: changedEmptyValues
                    })
                }
            ]
        ])
        const feedbacks = container.getElementsByClassName('invalid-feedback')
        expect(feedbacks.length).toEqual(3)
        expect(feedbacks[0].textContent).toEqual('')
        expect(feedbacks[1].textContent).toEqual('')
        expect(feedbacks[2].textContent).toEqual('')
    })
    expect(store.getState()).toEqual({
        contribution: newContributionState({
            selectedContribution: newRemote(
                newContribution({
                    name: changedName,
                    description: descriptionTest0,
                    hasHeader: false,
                    step: ContributionStep.ColumnsExtracted,
                    idPersistent: idTest0,
                    emptyValues: changedEmptyValues,
                    author: authorTest
                })
            )
        }),
        notification: { notificationList: [], notificationMap: {} }
    })
})

test('submit for changed header flag', async () => {
    const fetchMock = jest.fn()
    addResponseSequence(fetchMock, [
        [
            200,
            {
                id_persistent: idTest0,
                name: nameTest0,
                has_header: true,
                description: descriptionTest0,
                state: 'COLUMNS_EXTRACTED',
                author: authorTest,
                empty_values: emptyValuesTest
            }
        ]
    ])
    const { container, store } = renderWithProviders(
        <ContributionDetailsStep />,
        fetchMock
    )
    const feedbacks = container.getElementsByClassName('invalid-feedback')
    for (let i = 0; i < feedbacks.length; ++i) {
        expect(feedbacks[i].textContent).toEqual('')
    }
    await waitFor(async () => {
        const checkbox = screen.getByRole('checkbox')
        checkbox.click()
        const button = screen.getByText('Edit')
        button.click()
    })
    await waitFor(() => {
        expect(fetchMock.mock.calls).toEqual([
            [
                `http://127.0.0.1:8000/cosmae/api/contributions/${idTest0}`,
                {
                    credentials: 'include',
                    method: 'PATCH',
                    body: JSON.stringify({
                        name: nameTest0,
                        description: descriptionTest0,
                        has_header: true,
                        empty_values: emptyValuesTest
                    })
                }
            ]
        ])
        const feedbacks = container.getElementsByClassName('invalid-feedback')
        expect(feedbacks.length).toEqual(3)
        expect(feedbacks[0].textContent).toEqual('')
        expect(feedbacks[1].textContent).toEqual('')
        expect(feedbacks[2].textContent).toEqual('')
    })
    expect(store.getState()).toEqual({
        contribution: newContributionState({
            selectedContribution: newRemote(
                newContribution({
                    name: nameTest0,
                    description: descriptionTest0,
                    hasHeader: true,
                    step: ContributionStep.ColumnsExtracted,
                    idPersistent: idTest0,
                    emptyValues: emptyValuesTest,
                    author: authorTest
                })
            )
        }),
        notification: { notificationList: [], notificationMap: {} }
    })
})

test('API error', async () => {
    const fetchMock = jest.fn()
    const errorMsg = 'could not patch contribution'
    addResponseSequence(fetchMock, [
        [
            500,
            {
                msg: errorMsg
            }
        ]
    ])
    const { container, store } = renderWithProviders(
        <ContributionDetailsStep />,
        fetchMock
    )
    const feedbacks = container.getElementsByClassName('invalid-feedback')
    for (let i = 0; i < feedbacks.length; ++i) {
        expect(feedbacks[i].textContent).toEqual('')
    }
    await waitFor(async () => {
        const checkbox = screen.getByRole('checkbox')
        checkbox.click()
        const button = screen.getByText('Edit')
        button.click()
    })
    await waitFor(() => {
        expect(fetchMock.mock.calls).toEqual([
            [
                `http://127.0.0.1:8000/cosmae/api/contributions/${idTest0}`,
                {
                    credentials: 'include',
                    method: 'PATCH',
                    body: JSON.stringify({
                        name: nameTest0,
                        description: descriptionTest0,
                        has_header: true,
                        empty_values: emptyValuesTest
                    })
                }
            ]
        ])
        const feedbacks = container.getElementsByClassName('invalid-feedback')
        expect(feedbacks.length).toEqual(3)
        expect(feedbacks[0].textContent).toEqual('')
        expect(feedbacks[1].textContent).toEqual('')
        expect(feedbacks[2].textContent).toEqual('')
    })
    expect(store.getState()).toEqual({
        contribution: newContributionState({
            selectedContribution: newRemote(
                newContribution({
                    name: nameTest0,
                    description: descriptionTest0,
                    hasHeader: false,
                    step: ContributionStep.ColumnsExtracted,
                    idPersistent: idTest0,
                    emptyValues: emptyValuesTest,
                    author: authorTest
                })
            )
        }),
        notification: {
            notificationList: [
                expect.objectContaining({
                    msg: `Could not update contribution. Reason: "${errorMsg}".`,
                    type: NotificationType.Error
                })
            ],
            notificationMap: expect.anything()
        }
    })
})
