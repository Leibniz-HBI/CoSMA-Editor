/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ColumnDefinitionContribution } from '../state'
import {
    ColumnDefinitionStep,
    ColumnDefinitionStepListItem,
    CompleteColumnAssignmentButton,
    ContributionColumnAssignmentForm
} from '../components'
import { ColumnHierarchyContext } from '../../../column_menu/hooks'
import { useColumnDefinitionsContribution } from '../hooks'
import { Remote } from '../../../util/state'
import { Contribution, ContributionStep } from '../../state'

jest.mock('../hooks.ts', () => {
    return {
        ...jest.requireActual('../hooks.ts'),
        useColumnDefinitionsContribution: jest.fn()
    }
})
jest.mock('react-router-dom', () => {
    return {
        ...jest.requireActual('react-router-dom'),
        useLoaderData: jest.fn().mockReturnValue('contribution-id-test'),
        useNavigate: jest.fn()
    }
})

const columnDefinitionActiveTest = new ColumnDefinitionContribution({
    name: 'column definition test',
    idPersistent: 'id-column-test',
    indexInFile: 0,
    discard: false
})

describe('column definition step', () => {
    test('renders correctly', async () => {
        ;(useColumnDefinitionsContribution as jest.Mock).mockReturnValue({
            loadColumnDefinitionsContributionCallback: jest.fn(),
            selectColumnDefinitionContribution: jest.fn(),
            selectColumnCreationCallback: jest.fn(),
            setExistingCallback: jest.fn(),
            definitions: new Remote({
                activeDefinitionsList: [columnDefinitionActiveTest],
                discardedDefinitionsList: [],
                contributionCandidate: new Contribution({
                    name: 'test contribution',
                    idPersistent: 'id-test',
                    description: 'contribution for tests',
                    anonymous: true,
                    hasHeader: true,
                    step: ContributionStep.ColumnsExtracted
                })
            }),
            selectedColumnDefinition: new Remote(columnDefinitionActiveTest),
            finalizeColumnAssignment: new Remote(false),
            createTabSelected: false
        })
        const { container } = render(<ColumnDefinitionStep />)
        screen.getByTestId('contribution-stepper')
        const listGroups = container.getElementsByClassName('list-group')
        expect(listGroups.length).toEqual(2)
        screen.getByTestId('complete-column-assignment-button')
        screen.getByTestId('column-assignment-form-column')
        const errorPopover = screen.queryByRole('tooltip')
        expect(errorPopover).toBeNull()
    })

    test('show complete assignment error', () => {
        ;(useColumnDefinitionsContribution as jest.Mock).mockReturnValue({
            loadColumnDefinitionsContributionCallback: jest.fn(),
            selectColumnDefinitionContribution: jest.fn(),
            selectColumnCreationCallback: jest.fn(),
            setExistingCallback: jest.fn(),
            definitions: new Remote({
                activeDefinitionsList: [columnDefinitionActiveTest],
                discardedDefinitionsList: [],
                contributionCandidate: new Contribution({
                    name: 'test contribution',
                    idPersistent: 'id-test',
                    description: 'contribution for tests',
                    anonymous: true,
                    hasHeader: true,
                    step: ContributionStep.ColumnsExtracted
                })
            }),
            selectedColumnDefinition: new Remote(columnDefinitionActiveTest),
            finalizeColumnAssignment: new Remote(
                false,
                false,
                'column assignment finalization error'
            ),
            createTabSelected: false
        })
        render(<ColumnDefinitionStep />)
        const popover = screen.getByRole('tooltip')
        expect(popover.textContent).toEqual(
            ['Error', 'column assignment finalization error'].join('')
        )
    })
})

