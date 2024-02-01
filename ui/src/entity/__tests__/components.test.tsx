/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { AddEntityForm } from '../components'
import { Remote } from '../../util/state'
import userEvent from '@testing-library/user-event'

describe('Add entity form', () => {
    test('renders correctly', async () => {
        const state = new Remote(false)
        render(<AddEntityForm state={state} addEntityCallback={jest.fn()} />)
        screen.getByRole('textbox')
        const button = screen.getByRole('button')
        expect(button.textContent).toEqual('Add Entity')
    })
    test('renders correctly success', async () => {
        const state = new Remote(true)
        render(<AddEntityForm state={state} addEntityCallback={jest.fn()} />)
        screen.getByRole('textbox')
        const button = screen.getByRole('button')
        expect(button.textContent).toEqual('Entity Added')
    })
    test('can submit', async () => {
        const state = new Remote(false)
        const addEntityCallback = jest.fn()
        render(<AddEntityForm state={state} addEntityCallback={addEntityCallback} />)
        const textBox = screen.getByRole('textbox')
        await userEvent.click(textBox)
        await userEvent.keyboard('display')
        const button = screen.getByRole('button')
        await userEvent.click(button)
        expect(addEntityCallback.mock.calls).toEqual([['display']])
    })
})
