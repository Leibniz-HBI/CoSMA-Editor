import { Mock } from 'vitest'
import {
    newNotification,
    NotificationManager,
    NotificationType
} from '../notification/slice'

export function addResponseSequence(mock: Mock, responses: [number, unknown][]) {
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

export function expectError(
    notificationState: { notification: NotificationManager },
    msg: string
) {
    expect(notificationState.notification).toEqual({
        notificationList: [
            newNotification({
                msg,
                type: NotificationType.Error,
                id: expect.anything()
            })
        ],
        notificationMap: expect.anything()
    })
}

export function expectNoNotification(notificationState: {
    notification: NotificationManager
}) {
    expect(notificationState.notification.notificationList.length).toEqual(0)
}
