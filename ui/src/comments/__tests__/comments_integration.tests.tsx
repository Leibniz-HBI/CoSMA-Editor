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
import { UserPermissionGroup, newPublicUserInfo } from '../../user/state'

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
const timeString = '1996-04-02 16:54:00 +0300'
const timeString1 = '1996-04-03 16:54:00 +0300'
const timeString2 = '1996-04-04 16:54:00 +0300'

const time = new Date(timeString)
const time1 = new Date(timeString1)
const time2 = new Date(timeString2)

const username = 'userTest'
const idUser = 'id-user-test'
const authorApi = {
    username: username,
    id_persistent: idUser,
    permission_group: 'CONTRIBUTOR'
}

const author = newPublicUserInfo({
    idPersistent: idUser,
    username,
    permissionGroup: UserPermissionGroup.CONTRIBUTOR
})

test('success show and edit', async () => {
    const fetchMock = jest.fn()
    addResponseSequence(fetchMock, [
        [
            200,
            {
                comments_by_id_persistent: {
                    [idPersistent]: [
                        { content: content, author: authorApi, timestamp: timeString },
                        { content: content1, author: authorApi, timestamp: timeString1 }
                    ]
                }
            }
        ],
        [
            200,
            {
                comment: {
                    content: content2,
                    author: authorApi,
                    timestamp: timeString2
                }
            }
        ]
    ])
    const { store } = renderWithProviders(
        <CommentHistoryAndForm idPersistent={idPersistent} />,
        fetchMock
    )
    await waitFor(() => {
        screen.findByText(content)
        screen.findByText(content1)
    })
    const comment = { content: content, author, timestamp: time }
    const comment1 = { content: content1, author, timestamp: time1 }
    expect(store.getState().comments).toEqual({
        commentsByIdPersistent: {
            [idPersistent]: newRemote([comment, comment1])
        },
        isSubmitting: false
    })
    expect(store.getState().notification.notificationList.length).toEqual(0)
    const textBox = await writeComment()
    await waitFor(() => {
        expect(fetchMock.mock.calls).toEqual([
            [
                'http://127.0.0.1/api/comments',
                {
                    method: 'POST',
                    credentials: 'include',
                    body: JSON.stringify({ id_persistent_list: [idPersistent] })
                }
            ],
            [
                `http://127.0.0.1/api/comments/${idPersistent}`,
                {
                    method: 'POST',
                    credentials: 'include',
                    body: JSON.stringify({
                        comment: { content: content2 }
                    })
                }
            ]
        ])
    })
    expect(store.getState().comments).toEqual({
        commentsByIdPersistent: {
            [idPersistent]: newRemote([
                comment,
                comment1,
                { content: content2, author, timestamp: time2 }
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
