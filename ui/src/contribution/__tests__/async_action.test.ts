/**
 * @jest-environment jsdom
 */
import {
    LoadContributionsErrorAction,
    LoadContributionsStartAction,
    LoadContributionsSuccessAction,
    UploadContributionErrorAction,
    UploadContributionStartAction,
    UploadContributionSuccessAction
} from '../actions'
import { LoadContributionsAction, UploadContributionAction } from '../async_actions'
import { Contribution, ContributionStep } from '../state'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function responseSequence(responses: [number, () => any][]) {
    global.fetch = jest.fn()
    for (const tpl of responses) {
        const [status_code, rsp] = tpl
        ;(global.fetch as jest.Mock).mockImplementationOnce(
            jest.fn(() =>
                Promise.resolve({
                    status: status_code,
                    json: () => Promise.resolve(rsp())
                })
            ) as jest.Mock
        )
    }
}

const nameTest0 = 'contribution test 0'
const descriptionTest0 = 'a contribution for tests'
const idTest0 = 'id-test-0'
describe('load contributions', () => {
    test('success', async () => {
        const contributionResponse0 = {
            name: nameTest0,
            description: descriptionTest0,
            id_persistent: idTest0,
            anonymous: true,
            has_header: false,
            state: 'UPLOADED'
        }
        const nameTest1 = 'contribution test 1'
        const descriptionTest1 = 'another contribution for tests'
        const idTest1 = 'id-test-1'
        const authorTest1 = 'author test 1'
        const contributionResponse1 = {
            name: nameTest1,
            description: descriptionTest1,
            id_persistent: idTest1,
            anonymous: false,
            has_header: true,
            state: 'VALUES_ASSIGNED',
            author: authorTest1
        }
        responseSequence([
            [
                200,
                () => {
                    return {
                        contributions: [contributionResponse0, contributionResponse1]
                    }
                }
            ],
            [
                200,
                () => {
                    return { contributions: [] }
                }
            ]
        ])
        const dispatch = jest.fn()
        await new LoadContributionsAction().run(dispatch)
        expect(dispatch.mock.calls).toEqual([
            [new LoadContributionsStartAction()],
            [
                new LoadContributionsSuccessAction([
                    new Contribution({
                        name: nameTest0,
                        description: descriptionTest0,
                        idPersistent: idTest0,
                        anonymous: true,
                        hasHeader: false,
                        step: ContributionStep.Uploaded
                    }),
                    new Contribution({
                        name: nameTest1,
                        description: descriptionTest1,
                        idPersistent: idTest1,
                        anonymous: false,
                        hasHeader: true,
                        step: ContributionStep.ValuesAssigned,
                        author: authorTest1
                    })
                ])
            ]
        ])
    })
    test('server error', async () => {
        responseSequence([
            [
                500,
                () => {
                    return { msg: 'test error' }
                }
            ]
        ])
        const dispatch = jest.fn()
        await new LoadContributionsAction().run(dispatch)
        expect(dispatch.mock.calls).toEqual([
            [new LoadContributionsStartAction()],
            [
                new LoadContributionsErrorAction(
                    'Could not load contributions. Reason: "test error".'
                )
            ]
        ])
    })
})

describe('upload contribution', () => {
    test('success', async () => {
        responseSequence([
            [
                200,
                () => {
                    return { id_persistent: 'id-test-0' }
                }
            ]
        ])
        const dispatch = jest.fn()
        await new UploadContributionAction({
            name: nameTest0,
            description: descriptionTest0,
            isAnonymous: true,
            hasHeader: false,
            file: new File([''], 'testFileName', { type: 'text, csv' })
        }).run(dispatch)
        expect(dispatch.mock.calls).toEqual([
            [new UploadContributionStartAction()],
            [new UploadContributionSuccessAction()]
        ])
        const form = new FormData()
        expect(JSON.stringify((fetch as jest.Mock).mock.calls)).toEqual(
            JSON.stringify([
                [
                    'http://127.0.0.1:8000/cosmae/api/contributions',
                    { method: 'POST', credentials: 'include', body: form }
                ]
            ])
        )
    })
    test('server error', async () => {
        responseSequence([
            [
                500,
                () => {
                    return { msg: 'test error' }
                }
            ]
        ])
        const dispatch = jest.fn()
        await new UploadContributionAction({
            name: nameTest0,
            description: descriptionTest0,
            isAnonymous: true,
            hasHeader: false,
            file: new File([''], 'testFileName', { type: 'text, csv' })
        }).run(dispatch)
        expect(dispatch.mock.calls).toEqual([
            [new UploadContributionStartAction()],
            [
                new UploadContributionErrorAction(
                    'Could not upload contribution. Reason: "test error".'
                )
            ]
        ])
    })
})
