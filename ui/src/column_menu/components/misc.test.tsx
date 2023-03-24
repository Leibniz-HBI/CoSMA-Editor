/**
 * @jest-environment jsdom
 */
import { describe } from '@jest/globals'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ColumnAddButton } from './misc'

describe('ColumnAddButton', () => {
    test('triggers', async () => {
        let triggered = false
        function trigger() {
            triggered = true
        }
        const user = userEvent.setup()
        const { container } = render(
            <ColumnAddButton onClick={trigger}>click</ColumnAddButton>
        )
        const button = container.getElementsByClassName('cosmae-column-add-button')
        await user.click(button[0])
        expect(triggered).toBeTruthy()
    })
})