describe('column definition list item', () => {
    const columnDefinitionInactiveTest = new ColumnDefinitionContribution({
        ...columnDefinitionActiveTest,
        discard: true
    })
    test('not selected active render', async () => {
        render(
            <ColumnDefinitionStepListItem
                columnDefinition={columnDefinitionActiveTest}
                selected={false}
                onClick={jest.fn()}
                discardCallback={jest.fn()}
            />
        )
        const nameElement = screen.getByText('column definition test')
        expect(nameElement.className).toEqual('d-inline-block text-truncate')
        const nameColumn = nameElement.parentElement?.parentElement
        const columnIdxElement = nameColumn?.children[0]
        expect(columnIdxElement?.textContent).toEqual('Column 0')
        const listGroupItem = nameColumn?.parentElement?.parentElement
        expect(listGroupItem?.className).toEqual('list-group-item')
        const button = screen.getByRole('button')
        expect(button.className).toEqual('btn btn-outline-primary')
    })
    test('selected inactive render', async () => {
        render(
            <ColumnDefinitionStepListItem
                columnDefinition={columnDefinitionActiveTest}
                selected={true}
                onClick={jest.fn()}
                discardCallback={jest.fn()}
            />
        )
        const nameElement = screen.getByText('column definition test')
        expect(nameElement.className).toEqual('d-inline-block text-truncate')
        const nameColumn = nameElement.parentElement?.parentElement
        const columnIdxElement = nameColumn?.children[0]
        expect(columnIdxElement?.textContent).toEqual('Column 0')
        const listGroupItem = nameColumn?.parentElement?.parentElement
        expect(listGroupItem?.className).toEqual('list-group-item active')
        const button = screen.getByRole('button')
        expect(button.className).toEqual('text-primary btn btn-secondary')
    })
    test('not selected active render', async () => {
        render(
            <ColumnDefinitionStepListItem
                columnDefinition={columnDefinitionInactiveTest}
                selected={false}
                onClick={jest.fn()}
                discardCallback={jest.fn()}
            />
        )
        const nameElement = screen.getByText('column definition test')
        expect(nameElement.className).toEqual('d-inline-block text-truncate')
        const nameColumn = nameElement.parentElement?.parentElement
        const columnIdxElement = nameColumn?.children[0]
        expect(columnIdxElement?.textContent).toEqual('Column 0')
        const listGroupItem = nameColumn?.parentElement?.parentElement
        expect(listGroupItem?.className).toEqual('list-group-item')
        const button = screen.getByRole('button')
        expect(button.className).toEqual('text-secondary btn btn-primary')
    })
    test('selected inactive render', async () => {
        render(
            <ColumnDefinitionStepListItem
                columnDefinition={columnDefinitionInactiveTest}
                selected={true}
                onClick={jest.fn()}
                discardCallback={jest.fn()}
            />
        )
        const nameElement = screen.getByText('column definition test')
        expect(nameElement.className).toEqual('d-inline-block text-truncate')
        const nameColumn = nameElement.parentElement?.parentElement
        const columnIdxElement = nameColumn?.children[0]
        expect(columnIdxElement?.textContent).toEqual('Column 0')
        const listGroupItem = nameColumn?.parentElement?.parentElement
        expect(listGroupItem?.className).toEqual('list-group-item active')
        const button = screen.getByRole('button')
        expect(button.className).toEqual('btn btn-outline-secondary')
    })
    test('handle click', async () => {
        const onClickMock = jest.fn()
        const { container } = render(
            <ColumnDefinitionStepListItem
                columnDefinition={columnDefinitionInactiveTest}
                selected={true}
                onClick={onClickMock}
                discardCallback={jest.fn()}
            />
        )
        const user = userEvent.setup()
        const listItems = container.getElementsByClassName('list-group-item')
        expect(listItems.length).toEqual(1)
        await user.click(listItems[0])
        expect(onClickMock.mock.calls.length).toEqual(1)
    })
    test('handle discard', async () => {
        const onDiscardMock = jest.fn()
        render(
            <ColumnDefinitionStepListItem
                columnDefinition={columnDefinitionInactiveTest}
                selected={true}
                onClick={jest.fn()}
                discardCallback={onDiscardMock}
            />
        )
        const user = userEvent.setup()
        const discardButton = screen.getByRole('button')
        await user.click(discardButton)
        expect(onDiscardMock.mock.calls.length).toEqual(1)
    })
})

