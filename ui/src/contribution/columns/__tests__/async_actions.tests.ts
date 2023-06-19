import { Contribution, ContributionStep } from '../../state'
import {
    FinalizeColumnAssignmentErrorAction,
    FinalizeColumnAssignmentStartAction,
    FinalizeColumnAssignmentSuccessAction,
    LoadColumnDefinitionsContributionErrorAction,
    LoadColumnDefinitionsContributionStartAction,
    LoadColumnDefinitionsContributionSuccessAction,
    PatchColumnDefinitionContributionErrorAction,
    PatchColumnDefinitionContributionStartAction,
    PatchColumnDefinitionContributionSuccessAction
} from '../actions'
import {
    FinalizeColumnAssignmentAction,
    LoadColumnDefinitionsContributionAction,
    PatchColumnDefinitionContributionAction
} from '../async_actions'
import { ColumnDefinitionContribution } from '../state'

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

const tagDefinitionContributionApiTest1 = {
    name: 'tag definition test 1',
    id_persistent: 'id-tag-def-test-1',
    id_existing_persistent: 'id-existing-test-1',
    index_in_file: 1,
    discard: false
}
const columnDefContributionTest1 = new ColumnDefinitionContribution({
    name: 'tag definition test 1',
    idPersistent: 'id-tag-def-test-1',
    idExistingPersistent: 'id-existing-test-1',
    indexInFile: 1,
    discard: false
})
describe('load column definitions contribution', () => {
    test('success', async () => {
        responseSequence([
            [
                200,
                () => {
                    return {
                        tag_definitions: [
                            {
                                name: 'tag definition test 0',
                                id_persistent: 'id-tag-def-test-0',
                                index_in_file: 0,
                                discard: true
                            },
                            tagDefinitionContributionApiTest1
                        ],
                        contribution_candidate: {
                            name: 'contribution test',
                            id_persistent: 'contribution-id-test',
                            description: 'a contribution candidate for use in tests',
                            author: 'test author',
                            state: 'COLUMNS_EXTRACTED',
                            has_header: true,
                            anonymous: false
                        }
                    }
                }
            ]
        ])
        const dispatch = jest.fn()
        await new LoadColumnDefinitionsContributionAction('contribution-id-test').run(
            dispatch
        )
        expect((fetch as jest.Mock).mock.calls).toEqual([
            [
                'http://127.0.0.1:8000/cosmae/api/contributions/contribution-id-test/tags',
                { credentials: 'include' }
            ]
        ])
        expect(dispatch.mock.calls).toEqual([
            [new LoadColumnDefinitionsContributionStartAction()],
            [
                new LoadColumnDefinitionsContributionSuccessAction(
                    [columnDefContributionTest1],
                    [
                        new ColumnDefinitionContribution({
                            name: 'tag definition test 0',
                            idPersistent: 'id-tag-def-test-0',
                            indexInFile: 0,
                            discard: true
                        })
                    ],
                    new Contribution({
                        name: 'contribution test',
                        idPersistent: 'contribution-id-test',
                        description: 'a contribution candidate for use in tests',
                        author: 'test author',
                        step: ContributionStep.ColumnsExtracted,
                        hasHeader: true,
                        anonymous: false
                    })
                )
            ]
        ])
    })
    test('error', async () => {
        responseSequence([
            [
                400,
                () => {
                    return { msg: 'test error' }
                }
            ]
        ])
        const dispatch = jest.fn()
        await new LoadColumnDefinitionsContributionAction('id-test').run(dispatch)
        expect(dispatch.mock.calls).toEqual([
            [new LoadColumnDefinitionsContributionStartAction()],
            [new LoadColumnDefinitionsContributionErrorAction('test error')]
        ])
    })
})
describe('patch column definition contribution', () => {
    test('success', async () => {
        responseSequence([[200, () => tagDefinitionContributionApiTest1]])
        const dispatch = jest.fn()
        await new PatchColumnDefinitionContributionAction({
            idPersistent: tagDefinitionContributionApiTest1.id_persistent,
            idContributionPersistent: 'id-contribution-test',
            idExistingPersistent:
                tagDefinitionContributionApiTest1.id_existing_persistent
        }).run(dispatch)
        expect(dispatch.mock.calls).toEqual([
            [new PatchColumnDefinitionContributionStartAction()],
            [
                new PatchColumnDefinitionContributionSuccessAction(
                    columnDefContributionTest1
                )
            ]
        ])
        expect((fetch as jest.Mock).mock.calls).toEqual([
            [
                'http://127.0.0.1:8000/cosmae/api/contributions/id-contribution-test/tags/id-tag-def-test-1',
                {
                    method: 'PATCH',
                    credentials: 'include',
                    body: JSON.stringify({
                        id_existing_persistent:
                            tagDefinitionContributionApiTest1.id_existing_persistent
                    })
                }
            ]
        ])
    })
    test('error', async () => {
        responseSequence([
            [
                400,
                () => {
                    return { msg: 'test error' }
                }
            ]
        ])
        const dispatch = jest.fn()
        await new PatchColumnDefinitionContributionAction({
            idPersistent: tagDefinitionContributionApiTest1.id_persistent,
            idContributionPersistent: 'id-contribution-test',
            idExistingPersistent:
                tagDefinitionContributionApiTest1.id_existing_persistent
        }).run(dispatch)
        expect(dispatch.mock.calls).toEqual([
            [new PatchColumnDefinitionContributionStartAction()],
            [new PatchColumnDefinitionContributionErrorAction('test error')]
        ])
    })
})

describe('finalize column assignment', () => {
    test('success', async () => {
        responseSequence([
            [
                200,
                () => {
                    return {}
                }
            ]
        ])
        const dispatch = jest.fn()
        await new FinalizeColumnAssignmentAction('contribution-id-test').run(dispatch)
        expect((fetch as jest.Mock).mock.calls).toEqual([
            [
                'http://127.0.0.1:8000/cosmae/api/contributions/contribution-id-test/column_assignment_complete',
                { credentials: 'include', method: 'POST' }
            ]
        ])
        expect(dispatch.mock.calls).toEqual([
            [new FinalizeColumnAssignmentStartAction()],
            [new FinalizeColumnAssignmentSuccessAction()]
        ])
    })
    test('error', async () => {
        responseSequence([
            [
                400,
                () => {
                    return { msg: 'test error' }
                }
            ]
        ])
        const dispatch = jest.fn()
        await new FinalizeColumnAssignmentAction('id-test').run(dispatch)
        expect(dispatch.mock.calls).toEqual([
            [new FinalizeColumnAssignmentStartAction()],
            [new FinalizeColumnAssignmentErrorAction('test error')]
        ])
    })
})
