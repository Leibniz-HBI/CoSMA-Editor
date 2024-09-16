/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react'
import { newTagDefinition, TagType } from '../../state'
import { TagDefinitionNamePath } from '../misc'

const nameTagDef = 'name tag'
const testTagDef = newTagDefinition({
    namePath: [nameTagDef],
    idPersistent: 'id-tag-test',
    columnType: TagType.Float,
    curated: false,
    version: 9,
    hidden: false
})

test('single element name path', async () => {
    render(<TagDefinitionNamePath tagDefinition={testTagDef} />)
    await waitFor(() => {
        const namePathElement = screen.getByText(nameTagDef)
        checkForCuratedIcon(namePathElement, false)
    })
})

test('renders curated icon', async () => {
    render(<TagDefinitionNamePath tagDefinition={{ ...testTagDef, curated: true }} />)
    await waitFor(() => {
        const namePathElement = screen.getByText(nameTagDef)
        checkForCuratedIcon(namePathElement, true)
    })
})

test('two element name path', async () => {
    const namePathPart = 'first parent'
    render(
        <TagDefinitionNamePath
            tagDefinition={{ ...testTagDef, namePath: [namePathPart, nameTagDef] }}
        />
    )
    await waitFor(() => {
        const namePathElement = screen.getByText(nameTagDef)
        checkPathName(namePathElement.parentElement, `${namePathPart} -> ${nameTagDef}`)
        checkForCuratedIcon(namePathElement, false)
    })
})
test('three element name path', async () => {
    const namePathPart = 'first parent'
    const namePathPart1 = 'second parent'
    render(
        <TagDefinitionNamePath
            tagDefinition={{
                ...testTagDef,
                namePath: [namePathPart, namePathPart1, nameTagDef]
            }}
        />
    )
    await waitFor(() => {
        const namePathElement = screen.getByText(nameTagDef)
        checkPathName(
            namePathElement.parentElement,
            `${namePathPart} -> ${namePathPart1} -> ${nameTagDef}`
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
        <TagDefinitionNamePath
            tagDefinition={{
                ...testTagDef,
                namePath: [
                    namePathPart,
                    namePathPart1,
                    namePathPart2,
                    namePathPart3,
                    nameTagDef
                ]
            }}
        />
    )
    await waitFor(() => {
        const namePathElement = screen.getByText(nameTagDef)
        checkPathName(
            namePathElement.parentElement,
            `${namePathPart} -> ... -> ${namePathPart3} -> ${nameTagDef}`
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
