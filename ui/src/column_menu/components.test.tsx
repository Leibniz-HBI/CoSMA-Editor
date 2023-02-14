/**
 * @jest-environment jsdom
 */

import { describe } from '@jest/globals'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ColumnAddButton, ColumnMenu, constructColumnTitle } from './components'
import { useColumnMenu } from './hooks'
import { ColumnDefinition, ColumnType } from './state'
jest.mock('./hooks', () => {
    return {
        useColumnMenu: jest.fn().mockImplementation()
    }
})

describe('create column name', () => {
    const levels = ['first', 'second', 'third', 'fourth']
    test('empty', () => {
        expect(constructColumnTitle([])).toBe('UNKNOWN')
    })
    test('single level', () => {
        expect(constructColumnTitle(levels.slice(0, 1))).toBe('first')
    })
    test('two levels', () => {
        expect(constructColumnTitle(levels.slice(0, 2))).toBe('first -> second')
    })
    test('three levels', () => {
        expect(constructColumnTitle(levels.slice(0, 3))).toBe(
            'first -> second -> third'
        )
    })
    test('four levels', () => {
        expect(constructColumnTitle(levels.slice(0, 4))).toBe(
            'first -> ... -> third -> fourth'
        )
    })
})

describe('ColumnAddMenu', () => {
    const idTest = 'id_column_test'
    const nameTest = 'Name Test'

    const columnDefinitionTest = new ColumnDefinition({
        namePath: [nameTest],
        idPersistent: idTest,
        idParentPersistent: undefined,
        columnType: ColumnType.String,
        version: 0
    })
    test('click items', async () => {
        let triggered = undefined
        function trigger(id: ColumnDefinition) {
            triggered = id
        }
        ;(useColumnMenu as jest.Mock).mockReturnValue([columnDefinitionTest])
        const user = userEvent.setup()
        const { container } = render(<ColumnMenu addColumnCallback={trigger} />)
        const button = container.getElementsByClassName('cosmae-column-menu-item')[0]
        await user.click(button)
        expect(triggered).toBe(columnDefinitionTest)
    })
})

describe('ColumnAddButton', () => {
    test('triggers', async () => {
        let triggered = false
        function trigger() {
            triggered = true
        }
        const user = userEvent.setup()
        const { container } = render(
            <ColumnAddButton onClick={trigger}>click</ColumnAddButton>
        )
        const button = container.getElementsByClassName('cosmae-column-add-button')
        await user.click(button[0])
        expect(triggered).toBeTruthy()
    })
})
