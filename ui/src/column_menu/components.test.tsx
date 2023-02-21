/**
 * @jest-environment jsdom
 */

import { describe } from '@jest/globals'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ColumnAddButton, ColumnMenu, constructColumnTitle } from './components'
import { allNavigationSelectionEntries } from './columns_structured'
import { ColumnDefinition, ColumnSelectionEntry, ColumnType } from './state'
jest.mock('./columns_structured', () => {
    return {
        allNavigationSelectionEntries: jest.fn().mockImplementation()
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
    const idTest1 = 'id_column_test_1'
    const nameTest = 'Name Test'

    const columnDefinitionTest = new ColumnDefinition({
        namePath: [nameTest],
        idPersistent: idTest,
        idParentPersistent: undefined,
        columnType: ColumnType.String,
        version: 0
    })

    const singleColumnSelectionEntryTest = new ColumnSelectionEntry({
        columnDefinition: columnDefinitionTest
    })

    const nestedColumnSelectionEntryTest = new ColumnSelectionEntry({
        columnDefinition: new ColumnDefinition({
            ...columnDefinitionTest,
            idPersistent: idTest1,
            columnType: ColumnType.Inner
        }),
        children: [
            new ColumnSelectionEntry({ columnDefinition: columnDefinitionTest })
        ],
        isExpanded: false
    })
    describe('click items', () => {
        test('select column', async () => {
            let triggered = undefined
            function trigger(id: ColumnDefinition) {
                triggered = id
            }
            ;(allNavigationSelectionEntries as jest.Mock).mockReturnValue([
                singleColumnSelectionEntryTest
            ])
            const user = userEvent.setup()
            const { container } = render(
                <ColumnMenu
                    loadColumnDataCallback={trigger}
                    columnIndices={new Map()}
                />
            )
            const button = container.getElementsByClassName('list-group-item')[0]
            await user.click(button)
            expect(triggered).toBe(columnDefinitionTest)
        })
        test('expand', async () => {
            ;(allNavigationSelectionEntries as jest.Mock).mockReturnValue([
                nestedColumnSelectionEntryTest
            ])
            const user = userEvent.setup()
            const { container } = render(
                <ColumnMenu
                    loadColumnDataCallback={() => {
                        return
                    }}
                    columnIndices={new Map()}
                />
            )
            let buttons = container.getElementsByClassName('list-group-item')
            expect(buttons.length).toEqual(1)
            await user.click(buttons[0])
            buttons = container.getElementsByClassName('list-group-item')
            expect(buttons.length).toEqual(2)
        })
        test('collapse', async () => {
            ;(allNavigationSelectionEntries as jest.Mock).mockReturnValue([
                new ColumnSelectionEntry({
                    ...nestedColumnSelectionEntryTest,
                    isExpanded: true
                })
            ])
            const user = userEvent.setup()
            const { container } = render(
                <ColumnMenu
                    loadColumnDataCallback={() => {
                        return
                    }}
                    columnIndices={new Map()}
                />
            )
            let buttons = container.getElementsByClassName('list-group-item')
            expect(buttons.length).toEqual(2)
            await user.click(buttons[0])
            buttons = container.getElementsByClassName('list-group-item')
            expect(buttons.length).toEqual(1)
        })
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
