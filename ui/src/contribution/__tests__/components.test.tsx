/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import { Remote } from '../../util/state'
import { useContribution } from '../hooks'
import { ContributionList } from '../components'
import { ContributionStep, newContribution } from '../state'
import { useNavigate } from 'react-router-dom'
import { act } from 'react-dom/test-utils'

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
const authorTest = 'author test'
const testContributions = new Remote(
    [
        newContribution({
            name: 'contribution test 0',
            description: 'a contribution for tests',
            step: ContributionStep.Uploaded,
            idPersistent: 'id-test-0',
            hasHeader: false,
            author: authorTest
        }),
        newContribution({
            name: 'contribution test 1',
            description: 'another contribution for tests',
            step: ContributionStep.ColumnsExtracted,
            idPersistent: 'id-test-1',
            author: authorTest,
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
