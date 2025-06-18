/**
 * @vitest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react'
import { RegistrationForm } from '../registration_form'
import { vi } from 'vitest'

import userEvent from '@testing-library/user-event'
test('renders without error set', async () => {
    const registrationCallback = vi.fn()
    render(<RegistrationForm registrationCallback={registrationCallback} />)
    const textInputs = screen.getAllByRole('textbox')
    expect(textInputs.length).toEqual(5)
    screen.getByLabelText('Password')
    screen.getByLabelText('Repeat password')
    const button = screen.getByRole('button')
    expect(button.textContent).toEqual('Register')
    const errorTooltip = screen.queryByRole('tooltip')
    expect(errorTooltip).toBeNull()
})

test('can register', async () => {
    const registrationCallback = vi.fn()
    const closeRegistrationCallback = vi.fn()
    render(<RegistrationForm registrationCallback={registrationCallback} />)
    const user = userEvent.setup()
    const textInputs = screen.getAllByRole('textbox')
    expect(textInputs.length).toEqual(5)
    await user.type(textInputs[0], 'username')
    await user.type(textInputs[1], 'mail@test.url')
    await user.type(textInputs[2], 'names personal')
    const passwordInput = screen.getByLabelText('Password')
    const password = 'PassWord1234!'
    await user.type(passwordInput, password)
    const repeatPasswordInput = screen.getByLabelText('Repeat password')
    await user.type(repeatPasswordInput, password)
    const sshKey =
        'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOCRgyFQbGG49qSpof220k8XRD3GtsihohMkxGVuvnaU user@machine'
    await user.click(textInputs[4])
    user.paste(sshKey)
    await waitFor(() => {
        const button = screen.getByRole('button', { name: /register/i })
        user.click(button)
    })
    await waitFor(() => {
        expect(registrationCallback.mock.calls).toEqual([
            [
                {
                    username: 'username',
                    email: 'mail@test.url',
                    namesPersonal: 'names personal',
                    namesFamily: '',
                    password,
                    sshKey
                }
            ]
        ])
        expect(closeRegistrationCallback.mock.calls).toEqual([])
    })
})
