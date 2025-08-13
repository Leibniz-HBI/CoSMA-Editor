/**
 * @vitest-environment jsdom
 */

import { waitFor, screen, getByRole, within } from '@testing-library/react'
import { ColumnMenu } from '../components/menu'
import userEvent from '@testing-library/user-event'
import { UserEvent } from '@testing-library/user-event/dist/types/setup/setup'
import { NotificationType } from '../../util/notification/slice'
import { vi, Mock } from 'vitest'
import { addResponseSequence } from '../../util/tests/response'
import { renderWithProviders } from '../../util/tests/provider'

const idColumn0 = 'id-column-test-0'
const nameColumn0 = 'column def 0'
const idColumn1 = 'id-column-test-1'
const nameColumn1 = 'column def 1'
const idColumn2 = 'id-column-test-2'
const nameColumn2 = 'column def 2'
const idColumn00 = 'id-column-def-0-0'
const nameColumn00 = 'child def 0 0'
const idColumn20 = 'id-column-def-2-0'
const nameColumn20 = 'child def 2 0'
const idColumn21 = 'id-column-def-2-1'
const nameColumn21 = 'child def 2 1'
const idColumn210 = 'id-column-def-2-1-0'
const nameColumn210 = 'grandchild def 2 1 0'
const owner_api = {
    id_persistent: 'id-user-test',
    permission_group: 'CONTRIBUTOR',
    username: 'user-test'
}
function initialResponseSequence(fetchMock: Mock) {
    addResponseSequence(fetchMock, [
        [
            200,
            {
                column_list: [
                    {
                        id_persistent: idColumn0,
                        name_path: [nameColumn0],
                        name: nameColumn0,
                        curated: true,
                        version: 0,
                        type: 'STRING'
                    },
                    {
                        id_persistent: idColumn1,
                        name_path: [nameColumn1],
                        name: nameColumn1,
                        curated: false,
                        owner: owner_api,
                        version: 1,
                        type: 'STRING'
                    },
                    {
                        id_persistent: idColumn2,
                        name_path: [nameColumn2],
                        name: nameColumn2,
                        curated: true,
                        version: 2,
                        type: 'STRING'
                    }
                ]
            }
        ],
        [
            200,
            {
                column_list: [
                    {
                        id_persistent: idColumn00,
                        name_path: [nameColumn0, nameColumn00],
                        name: nameColumn00,
                        curated: true,
                        version: 10,
                        type: 'STRING'
                    }
                ]
            }
        ],
        [200, { column_list: [] }],
        [
            200,
            {
                column_list: [
                    {
                        id_persistent: idColumn20,
                        namePath: [nameColumn2, nameColumn20],
                        name: nameColumn20,
                        curated: true,
                        version: 20,
                        type: 'STRING'
                    },
                    {
                        id_persistent: idColumn21,
                        name_path: [nameColumn2, nameColumn21],
                        name: nameColumn21,
                        curated: false,
                        owner: owner_api,
                        version: 21,
                        type: 'STRING'
                    }
                ]
            }
        ],
        [200, { column_list: [] }],
        [200, { column_list: [] }],
        [
            200,
            {
                column_list: [
                    {
                        id_persistent: idColumn210,
                        name_path: [nameColumn2, nameColumn21, nameColumn210],
                        name: nameColumn210,
                        curated: true,
                        version: 210,
                        type: 'STRING'
                    }
                ]
            }
        ],
        [200, { column_list: [] }]
    ])
}
describe('get hierarchy', () => {
    test('get hierarchy expand collapse', async () => {
        const fetchMock = vi.fn()
        initialResponseSequence(fetchMock)
        renderWithProviders(
            <ColumnMenu
                columnIndices={{}}
                loadColumnDataCallback={vi.fn()}
                hideColumnDataCallback={vi.fn()}
            />,
            fetchMock
        )
        await waitInitialDataLoad()
        let expandIcon, collapseIcon
        await waitFor(() => {
            const withLabel0 = screen.getAllByText(nameColumn0)
            expect(withLabel0.length).toEqual(2)
            const withLabel1 = screen.getAllByText(nameColumn1)
            expect(withLabel1.length).toEqual(1)
            const withLabel2 = screen.getAllByText(nameColumn2)
            expect(withLabel2.length).toEqual(3)
            expandIcon =
                withLabel2[2]?.parentElement?.parentElement?.parentElement
                    ?.parentElement?.children[0]?.children[1]

            expect(expandIcon?.children[0].classList.value).toEqual('bi bi-plus-lg')
        })
        ;(expandIcon as HTMLElement | undefined)?.click()
        await waitFor(() => {
            const withLabel0 = screen.getAllByText(nameColumn0)
            expect(withLabel0.length).toEqual(2)
            const withLabel1 = screen.getAllByText(nameColumn1)
            expect(withLabel1.length).toEqual(1)
            const withLabel2 = screen.getAllByText(nameColumn2)
            expect(withLabel2.length).toEqual(4)
            collapseIcon =
                withLabel2[2]?.parentElement?.parentElement?.parentElement
                    ?.parentElement?.children[0]?.children[1]

            expect(collapseIcon?.children[0].classList.value).toEqual('bi bi-dash-lg')
        })
        ;(collapseIcon as HTMLElement | undefined)?.click()
        await waitFor(() => {
            const withLabel0 = screen.getAllByText(nameColumn0)
            expect(withLabel0.length).toEqual(2)
            const withLabel1 = screen.getAllByText(nameColumn1)
            expect(withLabel1.length).toEqual(1)
            const withLabel2 = screen.getAllByText(nameColumn2)
            expect(withLabel2.length).toEqual(3)
        })
        expect(fetchMock.mock.calls.length).toEqual(8)
    })
    test('dispatches error', async () => {
        const fetchMock = vi.fn()
        const errorMsg = 'Error while loading hierarchy'
        addResponseSequence(fetchMock, [[500, { msg: errorMsg }]])
        const { store } = renderWithProviders(
            <ColumnMenu
                columnIndices={{}}
                loadColumnDataCallback={vi.fn()}
                hideColumnDataCallback={vi.fn()}
            />,
            fetchMock
        )
        await waitFor(() => {
            const notifications = store.getState().notification.notificationList
            expect(notifications.length).toEqual(1)
            expect(notifications[0].type).toEqual(NotificationType.Error)
            expect(notifications[0].msg).toContain(errorMsg)
        })
    })
})

