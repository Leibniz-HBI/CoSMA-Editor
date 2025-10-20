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
vi.mock('../../../entity/components', async () => {
    const actual = await vi.importActual('../../../entity/components')
    return {
        __esmodule: true,
        ...actual,
        EntityDetails: vi
            .fn()
            .mockImplementation((props: { idEntityPersistent: string }) => (
                <MockEntityDetails {...props} />
            ))
    }
})
import { vi, Mock } from 'vitest'
import { Col, Row } from 'react-bootstrap'
import {
    Column,
    ColumnType,
    newColumn,
    newColumnSelectionState
} from '../../../column_menu/state'
import {
    UserPermissionGroup,
    newPublicUserInfo,
    newUserInfo,
} from '../../../user/state'
import {
    displayTextColumn,
    displayTxtColumnId,
    justificationColumn,
    justificationColumnId,
} from '../../state'
import { waitFor, screen } from '@testing-library/react'
import { RemoteDataTable } from '../table'
import { newRemote } from '../../../util/state'
import {
    EditSessionParticipantType,
    newEditSession,
    newEditSessionParticipant,
    newEditSessionState
} from '../../../session/state'
import userEvent from '@testing-library/user-event'
import { newAuthState } from '../../../auth/state'
import { emptyState, renderWithProviders } from '../../../util/tests/provider'
import { addResponseSequence } from '../../../util/tests/response'

test('open details', async () => {
    const modalTitleText = `Entity Details`
    const modalContentText = `Show details for entity with id ${idPersistent1}`
    const fetchMock = vi.fn()
    addEntitiesAndInstancesResponse(fetchMock)
    addDetailsResponseSequence(fetchMock)
    const { store } = renderWithProviders(<RemoteDataTable />, fetchMock, preloadedState)
    const user = userEvent.setup()
    await waitFor(async () => {
        const cell = screen.getByText(displayTxt1)
        await user.hover(cell)
    })
    await waitFor(async () => {
        const trigger = screen.getByTestId('details-trigger')
        await user.click(trigger)
    })

    await waitFor(() => {
        screen.getByText(modalTitleText)
        screen.getByText(modalContentText)
        expect(store.getState().entityDetails.showEntityDetails).toEqual(idPersistent1)
        const closeButton = screen.getByLabelText('Close')
        closeButton.click()
    })
    await waitFor(() => {
        expect(screen.queryByText(modalTitleText)).toBeNull()
        expect(screen.queryByText(modalContentText)).toBeNull()
    })
})
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MockTable(props: any) {
    return (
        <div className="mock">
            <Col>
                <Row>{props.rightElement}</Row>
                <Row>
                    <Col>
                        {Array.from(
                            { length: props.rows },
                            (_, idx: number) => idx
                        ).map((idxRow) => (
                            <Row>
                                {Array.from(
                                    { length: props.columns.length },
                                    (_, idx: number) => idx
                                ).map((idxCol) => {
                                    const cell = props.getCellContent([idxCol, idxRow])
                                    if (cell.kind == 'text') {
                                        return (
                                            <Col
                                                onMouseEnter={(e) =>
                                                    props.onItemHovered({
                                                        kind: 'cell',
                                                        location: [idxCol, idxRow],
                                                        bounds: {
                                                            x: e.clientX,
                                                            y: e.clientY,
                                                            width: 50,
                                                            height: 50
                                                        }
                                                    })
                                                }
                                            >
                                                {cell.displayData}
                                            </Col>
                                        )
                                    }
                                    return <Col></Col>
                                })}
                            </Row>
                        ))}
                    </Col>
                </Row>
            </Col>
        </div>
    )
}

function MockEntityDetails({ idEntityPersistent }: { idEntityPersistent: string }) {
    return <div>{`Show details for entity with id ${idEntityPersistent}`}</div>
}

