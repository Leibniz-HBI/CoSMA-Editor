/**
 * @vitest-environment jsdom
 */
import { vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AddEntityForm } from '../components'
import { newRemote } from '../../util/state'
import userEvent from '@testing-library/user-event'

describe('Add entity form', () => {
    test('renders correctly', async () => {
        const state = newRemote(false)
        render(<AddEntityForm state={state} addEntityCallback={vi.fn()} />)
        const inputs = screen.getAllByRole('textbox')
        expect(inputs.length).toEqual(2)
        const button = screen.getByRole('button')
        expect(button.textContent).toEqual('Add Entity')
    })
    test('can submit', async () => {
        const state = newRemote(false)
        const addEntityCallback = vi.fn()
        render(<AddEntityForm state={state} addEntityCallback={addEntityCallback} />)
        const textBoxes = screen.getAllByRole('textbox')
        await userEvent.click(textBoxes[0])
        await userEvent.keyboard('display')
        await userEvent.click(textBoxes[1])
        const justification = 'justification for entity'
        await userEvent.keyboard(justification)
        const button = screen.getByRole('button')
        await userEvent.click(button)
        expect(addEntityCallback.mock.calls).toEqual([['display', justification]])
    })
})
