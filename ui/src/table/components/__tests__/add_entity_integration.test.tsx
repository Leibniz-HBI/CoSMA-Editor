/**
 * @vitest-environment jsdom
 */
vi.mock('@glideapps/glide-data-grid', async () => {
    const actual = await vi.importActual('@glideapps/glide-data-grid')
    return {
        __esmodule: true,
        DataEditor: vi
            .fn()
            .mockImplementation((props: object) => <MockTable {...props} />),
        CompactSelection: actual.CompactSelection
    }
})
import { vi, Mock } from 'vitest'
import { Col, Row } from 'react-bootstrap'
import {
    UserPermissionGroup,
    newPublicUserInfo,
    newUserInfo
} from '../../../user/state'
import { newTableState } from '../../state'
import { newEntity } from '../../../entity/state'
import { waitFor, screen } from '@testing-library/react'
import { EntityAddModal } from '../modals'
import userEvent, { UserEvent } from '@testing-library/user-event'
import { newRemote } from '../../../util/state'
import { newAuthState } from '../../../auth/state'
import { emptyState, renderWithProviders } from '../../../util/tests/provider'
import { addResponseSequence, expectFetchCallList } from '../../../util/tests/response'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MockTable(props: any) {
    return (
        <div className="mock">
            <Col>
                {Array.from({ length: props.rows }, (_, idx: number) => idx).map(
                    (idxRow) => (
                        <Row>
                            {Array.from(
                                { length: props.columns.length },
                                (_, idx: number) => idx
                            ).map((idxCol) => {
                                const cell = props.getCellContent([idxCol, idxRow])
                                if (cell.kind == 'text') {
                                    return <Col>{cell.displayData}</Col>
                                }
                                return <Col></Col>
                            })}
                        </Row>
                    )
                )}
            </Col>
        </div>
    )
}
const idPersistent0 = 'test-id-0'
const version0 = 0
const displayTxt0 = 'test display txt 0'
const justification0 = 'Tremendously terrific shit poster.'

test('success new entity', async () => {
    const fetchMock = vi.fn()
    addEntityResponse(fetchMock, displayTxt0, justification0)
    const { store } = renderWithProviders(<EntityAddModal />, fetchMock, initialState)
    const user = userEvent.setup()
    await fillEntityForm(user, displayTxt0, justification0)
    await waitFor(() => {
        const state = store.getState()
        expect(state.table.entities).toEqual([
            newEntity({
                displayTxt: displayTxt0,
                idPersistent: idPersistent0,
                version: version0,
                disabled: false,
                justificationTxt: justification0,
                displayTxtDetails: 'display_txt_detail'
            })
        ])
    })
    await expectFetchCallList(fetchMock.mock.calls, [
        [
            'http://127.0.0.1:8000/cosmae/api/entities',
            {
                body: {
                    entity_list: [
                        { display_txt: displayTxt0, justification_txt: justification0 }
                    ]
                },
                credentials: 'include',
                method: 'POST'
            }
        ]
    ])
})
test('success new entity no display text', async () => {
    const fetchMock = vi.fn()
    addEntityResponse(fetchMock, displayTxt0, justification0)
    const { store } = renderWithProviders(<EntityAddModal />, fetchMock, initialState)
    const user = userEvent.setup()
    await fillEntityForm(user, undefined, justification0)
    await waitFor(() => {
        const state = store.getState()
        expect(state.table.entities).toEqual([
            newEntity({
                displayTxt: displayTxt0,
                idPersistent: idPersistent0,
                version: version0,
                disabled: false,
                justificationTxt: justification0,
                displayTxtDetails: 'display_txt_detail'
            })
        ])
    })
    await expectFetchCallList(fetchMock.mock.calls, [
        [
            'http://127.0.0.1:8000/cosmae/api/entities',
            {
                credentials: 'include',
                body: {
                    entity_list: [{ justification_txt: justification0 }]
                },
                method: 'POST'
            }
        ]
    ])
})

function addEntityResponse(fetchMock: Mock, displayTxt: string, justification: string) {
    addResponseSequence(fetchMock, [
        [
            200,
            {
                entity_list: [
                    {
                        id_persistent: idPersistent0,
                        display_txt: displayTxt,
                        display_txt_details: 'display_txt_detail',
                        justification_txt: justification,
                        version: version0,
                        disabled: false
                    }
                ]
            }
        ]
    ])
}

async function fillEntityForm(
    user: UserEvent,
    displayTxt: string | undefined,
    justification: string
) {
    await waitFor(
        async () => {
            const textBoxes = screen.getAllByRole('textbox')
            expect(textBoxes.length).toEqual(2)
            const button = screen.getByRole('button', { name: 'Add Entity' })
            if (displayTxt !== undefined) {
                await user.type(textBoxes[0], displayTxt ?? ' ')
            }
            await user.type(textBoxes[1], justification)
            await user.click(button)
        },
        { timeout: 4000 }
    )
}

const nameUserTest = 'user_test'
const idUserTest = 'id-user-test'
const userTest = newPublicUserInfo({
    idPersistent: idUserTest,
    username: nameUserTest,
    permissionGroup: UserPermissionGroup.CONTRIBUTOR
})

const initialState = {
    preloadedState: {
        ...emptyState,
        table: newTableState({ showEntityAddDialog: true }),
        auth: newAuthState({
            user: newRemote(
                newUserInfo({
                    ...userTest,
                    email: 'mail@test.org',
                    namesPersonal: 'names personal',
                    idColumnPersistentList: []
                })
            )
        }),
        tableSelection: { rows: [], cols: [], rowSelectionOrder: [] }
    }
}
