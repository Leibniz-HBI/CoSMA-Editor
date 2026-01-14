/**
 * @vitest-environment jsdom
 */

import { waitFor, screen } from '@testing-library/react'
import { NotificationType } from '../../../util/notification/slice'
import { newContributionState } from '../../slice'
import { ContributionDetailsStep } from '../components'
import userEvent from '@testing-library/user-event'
import { ContributionStep, newContribution } from '../../state'
import { newRemote } from '../../../util/state'
import { vi } from 'vitest'
import { addResponseSequence, expectFetchCallList } from '../../../util/tests/response'
import { emptyState, renderWithProviders } from '../../../util/tests/provider'

vi.mock('react-router-dom', () => {
    const mockNavigate = vi.fn()
    return {
        useNavigate: vi.fn().mockReturnValue(mockNavigate),
        useLoaderData: vi.fn().mockReturnValue('id-test-0')
    }
})
const nameTest0 = 'contribution test 0'
const descriptionTest0 = 'a contribution for tests'
const idTest0 = 'id-test-0'
const authorTest = 'author test'
const emptyValuesTest = 'empty,absent'

const preloadedState = {
    ...emptyState,
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
}

test('no submit for short input', async () => {
    const fetchMock = vi.fn()
    const { container } = renderWithProviders(<ContributionDetailsStep />, fetchMock, {
        preloadedState
    })
    const feedbacks = container.getElementsByClassName('invalid-feedback')
    for (let i = 0; i < feedbacks.length; ++i) {
        expect(feedbacks[i].textContent).toEqual('')
    }
    const user = userEvent.setup()
    await waitFor(async () => {
        const inputs = await screen.findAllByRole('textbox')
        const button = await screen.findByText('Edit')
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
    const fetchMock = vi.fn()
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
        fetchMock,
        { preloadedState }
    )
    const feedbacks = container.getElementsByClassName('invalid-feedback')
    for (let i = 0; i < feedbacks.length; ++i) {
        expect(feedbacks[i].textContent).toEqual('')
    }
    const user = userEvent.setup()
    await waitFor(async () => {
        const inputs = await screen.findAllByRole('textbox')
        const button = await screen.findByText('Edit')
        await user.clear(inputs[0])
        await user.type(inputs[0], changedName)
        await user.click(button)
    })
    await waitFor(async () => {
        await expectFetchCallList(fetchMock.mock.calls, [
            [
                `http://127.0.0.1:8000/cosmae/api/contributions/${idTest0}`,
                {
                    credentials: 'include',
                    method: 'PATCH',
                    body: {
                        name: changedName,
                        description: descriptionTest0,
                        has_header: false,
                        empty_values: emptyValuesTest
                    }
                }
            ]
        ])
        const feedbacks = container.getElementsByClassName('invalid-feedback')
        expect(feedbacks.length).toEqual(3)
        expect(feedbacks[0].textContent).toEqual('')
        expect(feedbacks[1].textContent).toEqual('')
        expect(feedbacks[2].textContent).toEqual('')
    })
    expect(store.getState()).toEqual(
        expect.objectContaining({
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
    )
})

test('submit for changed empty values', async () => {
    const fetchMock = vi.fn()
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
        fetchMock,
        { preloadedState }
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
        const inputs = await screen.findAllByRole('textbox')
        const button = await screen.findByText('Edit')
        await user.clear(inputs[1])
        await user.type(inputs[1], changedEmptyValues)
        await user.click(button)
    })
    await waitFor(async () => {
        const feedbacks = container.getElementsByClassName('invalid-feedback')
        expect(feedbacks.length).toEqual(3)
        expect(feedbacks[0].textContent).toEqual('')
        expect(feedbacks[1].textContent).toEqual('')
        expect(feedbacks[2].textContent).toEqual('')
    })
    expect(store.getState()).toEqual(
        expect.objectContaining({
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
    )
    await expectFetchCallList(fetchMock.mock.calls, [
        [
            `http://127.0.0.1:8000/cosmae/api/contributions/${idTest0}`,
            {
                credentials: 'include',
                method: 'PATCH',
                body: {
                    name: nameTest0,
                    description: descriptionTest0,
                    has_header: false,
                    empty_values: changedEmptyValues
                }
            }
        ]
    ])
})

test('submit for changed header flag', async () => {
    const fetchMock = vi.fn()
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
        fetchMock,
        { preloadedState }
    )
    const feedbacks = container.getElementsByClassName('invalid-feedback')
    for (let i = 0; i < feedbacks.length; ++i) {
        expect(feedbacks[i].textContent).toEqual('')
    }
    await waitFor(async () => {
        const checkbox = await screen.findByRole('checkbox')
        checkbox.click()
        const button = await screen.findByText('Edit')
        button.click()
    })
    await waitFor(async () => {
        const feedbacks = container.getElementsByClassName('invalid-feedback')
        expect(feedbacks.length).toEqual(3)
        expect(feedbacks[0].textContent).toEqual('')
        expect(feedbacks[1].textContent).toEqual('')
        expect(feedbacks[2].textContent).toEqual('')
        expect(store.getState()).toEqual(
            expect.objectContaining({
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
        )
    })
    await expectFetchCallList(fetchMock.mock.calls, [
        [
            `http://127.0.0.1:8000/cosmae/api/contributions/${idTest0}`,
            {
                credentials: 'include',
                method: 'PATCH',
                body: {
                    name: nameTest0,
                    description: descriptionTest0,
                    has_header: true,
                    empty_values: emptyValuesTest
                }
            }
        ]
    ])
})

test('API error', async () => {
    const fetchMock = vi.fn()
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
        fetchMock,
        { preloadedState }
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
    await waitFor(async () => {
        const feedbacks = container.getElementsByClassName('invalid-feedback')
        expect(feedbacks.length).toEqual(3)
        expect(feedbacks[0].textContent).toEqual('')
        expect(feedbacks[1].textContent).toEqual('')
        expect(feedbacks[2].textContent).toEqual('')
        expect(store.getState()).toEqual(
            expect.objectContaining({
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
        )
    })
    await expectFetchCallList(fetchMock.mock.calls, [
        [
            `http://127.0.0.1:8000/cosmae/api/contributions/${idTest0}`,
            {
                credentials: 'include',
                method: 'PATCH',
                body: {
                    name: nameTest0,
                    description: descriptionTest0,
                    has_header: true,
                    empty_values: emptyValuesTest
                }
            }
        ]
    ])
})
