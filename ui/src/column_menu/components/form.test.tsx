/**
 * @jest-environment jsdom
 */
import { describe } from '@jest/globals'
import { render, waitFor, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ErrorState } from '../../util/error'
import { ColumnTypeCreateForm, ColumnTypeCreateFormProps } from './form'

describe('form tests', () => {
    function childTest(formProps?: ColumnTypeCreateFormProps) {
        const testClassName = 'testClassName'
        return <li className={testClassName}>{formProps?.selectedParent}</li>
    }
    test('empty submit will result in red text labels', async () => {
        const submitCallback = jest.fn()
        const { container } = render(
            <ColumnTypeCreateForm
                submitColumnDefinitionCallback={submitCallback}
                clearError={jest.fn()}
            >
                {childTest}
            </ColumnTypeCreateForm>
        )
        const errorClasses = container.getElementsByClassName('text-danger fs-6')
        expect(errorClasses.length).toEqual(0)
        const buttons = container.getElementsByTagName('button')
        const user = userEvent.setup()
        await user.click(buttons[0])
        await waitFor(() =>
            expect(container.getElementsByClassName('text-danger fs-6').length).toEqual(
                2
            )
        )
    })
    test('type only submit will result in red name label', async () => {
        const submitCallback = jest.fn()
        const { container } = render(
            <ColumnTypeCreateForm
                submitColumnDefinitionCallback={submitCallback}
                clearError={jest.fn()}
            >
                {childTest}
            </ColumnTypeCreateForm>
        )
        const errorClasses = container.getElementsByClassName('text-danger fs-6')
        expect(errorClasses.length).toEqual(0)
        const radioButtons = container.getElementsByClassName('form-check-input')
        const buttons = container.getElementsByTagName('button')
        const user = userEvent.setup()
        await user.click(radioButtons[1])
        await user.click(buttons[0])
        await waitFor(() =>
            expect(container.getElementsByClassName('text-danger fs-6').length).toEqual(
                1
            )
        )
    })
    test('text only submit will result in red type label', async () => {
        const submitCallback = jest.fn()
        const { container } = render(
            <ColumnTypeCreateForm
                submitColumnDefinitionCallback={submitCallback}
                clearError={jest.fn()}
            >
                {childTest}
            </ColumnTypeCreateForm>
        )
        const errorClasses = container.getElementsByClassName('text-danger fs-6')
        expect(errorClasses.length).toEqual(0)
        const textInput = screen.getByRole('textbox')
        const buttons = container.getElementsByTagName('button')
        const user = userEvent.setup()
        await user.type(textInput, 'bla test')
        await user.click(buttons[0])
        await waitFor(() =>
            expect(container.getElementsByClassName('text-danger fs-6').length).toEqual(
                1
            )
        )
    })
    test('submit handled for complete form', async () => {
        const submitCallback = jest.fn()
        const { container } = render(
            <ColumnTypeCreateForm
                submitColumnDefinitionCallback={submitCallback}
                clearError={jest.fn()}
            >
                {childTest}
            </ColumnTypeCreateForm>
        )
        const errorClasses = container.getElementsByClassName('text-danger fs-6')
        expect(errorClasses.length).toEqual(0)
        const textInput = screen.getByRole('textbox')
        const buttons = container.getElementsByTagName('button')
        const radioButtons = container.getElementsByClassName('form-check-input')
        const user = userEvent.setup()
        const inputTest = 'bla test'
        await user.type(textInput, inputTest)
        await user.click(radioButtons[1])
        await user.click(buttons[0])
        await waitFor(() =>
            expect(container.getElementsByClassName('text-danger fs-6').length).toEqual(
                0
            )
        )
        expect(submitCallback.mock.calls).toEqual([
            [{ columnTypeIdx: 0, name: inputTest, idParentPersistent: undefined }]
        ])
    })
    test('popover when error', async () => {
        const submitCallback = jest.fn()
        const closeCallback = jest.fn()
        const { container } = render(
            <ColumnTypeCreateForm
                submitColumnDefinitionCallback={submitCallback}
                submitError={new ErrorState('test error')}
                clearError={closeCallback}
            >
                {childTest}
            </ColumnTypeCreateForm>
        )
        const overlay = screen.getByRole('tooltip')
        expect(overlay.textContent).toEqual('Error' + 'test error')
        const closeButtons = container.getElementsByClassName(
            'btn-close btn-close-white'
        )
        const user = userEvent.setup()
        await user.click(closeButtons[0])
        expect(closeCallback.mock.calls.length).toEqual(1)
    })
    test('popover has retry button when callback', async () => {
        const submitCallback = jest.fn()
        const closeCallback = jest.fn()
        const retryCallback = jest.fn()
        render(
            <ColumnTypeCreateForm
                submitColumnDefinitionCallback={submitCallback}
                submitError={new ErrorState('test error', retryCallback)}
                clearError={closeCallback}
            >
                {childTest}
            </ColumnTypeCreateForm>
        )
        const retryButton = screen.getByText('Retry')
        const user = userEvent.setup()
        await user.click(retryButton)
        expect(retryCallback.mock.calls.length).toEqual(1)
    })
})
