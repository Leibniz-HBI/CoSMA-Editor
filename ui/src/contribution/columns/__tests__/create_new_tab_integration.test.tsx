/**
 * @jest-environment jsdom
 */

import {
    RenderOptions,
    getByRole,
    render,
    screen,
    waitFor
} from '@testing-library/react'
import {
    ColumnDefinitionsContributionState,
    newColumnDefinitionsContributionState
} from '../state'
import { newRemote } from '../../../util/state'
import { configureStore } from '@reduxjs/toolkit'
import { contributionColumnDefinitionSlice } from '../slice'
import { PropsWithChildren } from 'react'
import { Provider } from 'react-redux'
import { ColumnDefinitionStep } from '../components'
import { ContributionStep, newContribution } from '../../state'
import { TagSelectionState, newTagSelectionState } from '../../../column_menu/state'
import { tagSelectionSlice } from '../../../column_menu/slice'
import userEvent from '@testing-library/user-event'
import { ContributionState, contributionSlice, newContributionState } from '../../slice'

jest.mock('react-router-dom', () => {
    const loaderMock = jest.fn()
    loaderMock.mockReturnValue('id-contribution-test')
    return { useLoaderData: loaderMock, useNavigate: jest.fn() }
})
jest.mock('react-flip-toolkit', () => {
    return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Flipper: (props: any) => <div>{props.children}</div>,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Flipped: (props: any) => <div>{props.children}</div>
    }
})

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: {
        contributionColumnDefinition: ColumnDefinitionsContributionState
        contribution: ContributionState
        tagSelection: TagSelectionState
    }
}

export function renderWithProviders(
    ui: React.ReactElement,
    fetchMock: jest.Mock,
    {
        preloadedState = {
            contributionColumnDefinition: newColumnDefinitionsContributionState({
                columns: newRemote(undefined)
            }),
            contribution: newContributionState({
                selectedContribution: newRemote(
                    newContribution({
                        name: 'contribution test',
                        idPersistent: idContribution,
                        description: 'a contribution for tests',
                        step: ContributionStep.ColumnsExtracted,
                        hasHeader: true,
                        emptyValues: 'null,na',
                        author: authorTest
                    })
                )
            }),
            tagSelection: newTagSelectionState({})
        },
        ...renderOptions
    }: ExtendedRenderOptions = {}
) {
    const store = configureStore({
        reducer: {
            contributionColumnDefinition: contributionColumnDefinitionSlice.reducer,
            contribution: contributionSlice.reducer,
            tagSelection: tagSelectionSlice.reducer
        },
        middleware: (getDefaultMiddleware) =>
            getDefaultMiddleware({ thunk: { extraArgument: fetchMock } }),
        preloadedState
    })
    function Wrapper({ children }: PropsWithChildren<object>): JSX.Element {
        return <Provider store={store}>{children}</Provider>
    }

    // Return an object with the store and all of RTL's query functions
    return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) }
}
function addResponseSequence(mock: jest.Mock, responses: [number, unknown][]) {
    for (const tpl of responses) {
        const [status_code, rsp] = tpl
        mock.mockImplementationOnce(
            jest.fn(() =>
                Promise.resolve({
                    status: status_code,
                    json: () => Promise.resolve(rsp)
                })
            ) as jest.Mock
        )
    }
}
export const idContribution = 'id-contribution-test'
const authorTest = 'author test'
export const contributionColumnActiveRsp0 = {
    name: 'column definition contribution test active 0',
    id_persistent: 'id-active-0',
    index_in_file: 0,
    discard: false
}
export const contributionColumnActiveRsp1 = {
    name: 'column definition contribution test active 2',
    id_persistent: 'id-active-2',
    index_in_file: 2,
    discard: false
}
const idTagDef0 = 'id-tag-test-0'
const nameTagDef0 = 'tag def 0'

function initialResponseSequence(fetchMock: jest.Mock) {
    addResponseSequence(fetchMock, [
        [
            200,
            {
                tag_definitions: [
                    contributionColumnActiveRsp0,
                    contributionColumnActiveRsp1
                ]
            }
        ],
        [200, { contribution_values: [], destination_values: [] }],
        [200, { tag_definitions: [] }]
    ])
}

test('create, select and assign tag definition', async () => {
    const fetchMock = jest.fn()
    initialResponseSequence(fetchMock)
    const tagDefJson = {
        id_persistent: idTagDef0,
        name_path: [nameTagDef0],
        name: nameTagDef0,
        curated: true,
        version: 0,
        type: 'STRING'
    }
    addResponseSequence(fetchMock, [
        [200, { contribution_values: [], destination_values: [] }],
        [
            200,
            {
                tag_definitions: [tagDefJson]
            }
        ],
        [
            200,
            {
                tag_definitions: [tagDefJson]
            }
        ],
        [
            200,
            {
                tag_definitions: []
            }
        ],
        [200, { ...contributionColumnActiveRsp1, id_existing_persistent: idTagDef0 }],
        [200, { contribution_values: [], destination_values: [] }]
    ])
    const { store } = renderWithProviders(<ColumnDefinitionStep />, fetchMock)
    const user = userEvent.setup()
    let title2: HTMLElement | undefined
    await waitFor(() => {
        title2 = screen.getByText(contributionColumnActiveRsp1.name)
    })
    if (title2) {
        await user.click(title2)
    }
    await waitFor(() => {
        expect(
            store.getState().contributionColumnDefinition.selectedColumnDefinition.value
                ?.idPersistent
        ).toEqual(contributionColumnActiveRsp1.id_persistent)
        expect(fetchMock.mock.calls.length).toEqual(4)
    })
    const createMenuButton = screen.getByRole('button', { name: /Create new tag/i })
    await user.click(createMenuButton)
    await waitFor(() => {
        screen.getAllByText('Name')
    })
    const textBox = screen.getAllByRole('textbox')[0]
    await user.type(textBox, nameTagDef0)
    const stringLabel = screen.getByText('string')
    const stringRadio = getByRole(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-non-null-asserted-optional-chain
        stringLabel.parentElement?.parentElement!,
        'radio'
    )
    // const stringRadio = radioButtons[1]
    await user.click(stringRadio)
    const createButton = screen.getByRole('button', { name: 'Create' })
    await user.click(createButton)
    const closeButton = screen.getByRole('button', { name: /close/i })
    await user.click(closeButton)
    expect(fetchMock.mock.calls.length).toEqual(7)
    const tagDefLabel = await screen.findByText(nameTagDef0)
    const tagDefEntry =
        tagDefLabel.parentElement?.parentElement?.parentElement?.parentElement
    const radioButton = getByRole(tagDefEntry as HTMLElement, 'button', {
        name: /select/i
    })
    radioButton.click()
    await waitFor(() => {
        expect(
            store.getState().contributionColumnDefinition.selectedColumnDefinition.value
                ?.idExistingPersistent
        ).toEqual(idTagDef0)
    })
    expect(fetchMock.mock.calls.at(-2)).toEqual([
        `http://127.0.0.1:8000/cosmae/api/contributions/${idContribution}/tags/${contributionColumnActiveRsp1.id_persistent}`,
        {
            method: 'PATCH',
            credentials: 'include',
            body: JSON.stringify({ id_existing_persistent: idTagDef0 })
        }
    ])
    expect(fetchMock.mock.calls.at(-1)).toEqual([
        `http://127.0.0.1:8000/cosmae/api/contributions/${idContribution}/preview/id-active-2`,
        { credentials: 'include' }
    ])
}, 10000)
