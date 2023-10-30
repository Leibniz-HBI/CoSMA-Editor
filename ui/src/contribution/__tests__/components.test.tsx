/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react'
import { Remote } from '../../util/state'
import { useContribution } from '../hooks'
import { ContributionList } from '../components'
import { Contribution, ContributionStep, newContribution } from '../state'
import { useNavigate } from 'react-router-dom'
import { act } from 'react-dom/test-utils'
import { UploadForm } from '../components'
import userEvent from '@testing-library/user-event'

jest.mock('../hooks', () => {
    return {
        useContribution: jest.fn()
    }
})

jest.mock('react-router-dom', () => {
    const mockNavigate = jest.fn()
    return {
        useNavigate: jest.fn().mockReturnValue(mockNavigate)
    }
})
const testContributions = new Remote(
    [
        newContribution({
            name: 'contribution test 0',
            description: 'a contribution for tests',
            step: ContributionStep.Uploaded,
            idPersistent: 'id-test-0',
            anonymous: true,
            hasHeader: false
        }),
        newContribution({
            name: 'contribution test 1',
            description: 'another contribution for tests',
            step: ContributionStep.ColumnsExtracted,
            idPersistent: 'id-test-1',
            anonymous: false,
            author: 'author test',
            hasHeader: true
        })
    ],
    false
)

describe('contribution list', () => {
    test('render loading', async () => {
        ;(useContribution as jest.Mock).mockReturnValueOnce({
            contributions: new Remote([], true),
            loadContributionsCallback: jest.fn()
        })
        const { container } = render(<ContributionList />)
        const shimmers = container.getElementsByClassName('shimmer')
        expect(shimmers.length).toEqual(1)
        const cols = container.getElementsByClassName('col')
        expect(cols.length).toEqual(0)
        const modal = screen.queryByRole('dialog')
        expect(modal).toBeNull()
    })

    test('render contributions', async () => {
        ;(useContribution as jest.Mock).mockReturnValue({
            contributions: testContributions,
            loadContributionsCallback: jest.fn(),
            showAddContribution: new Remote(false)
        })
        const { container } = render(<ContributionList />)
        const shimmers = container.getElementsByClassName('shimmer')
        expect(shimmers.length).toEqual(0)
        const modal = screen.queryByRole('dialog')
        expect(modal).toBeNull()
        screen.getByText('contribution test 0')
        screen.getByText('contribution test 1')
    })
    test('render modal', async () => {
        ;(useContribution as jest.Mock).mockReturnValue({
            contributions: testContributions,
            loadContributionsCallback: jest.fn(),
            showAddContribution: new Remote(true)
        })
        const { container } = render(<ContributionList />)
        const shimmers = container.getElementsByClassName('shimmer')
        expect(shimmers.length).toEqual(0)
        screen.getByRole('dialog')
        screen.getByText('contribution test 0')
        screen.getByText('contribution test 1')
    })
    test('upload button toggles', async () => {
        const toggle = jest.fn()
        ;(useContribution as jest.Mock).mockReturnValue({
            contributions: testContributions,
            loadContributionsCallback: jest.fn(),
            showAddContribution: new Remote(false),
            toggleShowAddContributionCallback: toggle
        })
        render(<ContributionList />)
        const button = screen.getByRole('button')
        act(() => {
            button.click()
        })
        expect(toggle.mock.calls.length).toEqual(1)
    })
    test('navigation', async () => {
        ;(useContribution as jest.Mock).mockReturnValue({
            contributions: testContributions,
            loadContributionsCallback: jest.fn(),
            showAddContribution: new Remote(false)
        })
        render(<ContributionList />)
        const entry0 = screen.getByText('contribution test 0')
        act(() => {
            entry0.click()
        })
        const navigateMock = useNavigate()
        expect((navigateMock as jest.Mock).mock.calls).toEqual([
            ['/contribute/id-test-0']
        ])
    })
})

