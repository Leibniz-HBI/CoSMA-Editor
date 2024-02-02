/**
 * @jest-environment jsdom
 */
import { addError } from '../../util/notification/slice'
import {
    LoadContributionsErrorAction,
    LoadContributionsStartAction,
    LoadContributionsSuccessAction
} from '../actions'
import { LoadContributionsAction } from '../async_actions'
import { ContributionStep, newContribution } from '../state'

jest.mock('../../util/notification/slice', () => {
    const addErrorMock = jest.fn()
    return {
        ...jest.requireActual('../../util/notification/slice'),
        addError: addErrorMock
    }
})

beforeEach(() => {
    ;(addError as unknown as jest.Mock).mockReset()
})

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
beforeEach(() => {
    ;(addError as unknown as jest.Mock).mockReset()
})
describe('load contributions', () => {
    test('success', async () => {
        const authorTest1 = 'author test 1'
        const contributionResponse0 = {
            name: nameTest0,
            description: descriptionTest0,
            id_persistent: idTest0,
            author: authorTest1,
            has_header: false,
            state: 'UPLOADED'
        }
        const nameTest1 = 'contribution test 1'
        const descriptionTest1 = 'another contribution for tests'
        const idTest1 = 'id-test-1'
        const contributionResponse1 = {
            name: nameTest1,
            description: descriptionTest1,
            id_persistent: idTest1,
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
        const reduxDispatch = jest.fn()
        await new LoadContributionsAction().run(dispatch, reduxDispatch)
        expect(dispatch.mock.calls).toEqual([
            [new LoadContributionsStartAction()],
            [
                new LoadContributionsSuccessAction([
                    newContribution({
                        name: nameTest0,
                        description: descriptionTest0,
                        idPersistent: idTest0,
                        author: authorTest1,
                        hasHeader: false,
                        step: ContributionStep.Uploaded
                    }),
                    newContribution({
                        name: nameTest1,
                        description: descriptionTest1,
                        idPersistent: idTest1,
                        hasHeader: true,
                        step: ContributionStep.ValuesAssigned,
                        author: authorTest1
                    })
                ])
            ]
        ])
        expect(reduxDispatch.mock.calls.length).toEqual(0)
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
        const reduxDispatch = jest.fn()
        await new LoadContributionsAction().run(dispatch, reduxDispatch)
        expect(dispatch.mock.calls).toEqual([
            [new LoadContributionsStartAction()],
            [new LoadContributionsErrorAction()]
        ])
        expect(reduxDispatch.mock.calls.length).toEqual(1)
        expect((addError as unknown as jest.Mock).mock.calls).toEqual([
            ['Could not load contributions. Reason: "test error".']
        ])
    })
})