describe('assignment-form', () => {
    test('renders components', async () => {
        render(
            <ContributionColumnAssignmentForm
                createTabSelected={false}
                setExistingCallback={jest.fn()}
                selectColumnCreationTabCallback={jest.fn()}
                columnDefinition={columnDefinitionActiveTest}
            />
        )
        screen.getByTestId('existing-column-form')
        screen.getByRole('button')
        expect(screen.queryByTestId('create-column-modal')).toBeNull()
    })
    test('shows modal', async () => {
        render(
            <ContributionColumnAssignmentForm
                createTabSelected={true}
                setExistingCallback={jest.fn()}
                selectColumnCreationTabCallback={jest.fn()}
                columnDefinition={columnDefinitionActiveTest}
            />
        )
        screen.getByTestId('existing-column-form')
        expect(screen.queryAllByRole('button').length).toEqual(2)
        screen.getByTestId('create-column-modal')
    })
    test('can show create menu', async () => {
        const showMenuCallback = jest.fn()
        render(
            <ContributionColumnAssignmentForm
                createTabSelected={false}
                setExistingCallback={jest.fn()}
                selectColumnCreationTabCallback={showMenuCallback}
                columnDefinition={columnDefinitionActiveTest}
            />
        )
        await screen.getByRole('button').click()
        expect(showMenuCallback.mock.calls).toEqual([[true]])
    })
    test('can hide create menu', async () => {
        const showMenuCallback = jest.fn()
        render(
            <ContributionColumnAssignmentForm
                createTabSelected={true}
                setExistingCallback={jest.fn()}
                selectColumnCreationTabCallback={showMenuCallback}
                columnDefinition={columnDefinitionActiveTest}
            />
        )
        await screen.getByLabelText('Close').click()
        expect(showMenuCallback.mock.calls).toEqual([[false]])
    })
    test('can set existing callback', async () => {
        const setExistingMock = jest.fn()
        render(
            <ColumnHierarchyContext.Provider
                value={{
                    navigationEntries: [],
                    getHierarchyCallback: jest.fn(),
                    submitColumnDefinitionCallback: jest.fn(),
                    submitColumnDefinitionClearErrorCallback: jest.fn(),
                    toggleExpansionCallback: jest.fn()
                }}
            >
                <ContributionColumnAssignmentForm
                    createTabSelected={false}
                    setExistingCallback={setExistingMock}
                    selectColumnCreationTabCallback={jest.fn()}
                    columnDefinition={columnDefinitionActiveTest}
                />
            </ColumnHierarchyContext.Provider>
        )
        screen.getAllByRole('radio')[0].click()
        expect(setExistingMock.mock.calls).toEqual([['id_persistent']])
    })
})

describe('complete column assignment button', () => {
    test('default', async () => {
        const onClick = jest.fn()
        const remoteState = new Remote(false)
        render(
            <CompleteColumnAssignmentButton
                onClick={onClick}
                remoteState={remoteState}
            />
        )
        const button = screen.getByRole('button')
        expect(Array.from(button.classList)).toEqual(['btn', 'btn-outline-primary'])
        expect(button.textContent).toEqual('Finalize Column Assignment')
        await button.click()
        expect(onClick.mock.calls.length).toEqual(1)
    })
    test('loading', async () => {
        const onClick = jest.fn()
        const remoteState = new Remote(false, true)
        render(
            <CompleteColumnAssignmentButton
                onClick={onClick}
                remoteState={remoteState}
            />
        )
        const button = screen.getByRole('button')
        expect(Array.from(button.classList)).toEqual([
            'placeholder-wave',
            'btn',
            'btn-primary'
        ])
        expect(button.textContent).toEqual('Finalize Column Assignment')
        await button.click()
        expect(onClick.mock.calls.length).toEqual(0)
    })
    test('success', async () => {
        const onClick = jest.fn()
        const remoteState = new Remote(true)
        render(
            <CompleteColumnAssignmentButton
                onClick={onClick}
                remoteState={remoteState}
            />
        )
        const button = screen.getByRole('button')
        expect(Array.from(button.classList)).toEqual(['btn', 'btn-outline-primary'])
        expect(button.textContent).toEqual('Column assignment successfully finalized')
        await button.click()
        expect(onClick.mock.calls.length).toEqual(0)
    })
})
