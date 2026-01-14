import { Mock } from 'vitest'
import {
    newNotification,
    NotificationManager,
    NotificationType
} from '../notification/slice'
import '../../openapi/allauth/sdk.gen'

export function addResponseSequence(mock: Mock, responses: [number, unknown][]) {
    for (const tpl of responses) {
        const [status_code, rsp] = tpl
        mock.mockImplementationOnce(
            vi.fn(() =>
                Promise.resolve({
                    status: status_code,
                    ok: status_code >= 200 && status_code < 300,
                    json: () => Promise.resolve(rsp),
                    text: () => Promise.resolve(JSON.stringify(rsp)),
                    headers: new Map([
                        ['Content-Length', '1'],
                        ['Content-Type', 'application/json']
                    ])
                })
            ) as Mock
        )
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function expectFetchCallList(actual: any[], expected: (string | any)[][]) {
    for (const i in expected) {
        await expectFetchCall(actual[i], expected[i])
    }
    expect(actual).toHaveLength(expected.length)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function expectFetchCall(
    actual: any,
    expected: (string | any)[],
    bodyType: 'json' | 'formdata' = 'json'
) {
    const request = actual[0]
    if (typeof request === 'string') {
        expect(request).toEqual(expected[0])
        expect(actual[1]).toEqual(expected[1])
    } else {
        expect(request.url).toEqual(expected[0])
        if (expected.length > 1) {
            if ('body' in expected[1]) {
                let body
                switch (bodyType) {
                    case 'json':
                        body = await actual[0].json()
                        break
                    case 'formdata':
                        body = {}

                        body = Array.from(
                            (await actual[0].formData() as FormData).entries()
                        ).reduce(
                            (acc: { [key: string]: unknown }, f) => ({
                                ...acc,
                                [f[0]]: f[1]
                            }),
                            {}
                        )
                        break
                }
                expect(body).toEqual(expected[1].body)
            }
            if ('method' in expected[1]) {
                expect(request.method).toEqual(expected[1].method)
            }
            if ('credentials' in expected[1]) {
                expect(request.credentials).toEqual(expected[1].credentials)
            }
            if ('headers' in expected[1]) {
                for (const [key, value] of Object.entries(expected[1].headers)) {
                    expect(request.headers.get(key)).toEqual(value)
                }
            }
        }
    }
}

interface MockCall {
    status: number
    rsp: unknown
    errorAsData: boolean
    method: string
}

export function newMockCall(
    method: string,
    status: number,
    rsp: unknown,
    errorAsData: boolean = false
): MockCall {
    return { method, status, rsp, errorAsData }
}

type MockRsp =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    | { error: undefined; data: any }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    | ({ error: any; data: undefined } & { response: { status: number } })

function mkMockRsp({
    status,
    rsp,
    errorAsData
}: {
    status: number
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rsp: any
    errorAsData: boolean
}): MockRsp {
    let data = undefined,
        error = undefined
    if (status == 200 || errorAsData) {
        data = rsp
    } else {
        error = rsp
    }
    return { error, data, response: { status } }
}

// export function addResponseSequenceAuthClient(responses: MockCall[]) {
//     vi.mock('../../openapi/allauth/sdk.gen', () => {
//         const module: { [key: string]: Mock } = {}
//         for (const mockCall of responses) {
//             const { method } = mockCall
//             let mock = module[method]
//             if (mock === undefined) {
//                 mock = vi.fn()
//                 module[method] = mock
//             }
//             mock.mockImplementationOnce(
//                 vi.fn(() => Promise.resolve(mkMockRsp(mockCall)))
//             )
//         }
//         return module
//     })
// }

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