describe('upload form', () => {
    test('empty does not submit', async () => {
        const onSubmit = jest.fn()
        const { container } = render(
            <UploadForm
                clearUploadErrorCallback={jest.fn()}
                onSubmit={onSubmit}
                uploadErrorMsg=""
            />
        )
        const feedbacks = container.getElementsByClassName('invalid-feedback')
        for (let i = 0; i < feedbacks.length; ++i) {
            expect(feedbacks[i].textContent).toEqual('')
        }
        const button = screen.getByText('Submit')
        button.click()
        await waitFor(() => {
            expect(onSubmit.mock.calls).toEqual([])
            const feedbacks = container.getElementsByClassName('invalid-feedback')
            expect(feedbacks.length).toEqual(3)
            for (let i = 0; i < feedbacks.length; ++i) {
                expect(feedbacks[i].textContent).not.toEqual('')
            }
        })
    })
    test('feedback for short inputs', async () => {
        const onSubmit = jest.fn()
        const { container } = render(
            <UploadForm
                clearUploadErrorCallback={jest.fn()}
                onSubmit={onSubmit}
                uploadErrorMsg=""
            />
        )
        const feedbacks = container.getElementsByClassName('invalid-feedback')
        for (let i = 0; i < feedbacks.length; ++i) {
            expect(feedbacks[i].textContent).toEqual('')
        }
        const user = userEvent.setup()
        const inputs = screen.getAllByRole('textbox')
        expect(inputs.length).toEqual(2)
        await user.type(inputs[0], 'aa')
        await user.type(inputs[1], 'bb')
        const button = screen.getByText('Submit')
        button.click()
        await waitFor(() => {
            expect(onSubmit.mock.calls).toEqual([])
            const feedbacks = container.getElementsByClassName('invalid-feedback')
            expect(feedbacks.length).toEqual(3)
            for (let i = 0; i < feedbacks.length; ++i) {
                expect(feedbacks[i].textContent).not.toEqual('')
            }
        })
    })
    const nameTest = 'aaaaaaaaaaaa'
    const descriptionTest = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
    const fileTest = new File([''], 'test.csv', { type: 'text.csv' })
    test('valid submit with checkboxes off', async () => {
        const onSubmit = jest.fn()
        const { container } = render(
            <UploadForm
                clearUploadErrorCallback={jest.fn()}
                onSubmit={onSubmit}
                uploadErrorMsg=""
            />
        )
        const feedbacks = container.getElementsByClassName('invalid-feedback')
        for (let i = 0; i < feedbacks.length; ++i) {
            expect(feedbacks[i].textContent).toEqual('')
        }
        const user = userEvent.setup()
        const inputs = screen.getAllByRole('textbox')
        expect(inputs.length).toEqual(2)
        await user.type(inputs[0], nameTest)
        await user.type(inputs[1], descriptionTest)
        const fileInput = container.getElementsByClassName('form-control')[2]
        await user.upload(fileInput as HTMLElement, fileTest)
        const button = screen.getByText('Submit')
        button.click()
        await waitFor(() => {
            expect(onSubmit.mock.calls).toEqual([
                [
                    {
                        name: nameTest,
                        description: descriptionTest,
                        file: fileTest,
                        hasHeader: false,
                        anonymous: false
                    }
                ]
            ])
            const feedbacks = container.getElementsByClassName('invalid-feedback')
            expect(feedbacks.length).toEqual(3)
            for (let i = 0; i < feedbacks.length; ++i) {
                expect(feedbacks[i].textContent).toEqual('')
            }
        })
    })
    test('valid submit with checkboxes on', async () => {
        const onSubmit = jest.fn()
        const { container } = render(
            <UploadForm
                clearUploadErrorCallback={jest.fn()}
                onSubmit={onSubmit}
                uploadErrorMsg=""
            />
        )
        const feedbacks = container.getElementsByClassName('invalid-feedback')
        for (let i = 0; i < feedbacks.length; ++i) {
            expect(feedbacks[i].textContent).toEqual('')
        }
        const user = userEvent.setup()
        const inputs = screen.getAllByRole('textbox')
        expect(inputs.length).toEqual(2)
        await user.type(inputs[0], nameTest)
        await user.type(inputs[1], descriptionTest)
        const fileInput = container.getElementsByClassName('form-control')[2]
        await user.upload(fileInput as HTMLElement, fileTest)
        const checkboxes = screen.getAllByRole('checkbox')
        for (let i = 0; i < checkboxes.length; ++i) {
            await user.click(checkboxes[i])
        }
        const button = screen.getByText('Submit')
        await user.click(button)
        await waitFor(() => {
            expect(onSubmit.mock.calls).toEqual([
                [
                    {
                        name: nameTest,
                        description: descriptionTest,
                        file: fileTest,
                        hasHeader: true,
                        anonymous: true
                    }
                ]
            ])
            const feedbacks = container.getElementsByClassName('invalid-feedback')
            expect(feedbacks.length).toEqual(3)
            for (let i = 0; i < feedbacks.length; ++i) {
                expect(feedbacks[i].textContent).toEqual('')
            }
        })
    })
})
