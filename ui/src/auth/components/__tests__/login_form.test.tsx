/**
 * @vitest-environment jsdom
 */
import { render, waitFor, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from '../login_form'
import { vi } from 'vitest'

test('renders without error set', () => {
    const loginCallback = vi.fn()
    render(<LoginForm loginCallback={loginCallback} />)
    const textInputs = screen.getAllByRole('textbox')
    expect(textInputs.length).toEqual(1)
    const passwordInputs = screen.getAllByLabelText('Password')
    expect(passwordInputs.length).toEqual(1)
    const button = screen.getByRole('button')
    expect(button.textContent).toEqual('Login')
    const errorTooltip = screen.queryByRole('tooltip')
    expect(errorTooltip).toBeNull()
})

test('handles login', async () => {
    const loginCallback = vi.fn()
    const toggleRegistrationCallback = vi.fn()
    render(<LoginForm loginCallback={loginCallback} />)
    const user = userEvent.setup()
    const textInput = screen.getByRole('textbox')
    const passwordInput = screen.getByLabelText('Password')
    await user.type(textInput, 'username')
    await user.type(passwordInput, 'password')
    const button = screen.getByRole('button')
    await user.click(button)
    await waitFor(() => {
        expect(loginCallback.mock.calls).toEqual([['username', 'password']])
        expect(toggleRegistrationCallback.mock.calls).toEqual([])
    })
})
