/**
 * @jest-environment jsdom
 */

import { describe } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ColumnMenu } from './menu'
import { ColumnDefinition, ColumnSelectionEntry, ColumnType } from '../state'
import { useRemoteColumnMenuData } from '../hooks'
import { ColumnMenuTab } from '../actions'
jest.mock('../hooks', () => {
    return {
        useRemoteColumnMenuData: jest.fn().mockImplementation()
    }
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
    describe('load tab', () => {
        test('renders components', async () => {
            ;(useRemoteColumnMenuData as jest.Mock).mockReturnValue({
                isLoading: false,
                navigationEntries: [nestedColumnSelectionEntryTest],
                // eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-empty-function
                toggleExpansionCallback: jest.fn(),
                getHierarchyCallback: jest.fn()
            })
            const { container } = render(
                <ColumnMenu
                    baseUrl={'http://test.url'}
                    loadColumnDataCallback={jest.fn()}
                    columnIndices={new Map()}
                />
            )
            const tabLinks = container.getElementsByClassName(
                'nav-link active bg-light'
            )
            expect(tabLinks.length).toEqual(1)
            expect(tabLinks[0].textContent).toEqual('Load')
            const textInputs = screen.getAllByRole('textbox')
            expect(textInputs.length).toEqual(1)
            const radioButton = screen.queryByRole('radio')
            expect(radioButton).toBeNull()
            const buttons = container.getElementsByClassName('btn btn-primary')
            expect(buttons.length).toEqual(0)
        })
        test('switch tab callback is called', async () => {
            const selectTabCallback = jest.fn()
            ;(useRemoteColumnMenuData as jest.Mock).mockReturnValue({
                isLoading: false,
                navigationEntries: [nestedColumnSelectionEntryTest],
                toggleExpansionCallback: jest.fn(),
                selectTabCallback: selectTabCallback,
                getHierarchyCallback: jest.fn()
            })
            render(
                <ColumnMenu
                    baseUrl={'http://test.url'}
                    loadColumnDataCallback={jest.fn()}
                    columnIndices={new Map()}
                />
            )
            const tab = screen.getByText('Create')
            const user = userEvent.setup()
            await user.click(tab)
            expect(selectTabCallback.mock.calls).toEqual([[ColumnMenuTab.CREATE_NEW]])
        })
        describe('click items', () => {
            test('select column', async () => {
                let triggered = undefined
                function trigger(id: ColumnDefinition) {
                    triggered = id
                }
                ;(useRemoteColumnMenuData as jest.Mock).mockReturnValue({
                    isLoading: false,
                    navigationEntries: [singleColumnSelectionEntryTest],
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-empty-function
                    toggleExpansionCallback: (path: number[]) => {},
                    getHierarchyCallback: jest.fn()
                })
                const user = userEvent.setup()
                const { container } = render(
                    <ColumnMenu
                        baseUrl={'http://test.url'}
                        loadColumnDataCallback={trigger}
                        columnIndices={new Map()}
                    />
                )
                const button = container.getElementsByClassName('icon')[1]
                await user.click(button)
                expect(triggered).toBe(columnDefinitionTest)
            })
            test('use expand callback', async () => {
                let togglePath: number[] = []
                ;(useRemoteColumnMenuData as jest.Mock).mockReturnValue({
                    isLoading: false,
                    navigationEntries: [nestedColumnSelectionEntryTest],
                    toggleExpansionCallback: (path: number[]) => {
                        togglePath = path
                    },
                    getHierarchyCallback: jest.fn()
                })
                const user = userEvent.setup()
                const { container } = render(
                    <ColumnMenu
                        baseUrl={'http://test.url'}
                        loadColumnDataCallback={() => {
                            return
                        }}
                        columnIndices={new Map()}
                    />
                )
                const entries = container.getElementsByClassName('list-group-item')
                expect(entries.length).toEqual(1)
                const buttons = entries[0].getElementsByClassName('icon')
                await user.click(buttons[0])
                expect(togglePath).toEqual([0])
            })
            test('uses collapse callback', async () => {
                let togglePath: number[] = []
                ;(useRemoteColumnMenuData as jest.Mock).mockReturnValue({
                    isLoading: false,
                    navigationEntries: [
                        new ColumnSelectionEntry({
                            ...nestedColumnSelectionEntryTest,
                            isExpanded: true
                        })
                    ],
                    toggleExpansionCallback: (path: number[]) => {
                        togglePath = path
                    },
                    getHierarchyCallback: jest.fn()
                })
                const user = userEvent.setup()
                const { container } = render(
                    <ColumnMenu
                        baseUrl={'http://test.url'}
                        loadColumnDataCallback={() => {
                            return
                        }}
                        columnIndices={new Map()}
                    />
                )
                const entries = container.getElementsByClassName('list-group-item')
                expect(entries.length).toEqual(2)
                const buttons = entries[0].getElementsByClassName('icon')
                await user.click(buttons[0])
                expect(togglePath).toEqual([0])
            })
        })
    })
    describe('create tab', () => {
        test('renders components', async () => {
            ;(useRemoteColumnMenuData as jest.Mock).mockReturnValue({
                isLoading: false,
                selectedTab: ColumnMenuTab.CREATE_NEW,
                navigationEntries: [nestedColumnSelectionEntryTest],
                // eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-empty-function
                toggleExpansionCallback: jest.fn(),
                getHierarchyCallback: jest.fn()
            })
            const { container } = render(
                <ColumnMenu
                    baseUrl={'http://test.url'}
                    loadColumnDataCallback={jest.fn()}
                    columnIndices={new Map()}
                />
            )
            const tabLinks = container.getElementsByClassName(
                'nav-link active bg-light'
            )
            expect(tabLinks.length).toEqual(1)
            expect(tabLinks[0].textContent).toEqual('Create')
            const textInputs = screen.getAllByRole('textbox')
            expect(textInputs.length).toEqual(2)
            const radioButtons = screen.getAllByRole('radio')
            const columnTypeRadios = radioButtons.filter(
                (e: HTMLElement) => e.getAttribute('name') == 'columnType'
            )
            expect(columnTypeRadios.length).toEqual(3)
            const parentRadios = radioButtons.filter(
                (e) => e.getAttribute('name') == 'parent'
            )
            expect(parentRadios.length).toEqual(2)
            const buttons = container.getElementsByClassName('btn btn-primary')
            expect(buttons.length).toEqual(1)
            expect(buttons[0].textContent).toEqual('Create')
        })
        test('switch tab callback is called', async () => {
            const selectTabCallback = jest.fn()
            ;(useRemoteColumnMenuData as jest.Mock).mockReturnValue({
                isLoading: false,
                selectedTab: ColumnMenuTab.CREATE_NEW,
                navigationEntries: [nestedColumnSelectionEntryTest],
                toggleExpansionCallback: jest.fn(),
                selectTabCallback: selectTabCallback,
                getHierarchyCallback: jest.fn()
            })
            render(
                <ColumnMenu
                    baseUrl={'http://test.url'}
                    loadColumnDataCallback={jest.fn()}
                    columnIndices={new Map()}
                />
            )
            const tab = screen.getByText('Load')
            const user = userEvent.setup()
            await user.click(tab)
            expect(selectTabCallback.mock.calls).toEqual([[ColumnMenuTab.SHOW]])
        })
    })
})
