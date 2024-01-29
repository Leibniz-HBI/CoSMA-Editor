/**
 * @jest-environment jsdom
 */
import { describe } from '@jest/globals'
import { render, waitFor, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { newErrorState } from '../../../util/error/slice'
import { ColumnTypeCreateForm, ColumnTypeCreateFormProps } from '../form'
import { useDispatch, useSelector } from 'react-redux'
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
        const { container } = render(
            <ColumnTypeCreateForm>{childTest}</ColumnTypeCreateForm>
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
        const { container } = render(
            <ColumnTypeCreateForm>{childTest}</ColumnTypeCreateForm>
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
        const { container } = render(
            <ColumnTypeCreateForm>{childTest}</ColumnTypeCreateForm>
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
        const { container } = render(
            <ColumnTypeCreateForm>{childTest}</ColumnTypeCreateForm>
        )
        const dispatchMock = useDispatch() as jest.Mock
        dispatchMock.mockReset().mockReturnValue(Promise.resolve(true))
        const errorClasses = container.getElementsByClassName('text-danger fs-6')
        expect(errorClasses.length).toEqual(0)
        const textInput = screen.getByRole('textbox') as HTMLInputElement
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
        await waitFor(() =>
            expect(container.getElementsByClassName('text-danger fs-6').length).toEqual(
                0
            )
        )
        const fetchMock = jest.fn()
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
                        tag_definitions: [{ name: inputTest, type: 'STRING' }]
                    })
                }
            ]
        ])
    })
    test('popover when error', async () => {
        ;(useSelector as jest.Mock).mockReturnValue(newErrorState('test error'))
        const { container } = render(
            <ColumnTypeCreateForm>{childTest}</ColumnTypeCreateForm>
        )
        const overlay = screen.getByRole('tooltip')
        expect(overlay.textContent).toEqual('Error' + 'test error')
        const closeButtons = container.getElementsByClassName(
            'btn-close btn-close-white'
        )
        const user = userEvent.setup()
        await user.click(closeButtons[0])
        expect((useDispatch() as jest.Mock).mock.calls.length).toEqual(1)
    })
})
