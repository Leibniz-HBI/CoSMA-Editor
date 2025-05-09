/**
 * @vitest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react'
import { newColumn, ColumnType } from '../../state'
import { ColumnNamePath } from '../misc'

const nameColumn = 'name column'
const testColumn = newColumn({
    namePath: [nameColumn],
    idPersistent: 'id-column-test',
    columnType: ColumnType.Float,
    curated: false,
    version: 9,
    hidden: false
})

test('single element name path', async () => {
    render(<ColumnNamePath column={testColumn} />)
    await waitFor(() => {
        const namePathElement = screen.getByText(nameColumn)
        checkForCuratedIcon(namePathElement, false)
    })
})

test('renders curated icon', async () => {
    render(<ColumnNamePath column={{ ...testColumn, curated: true }} />)
    await waitFor(() => {
        const namePathElement = screen.getByText(nameColumn)
        checkForCuratedIcon(namePathElement, true)
    })
})

test('two element name path', async () => {
    const namePathPart = 'first parent'
    render(
        <ColumnNamePath
            column={{ ...testColumn, namePath: [namePathPart, nameColumn] }}
        />
    )
    await waitFor(() => {
        const namePathElement = screen.getByText(nameColumn)
        checkPathName(namePathElement.parentElement, `${namePathPart} -> ${nameColumn}`)
        checkForCuratedIcon(namePathElement, false)
    })
})
test('three element name path', async () => {
    const namePathPart = 'first parent'
    const namePathPart1 = 'second parent'
    render(
        <ColumnNamePath
            column={{
                ...testColumn,
                namePath: [namePathPart, namePathPart1, nameColumn]
            }}
        />
    )
    await waitFor(() => {
        const namePathElement = screen.getByText(nameColumn)
        checkPathName(
            namePathElement.parentElement,
            `${namePathPart} -> ${namePathPart1} -> ${nameColumn}`
        )
        checkForCuratedIcon(namePathElement, false)
    })
})

test('five element name path', async () => {
    const namePathPart = 'first parent'
    const namePathPart1 = 'second parent'
    const namePathPart2 = 'third parent'
    const namePathPart3 = 'fourth parent'
    render(
        <ColumnNamePath
            column={{
                ...testColumn,
                namePath: [
                    namePathPart,
                    namePathPart1,
                    namePathPart2,
                    namePathPart3,
                    nameColumn
                ]
            }}
        />
    )
    await waitFor(() => {
        const namePathElement = screen.getByText(nameColumn)
        checkPathName(
            namePathElement.parentElement,
            `${namePathPart} -> ... -> ${namePathPart3} -> ${nameColumn}`
        )
        checkForCuratedIcon(namePathElement, false)
    })
})

function checkPathName(parentElement: HTMLElement | null, expectedPath: string) {
    expect(parentElement?.textContent).toEqual(expectedPath)
}

function checkForCuratedIcon(namePathElement: HTMLElement, curated: boolean) {
    const parentElement = namePathElement.parentElement
    const iconElement = parentElement?.children[parentElement.children.length - 1]
    const check = expect(iconElement?.className)
    const curatedIconClassName = 'icon test-primary pre-wrap'
    if (!curated) {
        check.not.toEqual(curatedIconClassName)
    } else {
        check.toEqual(curatedIconClassName)
    }
}
