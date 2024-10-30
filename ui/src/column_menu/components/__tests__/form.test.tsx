/**
 * @jest-environment jsdom
 */
import { describe } from '@jest/globals'
import { render, waitFor, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TagCreateForm, ColumnTypeCreateFormProps } from '../form'
import { useDispatch } from 'react-redux'
jest.mock('react-redux', () => {
    const dispatchMock = jest.fn()
    return {
        // eslint-disable-next-line
        useSelector: jest.fn(),
        useDispatch: jest.fn().mockImplementation(() => dispatchMock)
    }
})

describe('form tests', () => {
    beforeEach(() => {
        ;(useDispatch() as jest.Mock).mockClear()
    })
    function childTest(formProps?: ColumnTypeCreateFormProps) {
        const testClassName = 'testClassName'
        return <li className={testClassName}>{formProps?.selectedParent}</li>
    }
    test('empty submit will result in red text labels', async () => {
        const { container } = render(<TagCreateForm>{childTest}</TagCreateForm>)
        expectErrorsEmpty(container)
        const buttons = container.getElementsByTagName('button')
        const user = userEvent.setup()
        await user.click(buttons[0])
        await expectErrorsHaveContent(container)
    })
    test('type only submit will result in red name label', async () => {
        const { container } = render(<TagCreateForm>{childTest}</TagCreateForm>)
        const errorClasses = container.getElementsByClassName('text-danger fs-6')
        expect(errorClasses.length).toEqual(0)
        const radioButtons = container.getElementsByClassName('form-check-input')
        const buttons = container.getElementsByTagName('button')
        const user = userEvent.setup()
        await user.click(radioButtons[1])
        await user.click(buttons[0])
        await expectErrorsHaveContent(container)
    })
    test('name only submit will result in red type label', async () => {
        const { container } = render(<TagCreateForm>{childTest}</TagCreateForm>)
        expectErrorsEmpty(container)
        const textInput = screen.getAllByRole('textbox')[0]
        const buttons = container.getElementsByTagName('button')
        const user = userEvent.setup()
        await user.type(textInput, 'bla test')
        await user.click(buttons[0])
        await expectErrorsHaveContent(container)
    })
    test('submit handled for complete form', async () => {
        const { container } = render(<TagCreateForm>{childTest}</TagCreateForm>)
        const dispatchMock = useDispatch() as jest.Mock
        dispatchMock.mockReset().mockReturnValue(Promise.resolve(true))
        expectErrorsEmpty(container)
        const textInput = screen.getAllByRole('textbox')[0] as HTMLInputElement
        const buttons = container.getElementsByTagName('button')
        const radioButtons = container.getElementsByClassName('form-check-input')
        const user = userEvent.setup()
        const inputTest = 'bla test'
        await user.type(textInput, inputTest)
        await waitFor(() => {
            expect(textInput.value).toEqual(inputTest)
        })
        await user.click(radioButtons[1])
        await user.click(buttons[0])
        const fetchMock = jest.fn()
        expectErrorsEmpty(container)
        await waitFor(() => {
            const mockCalls = (dispatchMock as jest.Mock).mock.calls
            expect(mockCalls.length).toEqual(2)
            mockCalls[0][0](jest.fn(), undefined, fetchMock)
        })
        expect(fetchMock.mock.calls).toEqual([
            [
                'http://127.0.0.1:8000/cosmae/api/tags/definitions',
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        tag_definitions: [
                            {
                                name: inputTest,
                                type: 'STRING',
                                description: '',
                                disabled: false
                            }
                        ]
                    })
                }
            ]
        ])
    })
})
async function expectErrorsHaveContent(container: HTMLElement) {
    await waitFor(() => {
        const errorClasses = container.getElementsByClassName('invalid-feedback')
        let isEmpty = false
        for (const error of errorClasses) {
            isEmpty ||= !(error.textContent == '')
        }
        expect(isEmpty).toBeFalsy
    })
}

function expectErrorsEmpty(container: HTMLElement) {
    const errorClasses = container.getElementsByClassName('invalid-feedback')
    for (const error of errorClasses) {
        expect(error.textContent).toEqual('')
    }
}
