/**
 * @vitest-environment jsdom
 */
import { render, waitFor, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ColumnCreateForm, ColumnTypeCreateFormProps } from '../form'
import { useDispatch } from 'react-redux'
import { vi, Mock } from 'vitest'
import { act } from 'react'
vi.mock('react-redux', () => {
    const dispatchMock = vi.fn()
    return {
        // eslint-disable-next-line
        useSelector: vi.fn(),
        useDispatch: vi.fn().mockImplementation(() => dispatchMock)
    }
})

describe('form tests', () => {
    beforeEach(() => {
        ;(useDispatch() as Mock).mockClear()
    })
    function childTest(formProps?: ColumnTypeCreateFormProps) {
        const testClassName = 'testClassName'
        return <li className={testClassName}>{formProps?.selectedParent}</li>
    }
    test('empty submit will result in red text labels', async () => {
        const { container } = render(<ColumnCreateForm>{childTest}</ColumnCreateForm>)
        expectErrorsEmpty(container)
        const buttons = container.getElementsByTagName('button')
        const user = userEvent.setup()
        await user.click(buttons[0])
        await expectErrorsHaveContent(container)
    })
    test('type only submit will result in red name label', async () => {
        const { container } = render(<ColumnCreateForm>{childTest}</ColumnCreateForm>)
        const errorClasses = container.getElementsByClassName('text-danger fs-6')
        expect(errorClasses.length).toEqual(0)
        const radioButtons = container.getElementsByClassName('form-check-input')
        const buttons = container.getElementsByTagName('button')
        const user = userEvent.setup()
        await user.click(radioButtons[1])
        await user.click(buttons[0])
        await waitFor(async () => {
            await expectErrorsHaveContent(container)
        })
    })
    test('name only submit will result in red type label', async () => {
        const { container } = render(<ColumnCreateForm>{childTest}</ColumnCreateForm>)
        expectErrorsEmpty(container)
        const textInput = screen.getAllByRole('textbox')[0]
        const buttons = container.getElementsByTagName('button')
        const user = userEvent.setup()
        await act(async () => {
            await user.type(textInput, 'bla test')
            await user.click(buttons[0])
        })
        await waitFor(async () => {
            await expectErrorsHaveContent(container)
        })
    })
    test('submit handled for complete form', async () => {
        const { container } = render(<ColumnCreateForm>{childTest}</ColumnCreateForm>)
        const dispatchMock = useDispatch() as Mock
        dispatchMock.mockReset().mockReturnValue(Promise.resolve(true))
        expectErrorsEmpty(container)
        const [textInput, buttons, radioButtons] = await waitFor(() => {
            const textInput = screen.getAllByRole('textbox')[0] as HTMLInputElement
            const buttons = container.getElementsByTagName('button')
            const radioButtons = container.getElementsByClassName('form-check-input')
            return [textInput, buttons, radioButtons]
        })
        const user = userEvent.setup()
        const inputTest = 'bla test'
        await user.type(textInput, inputTest)
        await waitFor(() => {
            expect(textInput.value).toEqual(inputTest)
        })
        await user.click(radioButtons[1])
        await user.click(buttons[0])
        await waitFor(() => {
            const mockCalls = (dispatchMock as Mock).mock.calls
            expect(mockCalls.length).toEqual(2)
        })
    })
})
async function expectErrorsHaveContent(container: HTMLElement) {
    await waitFor(() => {
        const errorClasses = container.getElementsByClassName('invalid-feedback')
        let isEmpty = false
        for (const error of errorClasses) {
            isEmpty ||= !(error.textContent == '')
        }
        expect(isEmpty).toBeTruthy()
    })
}

function expectErrorsEmpty(container: HTMLElement) {
    const errorClasses = container.getElementsByClassName('invalid-feedback')
    for (const error of errorClasses) {
        expect(error.textContent).toEqual('')
    }
}
