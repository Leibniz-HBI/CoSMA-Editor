/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from '@testing-library/react'
import { Remote } from '../../../util/state'
import { Contribution, ContributionStep } from '../../state'
import { useContributionDetails } from '../hooks'
import { ContributionDetailsStep } from '../components'
import userEvent from '@testing-library/user-event'

jest.mock('../hooks', () => {
    return {
        useContributionDetails: jest.fn()
    }
})

jest.mock('react-router-dom', () => {
    const mockNavigate = jest.fn()
    return {
        useNavigate: jest.fn().mockReturnValue(mockNavigate),
        useLoaderData: jest.fn().mockReturnValue('id-test-0')
    }
})

const contributionTest = new Contribution({
    name: 'contribution test 0',
    description: 'this is a contribution for tests with sufficient length.',
    step: ContributionStep.Uploaded,
    idPersistent: 'id-test-0',
    anonymous: true,
    hasHeader: false
})

describe('rendering', () => {
    test('loading', async () => {
        ;(useContributionDetails as jest.Mock).mockReturnValue({
            remoteContribution: new Remote(undefined, true),
            loadContributionDetailsCallback: jest.fn()
        })
        const { container } = render(<ContributionDetailsStep />)
        const shimmers = container.getElementsByClassName('shimmer')
        expect(shimmers.length).toEqual(1)
        const cols = container.getElementsByClassName('col')
        expect(cols.length).toEqual(0)
    })
    test('show stepper', async () => {
        ;(useContributionDetails as jest.Mock).mockReturnValue({
            remoteContribution: new Remote(contributionTest, false),
            patchContribution: new Remote(false),
            loadContributionDetailsCallback: jest.fn()
        })
        const { container } = render(<ContributionDetailsStep />)
        const shimmers = container.getElementsByClassName('shimmer')
        expect(shimmers.length).toEqual(0)
        screen.getByText('Metadata')
        screen.getByText('Columns')
        screen.getByText('Entities')
        const inputs = screen.getAllByRole('textbox')
        expect(inputs.length).toEqual(2)
        const checkboxes = screen.getAllByRole('checkbox')
        expect(checkboxes.length).toEqual(2)
    })
})
describe('form', () => {
    test('no submit for empty input', async () => {
        const patch = jest.fn()
        ;(useContributionDetails as jest.Mock).mockReturnValue({
            remoteContribution: new Remote(contributionTest, false),
            patchContribution: new Remote(false),
            patchContributionDetailsCallback: patch,
            loadContributionDetailsCallback: jest.fn()
        })
        const { container } = render(<ContributionDetailsStep />)
        const feedbacks = container.getElementsByClassName('invalid-feedback')
        for (let i = 0; i < feedbacks.length; ++i) {
            expect(feedbacks[i].textContent).toEqual('')
        }
        const user = userEvent.setup()
        const inputs = screen.getAllByRole('textbox')
        await user.clear(inputs[0])
        await user.clear(inputs[1])
        const button = screen.getByText('Edit')
        await user.click(button)
        await waitFor(() => {
            expect(patch.mock.calls).toEqual([])
            const feedbacks = container.getElementsByClassName('invalid-feedback')
            expect(feedbacks.length).toEqual(2)
            for (let i = 0; i < feedbacks.length; ++i) {
                expect(feedbacks[i].textContent).not.toEqual('')
            }
        })
    })
    test('no submit for short input', async () => {
        const patch = jest.fn()
        ;(useContributionDetails as jest.Mock).mockReturnValue({
            remoteContribution: new Remote(contributionTest, false),
            patchContribution: new Remote(false),
            patchContributionDetailsCallback: patch,
            loadContributionDetailsCallback: jest.fn()
        })
        const { container } = render(<ContributionDetailsStep />)
        const feedbacks = container.getElementsByClassName('invalid-feedback')
        for (let i = 0; i < feedbacks.length; ++i) {
            expect(feedbacks[i].textContent).toEqual('')
        }
        const user = userEvent.setup()
        const inputs = screen.getAllByRole('textbox')
        await user.clear(inputs[0])
        await user.type(inputs[0], 'aa')
        await user.clear(inputs[1])
        await user.type(inputs[1], 'bb')
        const button = screen.getByText('Edit')
        await user.click(button)
        await waitFor(() => {
            expect(patch.mock.calls).toEqual([])
            const feedbacks = container.getElementsByClassName('invalid-feedback')
            expect(feedbacks.length).toEqual(2)
            for (let i = 0; i < feedbacks.length; ++i) {
                expect(feedbacks[i].textContent).not.toEqual('')
            }
        })
    })
    test('submit for valid input', async () => {
        const patch = jest.fn()
        ;(useContributionDetails as jest.Mock).mockReturnValue({
            remoteContribution: new Remote(contributionTest, false),
            patchContribution: new Remote(false),
            patchContributionDetailsCallback: patch,
            loadContributionDetailsCallback: jest.fn()
        })
        const { container } = render(<ContributionDetailsStep />)
        const feedbacks = container.getElementsByClassName('invalid-feedback')
        for (let i = 0; i < feedbacks.length; ++i) {
            expect(feedbacks[i].textContent).toEqual('')
        }
        const user = userEvent.setup()
        const inputs = screen.getAllByRole('textbox')
        await user.type(inputs[0], 'aa')
        await user.type(inputs[1], 'bb')
        const button = screen.getByText('Edit')
        await user.click(button)
        await waitFor(() => {
            expect(patch.mock.calls).toEqual([
                [
                    {
                        name: contributionTest.name + 'aa',
                        description: contributionTest.description + 'bb',
                        anonymous: true,
                        hasHeader: false
                    }
                ]
            ])
            const feedbacks = container.getElementsByClassName('invalid-feedback')
            expect(feedbacks.length).toEqual(2)
            for (let i = 0; i < feedbacks.length; ++i) {
                expect(feedbacks[i].textContent).toEqual('')
            }
        })
    })
})
