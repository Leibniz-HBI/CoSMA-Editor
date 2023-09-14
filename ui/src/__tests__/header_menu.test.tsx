/**
 * @jest-environment jsdom
 */

import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HeaderMenu } from '../header_menu'

describe('header menu', () => {
    test('close', async () => {
        let closed = false
        function doClose() {
            closed = true
        }
        const user = userEvent.setup()
        const { container } = render(
            <HeaderMenu closeHeaderMenuCallback={doClose} menuEntries={[]} />
        )
        const button = container.getElementsByClassName('btn-close')[0]
        await user.click(button)
        expect(closed).toBeTruthy()
    })
    test('uses callback', async () => {
        let closed = false
        let hidden = false
        function doClose() {
            closed = true
        }
        function doHide() {
            hidden = true
        }
        const user = userEvent.setup()
        const { container } = render(
            <HeaderMenu
                closeHeaderMenuCallback={doClose}
                menuEntries={[{ label: 'action', labelClassName: '', onClick: doHide }]}
            />
        )
        const button = container.getElementsByClassName('list-group-item')[0]
        await user.click(button)
        expect(closed).toBeTruthy()
        expect(hidden).toBeTruthy()
    })
})
