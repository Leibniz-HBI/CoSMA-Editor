/**
 * @vitest-environment jsdom
 */
import { render, waitFor, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from '../login_form'
import { vi } from 'vitest'

test('renders without error set', () => {
    const loginCallback = vi.fn()
    const toggleRegistrationCallback = vi.fn()
    const { container } = render(
        <LoginForm
            loginCallback={loginCallback}
            openRegistrationCallback={toggleRegistrationCallback}
        />
    )
    const textInputs = screen.getAllByRole('textbox')
    expect(textInputs.length).toEqual(1)
    const passwordInputs = screen.getAllByLabelText('Password')
    expect(passwordInputs.length).toEqual(1)
    const buttons = container.getElementsByTagName('button')
    expect(buttons.length).toEqual(2)
    expect(buttons[0].textContent).toEqual('Registration')
    expect(buttons[1].textContent).toEqual('Login')
    const errorTooltip = screen.queryByRole('tooltip')
    expect(errorTooltip).toBeNull()
})

test('handles login', async () => {
    const loginCallback = vi.fn()
    const toggleRegistrationCallback = vi.fn()
    const { container } = render(
        <LoginForm
            loginCallback={loginCallback}
            openRegistrationCallback={toggleRegistrationCallback}
        />
    )
    const user = userEvent.setup()
    const textInput = screen.getByRole('textbox')
    const passwordInput = screen.getByLabelText('Password')
    await user.type(textInput, 'username')
    await user.type(passwordInput, 'password')
    const buttons = container.getElementsByTagName('button')
    await user.click(buttons[1])
    await waitFor(() => {
        expect(loginCallback.mock.calls).toEqual([['username', 'password']])
        expect(toggleRegistrationCallback.mock.calls).toEqual([])
    })
})

test('handles registration toggle', async () => {
    const loginCallback = vi.fn()
    const clearLoginErrorCallback = vi.fn()
    const toggleRegistrationCallback = vi.fn()
    const { container } = render(
        <LoginForm
            loginCallback={loginCallback}
            openRegistrationCallback={toggleRegistrationCallback}
        />
    )
    const user = userEvent.setup()
    const buttons = container.getElementsByTagName('button')
    await user.click(buttons[0])
    await waitFor(() => {
        expect(loginCallback.mock.calls).toEqual([])
        expect(clearLoginErrorCallback.mock.calls).toEqual([])
        expect(toggleRegistrationCallback.mock.calls.length).toEqual(1)
    })
})
