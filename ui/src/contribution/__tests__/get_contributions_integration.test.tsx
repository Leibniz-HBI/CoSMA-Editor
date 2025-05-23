/**
 * @vitest-environment jsdom
 */

import { waitFor, screen } from '@testing-library/react'
import { NotificationType } from '../../util/notification/slice'
import { ContributionList } from '../components'
import { newRemote } from '../../util/state'
import { ContributionStep, newContribution } from '../state'
import { useNavigate } from 'react-router-dom'
import { vi, Mock } from 'vitest'
import {
    authorTest1,
    contributionResponse0,
    contributionValuesAssignedResponse,
    descriptionTest0,
    descriptionTest1,
    idTest0,
    idTest1,
    nameTest0,
    nameTest1,
    renderWithProviders
} from '../test_utils'
import { addResponseSequence } from '../../util/tests/response'

vi.mock('react-router-dom', () => {
    const mockNavigate = vi.fn()
    return {
        useNavigate: vi.fn().mockReturnValue(mockNavigate)
    }
})

test('success and open', async () => {
    const fetchMock = vi.fn()
    addResponseSequence(fetchMock, [
        [
            200,
            {
                contributions: [
                    contributionResponse0,
                    contributionValuesAssignedResponse
                ]
            }
        ],
        [200, { contributions: [] }]
    ])
    const { store } = renderWithProviders(<ContributionList />, fetchMock)
    await waitFor(() => {
        expect(store.getState()).toEqual(
            expect.objectContaining({
                contribution: expect.objectContaining({
                    contributions: newRemote([
                        newContribution({
                            name: nameTest0,
                            idPersistent: idTest0,
                            description: descriptionTest0,
                            step: ContributionStep.Uploaded,
                            hasHeader: false,
                            author: authorTest1,
                            emptyValues: 'nan,na'
                        }),
                        newContribution({
                            name: nameTest1,
                            idPersistent: idTest1,
                            description: descriptionTest1,
                            step: ContributionStep.ValuesAssigned,
                            hasHeader: true,
                            author: authorTest1,
                            emptyValues: 'null,none'
                        })
                    ])
                }),
                notification: { notificationList: [], notificationMap: {} }
            })
        )
    })
    expect(fetchMock.mock.calls).toEqual([
        [
            'http://127.0.0.1:8000/cosmae/api/contributions/chunk/0/5000',
            {
                credentials: 'include',
                method: 'GET',
                headers: { 'Access-Control-Allow-Credentials': 'true' }
            }
        ],
        [
            'http://127.0.0.1:8000/cosmae/api/contributions/chunk/5000/5000',
            {
                credentials: 'include',
                method: 'GET',
                headers: { 'Access-Control-Allow-Credentials': 'true' }
            }
        ]
    ])
    await waitFor(() => {
        screen.getByText(nameTest0)
    })
    const label1 = screen.getByText(nameTest1)
    label1.click()
    await waitFor(() => {
        const navigateMock = useNavigate() as Mock
        expect(navigateMock.mock.calls).toEqual([[`/contribute/${idTest1}`]])
    })
})
test('error', async () => {
    const fetchMock = vi.fn()
    const errorMsg = 'error loading credentials'
    addResponseSequence(fetchMock, [
        [
            200,
            {
                contributions: [
                    contributionResponse0,
                    contributionValuesAssignedResponse
                ]
            }
        ],
        [500, { msg: errorMsg }]
    ])
    const { store } = renderWithProviders(<ContributionList />, fetchMock)
    await waitFor(() => {
        expect(store.getState()).toEqual(
            expect.objectContaining({
                contribution: expect.objectContaining({
                    contributions: newRemote([])
                }),
                notification: {
                    notificationList: [
                        expect.objectContaining({
                            type: NotificationType.Error,
                            msg: `Could not load contributions. Reason: "${errorMsg}".`
                        })
                    ],
                    notificationMap: expect.anything()
                }
            })
        )
    })
    expect(fetchMock.mock.calls).toEqual([
        [
            'http://127.0.0.1:8000/cosmae/api/contributions/chunk/0/5000',
            {
                credentials: 'include',
                method: 'GET',
                headers: { 'Access-Control-Allow-Credentials': 'true' }
            }
        ],
        [
            'http://127.0.0.1:8000/cosmae/api/contributions/chunk/5000/5000',
            {
                credentials: 'include',
                method: 'GET',
                headers: { 'Access-Control-Allow-Credentials': 'true' }
            }
        ]
    ])
})
