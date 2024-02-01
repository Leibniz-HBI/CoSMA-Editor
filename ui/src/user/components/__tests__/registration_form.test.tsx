/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react'
import { RegistrationForm } from '../registration_form'

import userEvent from '@testing-library/user-event'
test('renders without error set', async () => {
    const registrationCallback = jest.fn()
    const closeRegistrationCallback = jest.fn()
    const { container } = render(
        <RegistrationForm
            registrationCallback={registrationCallback}
            closeRegistrationCallback={closeRegistrationCallback}
        />
    )
    const textInputs = screen.getAllByRole('textbox')
    expect(textInputs.length).toEqual(4)
    screen.getByLabelText('Password')
    screen.getByLabelText('Repeat password')
    const buttons = container.getElementsByTagName('button')
    expect(buttons.length).toEqual(2)
    expect(buttons[0].textContent).toEqual('Login')
    expect(buttons[1].textContent).toEqual('Register')
    const errorTooltip = screen.queryByRole('tooltip')
    expect(errorTooltip).toBeNull()
})

test('can register', async () => {
    const registrationCallback = jest.fn()
    const closeRegistrationCallback = jest.fn()
    render(
        <RegistrationForm
            registrationCallback={registrationCallback}
            closeRegistrationCallback={closeRegistrationCallback}
        />
    )
    const user = userEvent.setup()
    const textInputs = screen.getAllByRole('textbox')
    expect(textInputs.length).toEqual(4)
    await user.type(textInputs[0], 'username')
    await user.type(textInputs[1], 'mail@test.url')
    await user.type(textInputs[2], 'names personal')
    const passwordInput = screen.getByLabelText('Password')
    const password = 'PassWord1234!'
    await user.type(passwordInput, password)
    const repeatPasswordInput = screen.getByLabelText('Repeat password')
    await user.type(repeatPasswordInput, password)
    await waitFor(() => {
        const button = screen.getByRole('button', { name: /register/i })
        user.click(button)
    })
    await waitFor(() => {
        expect(registrationCallback.mock.calls).toEqual([
            [
                {
                    userName: 'username',
                    email: 'mail@test.url',
                    namesPersonal: 'names personal',
                    namesFamily: '',
                    password
                }
            ]
        ])
        expect(closeRegistrationCallback.mock.calls).toEqual([])
    })
})

test('can cancel registration', async () => {
    const registrationCallback = jest.fn()
    const closeRegistrationCallback = jest.fn()
    render(
        <RegistrationForm
            registrationCallback={registrationCallback}
            closeRegistrationCallback={closeRegistrationCallback}
        />
    )
    const user = userEvent.setup()
    const textInputs = screen.getAllByRole('textbox')
    expect(textInputs.length).toEqual(4)
    await user.type(textInputs[0], 'username')
    await user.type(textInputs[1], 'mail@test.url')
    await user.type(textInputs[2], 'names personal')
    const passwordInput = screen.getByLabelText('Password')
    await user.type(passwordInput, 'password')
    const repeatPasswordInput = screen.getByLabelText('Repeat password')
    await user.type(repeatPasswordInput, 'password')
    await waitFor(() => {
        const button = screen.getByRole('button', { name: /login/i })
        user.click(button)
    })
    await waitFor(() => {
        expect(registrationCallback.mock.calls).toEqual([])
        expect(closeRegistrationCallback.mock.calls.length).toEqual(1)
    })
})