describe('create column definition', () => {
    const columnRsp = {
        id_persistent: 'id-column-created-test',
        name: 'creation test',
        description: 'column definition created during tests',
        curated: false,
        hidden: false,
        owner: {
            username: 'user-test'
        }
    }

    async function setNameAndType(user: UserEvent) {
        await waitInitialDataLoad()
        const createButton = screen.getByText('Create')
        createButton.click()
        await waitFor(() => {
            screen.getAllByText('Name')
        })
        const textBox = screen.getAllByRole('textbox')[0]
        await user.type(textBox, 'new column')
        const stringLabel = screen.getByText('string')
        const stringRadio = getByRole(
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-non-null-asserted-optional-chain
            stringLabel.parentElement?.parentElement!,
            'radio'
        )
        // const stringRadio = radioButtons[1]
        await user.click(stringRadio)
        return user
    }
    test('no parent', async () => {
        const fetchMock = vi.fn()
        initialResponseSequence(fetchMock)
        addResponseSequence(fetchMock, [[200, { column_list: [columnRsp] }]])
        initialResponseSequence(fetchMock)
        renderWithProviders(
            <ColumnMenu
                columnIndices={{}}
                loadColumnDataCallback={vi.fn()}
                hideColumnDataCallback={vi.fn()}
            />,
            fetchMock
        )
        const user = userEvent.setup()
        await setNameAndType(user)
        const button = screen.getByRole('button', { name: 'Create' })
        await user.click(button)
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        await waitFor(() => {
            expect(fetchMock.mock.calls.length).toEqual(9)
            expect(fetchMock.mock.calls[8]).toEqual([
                'http://127.0.0.1:8000/cosmae/api/columns',
                {
                    method: 'POST',
                    credentials: 'include',
                    body: JSON.stringify({
                        column_list: [
                            {
                                name: 'new column',
                                type: 'STRING',
                                description: '',
                                disabled: false
                            }
                        ]
                    }),
                    headers: { 'Content-Type': 'application/json' }
                }
            ])
        })
    })
    test('with parent', async () => {
        const fetchMock = vi.fn()
        initialResponseSequence(fetchMock)
        addResponseSequence(fetchMock, [[200, { column_list: [columnRsp] }]])
        initialResponseSequence(fetchMock)
        renderWithProviders(
            <ColumnMenu
                columnIndices={{}}
                loadColumnDataCallback={vi.fn()}
                hideColumnDataCallback={vi.fn()}
            />,
            fetchMock
        )
        const user = userEvent.setup()
        await setNameAndType(user)
        const parentEntry = screen.getByRole('button', {
            name: nameColumn1
        })
        const parentRadio = within(parentEntry).getByRole('radio')
        await user.click(parentRadio)
        const createButton = screen.getByRole('button', { name: 'Create' })
        await user.click(createButton)
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        await waitFor(() => {
            expect(fetchMock.mock.calls.length).toEqual(9)
            expect(fetchMock.mock.calls[8]).toEqual([
                'http://127.0.0.1:8000/cosmae/api/columns',
                {
                    method: 'POST',
                    credentials: 'include',
                    body: JSON.stringify({
                        column_list: [
                            {
                                name: 'new column',
                                id_parent_persistent: idColumn1,
                                type: 'STRING',
                                description: '',
                                disabled: false
                            }
                        ]
                    }),
                    headers: { 'Content-Type': 'application/json' }
                }
            ])
        })
    })
    test('dispatches error', async () => {
        const fetchMock = vi.fn()
        const errorMsg = 'Error while creating column'
        initialResponseSequence(fetchMock)
        addResponseSequence(fetchMock, [[500, { msg: errorMsg }]])
        const { store } = renderWithProviders(
            <ColumnMenu
                columnIndices={{}}
                loadColumnDataCallback={vi.fn()}
                hideColumnDataCallback={vi.fn()}
            />,
            fetchMock
        )
        const user = userEvent.setup()
        await setNameAndType(user)
        const button = screen.getByRole('button', { name: 'Create' })
        await user.click(button)
        await waitFor(() => {
            const notifications = store.getState().notification.notificationList
            expect(notifications.length).toEqual(1)
            expect(notifications[0].type).toEqual(NotificationType.Error)
            expect(notifications[0].msg).toContain(errorMsg)
        })
    })
})
test('open edit menu', async () => {
    const fetchMock = vi.fn()
    initialResponseSequence(fetchMock)
    const { store } = renderWithProviders(
        <ColumnMenu
            columnIndices={{}}
            loadColumnDataCallback={vi.fn()}
            hideColumnDataCallback={vi.fn()}
        />,
        fetchMock
    )
    const user = userEvent.setup()
    expect(store.getState().columnSelection.editColumn.value).toBeUndefined()
    await waitFor(() => {
        const label = screen.getAllByText(nameColumn0)[0]
        const enclosing = label.parentElement?.parentElement?.parentElement
        const svg = enclosing?.children[enclosing.children.length - 1].children[0]
        expect(svg?.classList.value).toEqual('bi bi-pencil-square')
        if (svg !== undefined) {
            user.click(svg)
        }
    })
    await waitFor(() => {
        const textboxes = screen.getAllByRole('textbox')
        expect(textboxes.length).toEqual(2)
        const radios = screen.getAllByRole('radio')
        // 3 type radios + 6 for parent selection
        expect(radios.length).toEqual(10)
    })
    expect(store.getState().columnSelection.editColumn.value).not.toBeUndefined()
})
async function waitInitialDataLoad() {
    await waitFor(() => {
        const withLabel0 = screen.getAllByText(nameColumn0)
        expect(withLabel0.length).toEqual(1)
        const withLabel1 = screen.getAllByText(nameColumn1)
        expect(withLabel1.length).toEqual(1)
        const withLabel2 = screen.getAllByText(nameColumn2)
        expect(withLabel2.length).toEqual(1)
    })
}
