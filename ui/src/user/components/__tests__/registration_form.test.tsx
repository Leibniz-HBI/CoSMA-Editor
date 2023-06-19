/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react'
import { RegistrationForm } from '../registration_form'
import { ErrorState } from '../../../util/error'

import userEvent from '@testing-library/user-event'
test('renders without error set', async () => {
    const registrationCallback = jest.fn()
    const closeRegistrationCallback = jest.fn()
    const clearRegistrationErrorCallback = jest.fn()
    const { container } = render(
        <RegistrationForm
            registrationCallback={registrationCallback}
            closeRegistrationCallback={closeRegistrationCallback}
            clearRegistrationErrorCallback={clearRegistrationErrorCallback}
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

test('renders with error set', async () => {
    const registrationCallback = jest.fn()
    const closeRegistrationCallback = jest.fn()
    const clearRegistrationErrorCallback = jest.fn()
    const { container } = render(
        <RegistrationForm
            registrationCallback={registrationCallback}
            closeRegistrationCallback={closeRegistrationCallback}
            clearRegistrationErrorCallback={clearRegistrationErrorCallback}
            registrationError={new ErrorState('error')}
        />
    )
    const textInputs = screen.getAllByRole('textbox')
    expect(textInputs.length).toEqual(4)
    screen.getByLabelText('Password')
    screen.getByLabelText('Repeat password')
    const buttons = container.getElementsByTagName('button')
    expect(buttons.length).toEqual(3)
    expect(buttons[0].textContent).toEqual('Login')
    expect(buttons[1].textContent).toEqual('Register')
    const button2ClassList = buttons[2].classList
    expect(button2ClassList.length).toEqual(2)
    expect(button2ClassList).toContain('btn-close')
    expect(button2ClassList).toContain('btn-close-white')
    const errorTooltip = screen.queryByRole('tooltip')
    // heading and message concatenated
    expect(errorTooltip?.textContent).toEqual('Errorerror')
})

test('can register', async () => {
    const registrationCallback = jest.fn()
    const closeRegistrationCallback = jest.fn()
    const clearRegistrationErrorCallback = jest.fn()
    const { container } = render(
        <RegistrationForm
            registrationCallback={registrationCallback}
            closeRegistrationCallback={closeRegistrationCallback}
            clearRegistrationErrorCallback={clearRegistrationErrorCallback}
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
    const buttons = container.getElementsByTagName('button')
    await user.click(buttons[2])
    waitFor(() => {
        expect(registrationCallback.mock.calls).toEqual([
            ['username', 'mail@test.url', 'names personal', 'password']
        ])
        expect(closeRegistrationCallback.mock.calls).toEqual([])
        expect(clearRegistrationErrorCallback.mock.calls).toEqual([])
    })
})

test('can cancel registration', async () => {
    const registrationCallback = jest.fn()
    const closeRegistrationCallback = jest.fn()
    const clearRegistrationErrorCallback = jest.fn()
    const { container } = render(
        <RegistrationForm
            registrationCallback={registrationCallback}
            closeRegistrationCallback={closeRegistrationCallback}
            clearRegistrationErrorCallback={clearRegistrationErrorCallback}
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
    const buttons = container.getElementsByTagName('button')
    await user.click(buttons[1])
    waitFor(() => {
        expect(registrationCallback.mock.calls).toEqual([])
        expect(closeRegistrationCallback.mock.calls.length).toEqual(1)
        expect(clearRegistrationErrorCallback.mock.calls).toEqual([])
    })
})

test('can close error', async () => {
    const registrationCallback = jest.fn()
    const closeRegistrationCallback = jest.fn()
    const clearRegistrationErrorCallback = jest.fn()
    const { container } = render(
        <RegistrationForm
            registrationCallback={registrationCallback}
            closeRegistrationCallback={closeRegistrationCallback}
            clearRegistrationErrorCallback={clearRegistrationErrorCallback}
            registrationError={new ErrorState('error')}
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
    const buttons = container.getElementsByTagName('button')
    const closeButton = buttons[2]
    expect(closeButton.textContent).toEqual('')
    await user.click(closeButton)
    waitFor(() => {
        expect(registrationCallback.mock.calls).toEqual([])
        expect(closeRegistrationCallback.mock.calls.length).toEqual(0)
        expect(clearRegistrationErrorCallback.mock.calls.length).toEqual(1)
    })
})