const idPersistent0 = 'test-id-0'
const idPersistent1 = 'test-id-1'
const version0 = 0
const version1 = 1
const displayTxt0 = 'test display txt 0'
const displayTxt1 = 'test display txt 1'
const justification = 'very prolific shit poster'
const justification1 = 'tremendously prolific shit poster'
const test_entity_rsp_0 = {
    display_txt: displayTxt0,
    display_txt_details: 'display_txt_detail',
    id_persistent: idPersistent0,
    version: version0,
    disabled: false,
    justification_txt: justification
}
const test_entities_rsp_1 = {
    display_txt: displayTxt1,
    display_txt_details: 'display_txt_detail',
    id_persistent: idPersistent1,
    version: version1,
    disabled: false,
    justification_txt: justification1
}
const columnNameTest = 'column name test'
const columnNameTest1 = 'column name test 1'
const idColumnPersistent = 'column_id_test'
const idColumnPersistent1 = 'column_id_test1'
const nameUserTest = 'user_test'
const idUserTest = 'id-user-test'
const userTest = newPublicUserInfo({
    idPersistent: idUserTest,
    username: nameUserTest,
    permissionGroup: UserPermissionGroup.CONTRIBUTOR
})
const idInstance = 'id-instance-0'
const idInstance1 = 'id-instance-1'
const value0 = 'value 0'
const value1 = 'value 1'
const versionInstance0 = 10
const versionInstance1 = 11

function addEntitiesAndInstancesResponse(fetchMock: Mock) {
    addResponseSequence(fetchMock, [
        [
            200,
            {
                entity_list: [test_entity_rsp_0, test_entities_rsp_1],
                next_offset: version1 + 1
            }
        ],
        [200, { entity_list: [], next_offset: 0 }],
        [200, { value_list: [] }]
    ])
}

function addDetailsResponseSequence(fetchMock: Mock) {
    addResponseSequence(fetchMock, [
        [
            200,
            {
                entity: test_entities_rsp_1,
                value_list: [
                    {
                        id_persistent: idInstance,
                        id_entity_persistent: idPersistent1,
                        id_column_persistent: idColumnPersistent,
                        value: value0,
                        version: versionInstance0
                    },
                    {
                        id_persistent: idInstance1,
                        id_entity_persistent: idPersistent1,
                        id_column_persistent: idColumnPersistent1,
                        value: value1,
                        version: versionInstance1
                    }
                ]
            }
        ]
    ])
}

const columnTest: Column = newColumn({
    namePath: [columnNameTest],
    idPersistent: idColumnPersistent,
    idParentPersistent: undefined,
    columnType: ColumnType.String,
    curated: false,
    owner: userTest,
    version: 2,
    hidden: false
})

const columnTest1: Column = newColumn({
    namePath: [columnNameTest1],
    idPersistent: idColumnPersistent1,
    idParentPersistent: undefined,
    columnType: ColumnType.String,
    curated: false,
    owner: userTest,
    version: 4,
    hidden: false
})
const initialState = {
    ...emptyState,

    columnSelection: newColumnSelectionState({
        columnsByIdPersistent: {
            [displayTxtColumnId]: newRemote(displayTextColumn),
            [justificationColumnId]: newRemote(justificationColumn),
            [idColumnPersistent]: newRemote(columnTest),
            [idColumnPersistent1]: newRemote(columnTest1)
        }
    }),
    auth: newAuthState({
        user: newRemote(
            newUserInfo({
                ...userTest,
                email: 'mail@test.org',
                namesPersonal: 'names personal',
                idColumnPersistentList: [idColumnPersistent]
            })
        )
    }),
    editSession: newEditSessionState({
        currentEditSession: newRemote(
            newEditSession({
                idPersistent: 'id-session-test',
                name: 'edit session for tests',
                owner: newEditSessionParticipant({
                    type: EditSessionParticipantType.internal,
                    name: 'edit session owner test',
                    id: idUserTest
                }),
                participantList: [],
                participantMap: {}
            })
        )
    })
}

const preloadedState = { preloadedState: initialState }
