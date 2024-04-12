/**
 * @jest-environment jsdom
 */

import { RenderOptions, screen, render, waitFor } from '@testing-library/react'
import {
    NotificationManager,
    NotificationType,
    newNotificationManager,
    notificationReducer
} from '../../util/notification/slice'
import { CommentsRegister, commentsReducer } from '../slice'
import { configureStore } from '@reduxjs/toolkit'
import { PropsWithChildren } from 'react'
import { Provider } from 'react-redux'
import { CommentHistoryAndForm } from '../components'
import userEvent from '@testing-library/user-event'
import { newRemote } from '../../util/state'

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: {
        comments: CommentsRegister
        notification: NotificationManager
    }
}

export function renderWithProviders(
    ui: React.ReactElement,
    fetchMock: jest.Mock,
    {
        preloadedState = {
            comments: { commentsByIdPersistent: {}, isSubmitting: false },
            notification: newNotificationManager({})
        },
        ...renderOptions
    }: ExtendedRenderOptions = {}
) {
    const store = configureStore({
        reducer: {
            comments: commentsReducer,
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

const idPersistent = 'id-resource'
const content = 'comment contents'
const content1 = 'comment contents 1'
const content2 = 'comment contents 2'

test('success show and edit', async () => {
    const fetchMock = jest.fn()
    addResponseSequence(fetchMock, [
        [
            200,
            {
                comments_by_id_persistent: {
                    [idPersistent]: [{ content: content }, { content: content1 }]
                }
            }
        ],
        [200, {}]
    ])
    const { store } = renderWithProviders(
        <CommentHistoryAndForm idPersistent={idPersistent} />,
        fetchMock
    )
    await waitFor(() => {
        screen.findByText(content)
        screen.findByText(content1)
    })
    expect(store.getState().comments).toEqual({
        commentsByIdPersistent: {
            [idPersistent]: newRemote([{ content: content }, { content: content1 }])
        },
        isSubmitting: false
    })
    expect(store.getState().notification.notificationList.length).toEqual(0)
    const textBox = await writeComment()
    await waitFor(() => {
        expect(fetchMock.mock.calls).toEqual([
            [
                'http://127.0.0.1:8000/cosmae/api/comments',
                {
                    method: 'POST',
                    credentials: 'include',
                    body: JSON.stringify({ id_persistent_list: [idPersistent] })
                }
            ],
            [
                `http://127.0.0.1:8000/cosmae/api/comments/${idPersistent}`,
                {
                    method: 'POST',
                    credentials: 'include',
                    body: JSON.stringify({ comment: { content: content2 } })
                }
            ]
        ])
    })
    expect(store.getState().comments).toEqual({
        commentsByIdPersistent: {
            [idPersistent]: newRemote([
                { content: content },
                { content: content1 },
                { content: content2 }
            ])
        },
        isSubmitting: false
    })
    expect(store.getState().notification.notificationList.length).toEqual(0)
    expect(textBox.textContent).toEqual('')
    screen.getByText(content2)
})
test('error loading', async () => {
    const fetchMock = jest.fn()
    const errorMsg = 'error loading comments'
    addResponseSequence(fetchMock, [[500, { msg: errorMsg }]])
    const { store } = renderWithProviders(
        <CommentHistoryAndForm idPersistent={idPersistent} />,
        fetchMock
    )
    await waitFor(() => {
        expect(store.getState().notification.notificationList).toEqual([
            expect.objectContaining({ type: NotificationType.Error, msg: errorMsg })
        ])
        expect(store.getState().comments).toEqual({
            commentsByIdPersistent: { [idPersistent]: newRemote([]) },
            isSubmitting: false
        })
    })
})

test('error submitting', async () => {
    const fetchMock = jest.fn()
    const errorMsg = 'error submitting comments'
    addResponseSequence(fetchMock, [
        [200, { comments_by_id_persistent: { [idPersistent]: [] } }],
        [500, { msg: errorMsg }]
    ])
    const { store } = renderWithProviders(
        <CommentHistoryAndForm idPersistent={idPersistent} />,
        fetchMock
    )
    const textbox = await writeComment()
    await waitFor(() => {
        expect(store.getState().notification.notificationList).toEqual([
            expect.objectContaining({ type: NotificationType.Error, msg: errorMsg })
        ])
        expect(store.getState().comments).toEqual({
            commentsByIdPersistent: { [idPersistent]: newRemote([]) },
            isSubmitting: false
        })
    })
    expect(textbox.textContent).toEqual(content2)
})
async function writeComment() {
    const user = userEvent.setup()
    const textBox = screen.getByRole('textbox')
    await user.type(textBox, content2)
    const button = screen.getByRole('button', { name: /submit/i })
    await user.click(button)
    return textBox
}
