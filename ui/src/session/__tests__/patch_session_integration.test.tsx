/**
 * @vitest-environment jsdom
 */
import { vi, Mock } from 'vitest'
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
import { EditSessionEditor } from '../components'
import { newRemote } from '../../util/state'
import {
    newNotification,
    newNotificationManager,
    NotificationManager,
    notificationReducer,
    NotificationType
} from '../../util/notification/slice'
import userEvent from '@testing-library/user-event'

describe('change name', () => {
    test('success', async () => {
        const fetchMock = vi.fn()
        addResponseSequence(fetchMock, [[200, { ...sessionApi, name: changedName }]])
        const { store } = renderWithProviders(<EditSessionEditor />, fetchMock)
        await setName()
        await waitFor(() => {
            expect(store.getState().editSession.currentEditSession).toEqual(
                newRemote({
                    ...session,
                    name: changedName
                })
            )
        })
    })
    test('error', async () => {
        const testError = 'Could not patch edit session'
        const fetchMock = vi.fn()
        addResponseSequence(fetchMock, [[500, { msg: testError }]])
        const { store } = renderWithProviders(<EditSessionEditor />, fetchMock)
        await setName()
        await waitFor(() => {
            expect(store.getState().notification.notificationList).toEqual([
                newNotification({
                    msg: testError,
                    type: NotificationType.Error,
                    id: expect.anything()
                })
            ])
        })
        expect(store.getState().editSession.currentEditSession).toEqual(
            newRemote(session)
        )
    })
})

async function setName() {
    const user = userEvent.setup()
    const input = screen.getByRole('textbox')
    await user.type(input, changedName)
    const button = input.parentElement?.parentElement?.parentElement?.children[1]
    const icon = button?.children[0]
    expect(icon?.children[0].getAttribute('d')).toEqual('M12 2h-2v3h2z')
    expect(icon?.children[1].getAttribute('d')).toEqual(
        'M1.5 0A1.5 1.5 0 0 0 0 1.5v13A1.5 1.5 0 0 0 1.5 16h13a1.5 1.5 0 0 0 1.5-1.5V2.914a1.5 1.5 0 0 0-.44-1.06L14.147.439A1.5 1.5 0 0 0 13.086 0zM4 6a1 1 0 0 1-1-1V1h10v4a1 1 0 0 1-1 1zM3 9h10a1 1 0 0 1 1 1v5H2v-5a1 1 0 0 1 1-1'
    )
    ;(button as HTMLInputElement).click()
}

function addResponseSequence(mock: Mock, responses: [number, unknown][]) {
    for (const tpl of responses) {
        const [status_code, rsp] = tpl
        mock.mockImplementationOnce(
            vi.fn(() =>
                Promise.resolve({
                    status: status_code,
                    json: () => Promise.resolve(rsp)
                })
            ) as Mock
        )
    }
}

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: {
        editSession: EditSessionState
        notification: NotificationManager
    }
}

export function renderWithProviders(
    ui: React.ReactElement,
    fetchMock: Mock,
    {
        preloadedState = {
            editSession: newEditSessionState({
                currentEditSession: newRemote(session)
            }),
            notification: newNotificationManager({})
        },
        ...renderOptions
    }: ExtendedRenderOptions = {}
) {
    const store = configureStore({
        reducer: {
            editSession: editSessionReducer,
            notification: notificationReducer
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

const idParticipant1 = 'id-participant-1'
const nameParticipant1 = 'Participant 1'
const idParticipant2 = 'id-participant-2'
const nameParticipant2 = 'Participant 2'

const idSession = 'id-session-test'
const nameSession = 'edit session for test'
const changedName = 'Changed edit session'

const sessionApi = {
    name: nameSession,
    id_persistent: idSession,
    owner: {
        id_participant: idParticipant1,
        type_participant: 'INTERNAL'
    },
    participant_list: [
        {
            name_participant: nameParticipant1,
            id_participant: idParticipant1,
            type_participant: 'INTERNAL'
        },
        {
            name_participant: nameParticipant2,
            id_participant: idParticipant2,
            type_participant: 'INTERNAL'
        }
    ]
}

const session = newEditSession({
    idPersistent: idSession,
    name: nameSession,
    owner: newEditSessionParticipant({
        type: EditSessionParticipantType.internal,
        id: idParticipant1
    }),
    participantList: [
        newEditSessionParticipant({
            id: idParticipant1,
            name: nameParticipant1,
            type: EditSessionParticipantType.internal
        }),
        newEditSessionParticipant({
            id: idParticipant2,
            name: nameParticipant2,
            type: EditSessionParticipantType.internal
        })
    ],
    participantMap: { [idParticipant1]: 0, [idParticipant2]: 1 }
})
