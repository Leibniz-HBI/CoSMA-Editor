/**
 * @jest-environment jsdom
 */
import { render, RenderOptions, screen, waitFor } from '@testing-library/react'
import {
    EditSessionParticipantType,
    EditSessionState,
    newEditSession,
    newEditSessionParticipant,
    newEditSessionState
} from '../state'
import { editSessionReducer } from '../slice'
import { configureStore } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'
import { PropsWithChildren } from 'react'
import { EditSessionButton } from '../components'
import userEvent from '@testing-library/user-event'
import { newRemote } from '../../util/state'

test('shows participant number', async () => {
    const fetchMock = jest.fn()
    renderWithProviders(
        <EditSessionButton popoverPlacement="bottom" tooltipPlacement="right" />,
        fetchMock,
        {
            preloadedState: {
                editSession: newEditSessionState({
                    currentEditSession: newRemote(
                        newEditSession({
                            idPersistent: 'id-session-test',
                            name: 'edit session for test',
                            owner: newEditSessionParticipant({
                                type: EditSessionParticipantType.internal,
                                name: '',
                                id: 'id-owner'
                            }),
                            participantList: [
                                newEditSessionParticipant({
                                    id: 'id-participant-1',
                                    type: EditSessionParticipantType.internal
                                }),
                                newEditSessionParticipant({
                                    id: 'id-participant-2',
                                    type: EditSessionParticipantType.internal
                                })
                            ],
                            participantMap: {}
                        })
                    )
                })
            }
        }
    )
    const button = screen.getByRole('button')
    const icons = button.children[0].children[0].children[0]
    const person = icons.children[0].children[0]
    const number = icons.children[1]
    expect(person.children[0].getAttribute('d')).toEqual(
        'M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6m-5.784 6A2.24 2.24 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.3 6.3 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1zM4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5'
    )
    expect(number.textContent).toEqual('2')
})

test('shows plus sign', async () => {
    const fetchMock = jest.fn()
    renderWithProviders(
        <EditSessionButton popoverPlacement="bottom" tooltipPlacement="right" />,
        fetchMock
    )
    const button = screen.getByRole('button')
    const icons = button.children[0].children[0].children[0]
    const person = icons.children[0].children[0]
    const plus = icons.children[1].children[0]
    expect(person.children[0].getAttribute('d')).toEqual(
        'M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6'
    )
    expect(plus.children[0].getAttribute('d')).toEqual(
        'M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2'
    )
})

test('show tooltip', async () => {
    const fetchMock = jest.fn()
    renderWithProviders(
        <EditSessionButton popoverPlacement="bottom" tooltipPlacement="right" />,
        fetchMock
    )
    const tooltipText = 'Click to manage edit sessions'
    expect(screen.queryByText(tooltipText)).toBeNull()
    const user = userEvent.setup()
    const button = screen.getByRole('button')
    await user.hover(button)
    await waitFor(() => {
        screen.getByText(tooltipText)
    })
})

test('show popover', async () => {
    const fetchMock = jest.fn()
    renderWithProviders(
        <EditSessionButton popoverPlacement="bottom" tooltipPlacement="right" />,
        fetchMock,
        {
            preloadedState: {
                editSession: newEditSessionState({
                    currentEditSession: newRemote(
                        newEditSession({
                            idPersistent: 'id-session-test',
                            name: 'edit session for test',
                            owner: newEditSessionParticipant({
                                type: EditSessionParticipantType.internal,
                                name: '',
                                id: 'id-owner'
                            }),
                            participantList: [],
                            participantMap: {}
                        })
                    )
                })
            }
        }
    )
    const editorLabel = 'Edit Session Participant List'
    expect(screen.queryByLabelText(editorLabel)).toBeNull()
    const user = userEvent.setup()
    const button = screen.getByRole('button')
    await user.click(button)
    await waitFor(() => {
        screen.getByText('Current')
        screen.getByText('Owner')
        screen.getByText('Participant')
        screen.getByLabelText(editorLabel)
    })
})

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: {
        editSession: EditSessionState
    }
}

export function renderWithProviders(
    ui: React.ReactElement,
    fetchMock: jest.Mock,
    {
        preloadedState = {
            editSession: newEditSessionState({})
        },
        ...renderOptions
    }: ExtendedRenderOptions = {}
) {
    const store = configureStore({
        reducer: {
            editSession: editSessionReducer
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
