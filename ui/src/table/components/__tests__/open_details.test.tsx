/**
 * @jest-environment jsdom
 */
jest.mock('@glideapps/glide-data-grid', () => {
    const actual = jest.requireActual('@glideapps/glide-data-grid')
    return {
        __esmodule: true,
        DataEditor: jest
            .fn()
            .mockImplementation((props: object) => <MockTable {...props} />),
        CompactSelection: actual.CompactSelection
    }
})
import { Col, Row } from 'react-bootstrap'
import {
    TagDefinition,
    TagSelectionState,
    TagType,
    newTagDefinition,
    newTagSelectionState
} from '../../../column_menu/state'
import {
    UserPermissionGroup,
    UserState,
    newPublicUserInfo,
    newUserInfo,
    newUserState
} from '../../../user/state'
import { TableState, newTableState } from '../../state'
import {
    NotificationManager,
    newNotificationManager,
    notificationReducer
} from '../../../util/notification/slice'
import { RenderOptions, waitFor, render, screen } from '@testing-library/react'
import { tableReducer } from '../../slice'
import { configureStore } from '@reduxjs/toolkit'
import { PropsWithChildren } from 'react'
import { Provider } from 'react-redux'
import { RemoteDataTable } from '../table'
import { userSlice } from '../../../user/slice'
import { TableSelectionState, tableSelectionSlice } from '../../selection/slice'
import { tagSelectionSlice } from '../../../column_menu/slice'
import { newRemote } from '../../../util/state'
import {
    EditSessionParticipantType,
    EditSessionState,
    newEditSession,
    newEditSessionParticipant,
    newEditSessionState
} from '../../../session/state'
import { editSessionReducer } from '../../../session/slice'
import { entityDetailsReducer } from '../../../entity/slice'
import { EntityDetailsState, newEntityDetailsState } from '../../../entity/state'

test('open details', async () => {
    const modalText = `Entity Details`
    const fetchMock = jest.fn()
    addEntitiesAndInstancesResponse(fetchMock)
    addDetailsResponseSequence(fetchMock)
    const { store } = renderWithProviders(<RemoteDataTable />, fetchMock)
    await waitFor(() => {
        const infoIcons = screen.getAllByText('🛈')
        expect(infoIcons).toHaveLength(2)
        expect(screen.queryByText(modalText)).toBeNull()
        infoIcons[1].click()
    })
    await waitFor(() => {
        screen.getByText(modalText)
        screen.getByText(columnNameTest)
        screen.getByText(value0)
        screen.getByText(columnNameTest1)
        screen.getByText(value1)
        expect(store.getState().entityDetails.showEntityDetails).toEqual(idPersistent1)
        const closeButton = screen.getByLabelText('Close')
        closeButton.click()
    })
    await waitFor(() => {
        expect(screen.queryByText(modalText)).toBeNull()
    })
})
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
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
                                                onClick={() =>
                                                    props.onCellActivated([
                                                        idxCol,
                                                        idxRow
                                                    ])
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

const idPersistent0 = 'test-id-0'
const idPersistent1 = 'test-id-1'
const version0 = 0
const version1 = 1
const displayTxt0 = 'test display txt 0'
const displayTxt1 = 'test display txt 1'
const justification = 'very prolific shit poster'
const justification1 = 'tremendously prolific shit poster'
const test_person_rsp_0 = {
    display_txt: displayTxt0,
    display_txt_details: 'display_txt_detail',
    id_persistent: idPersistent0,
    version: version0,
    disabled: false,
    justification_txt: justification
}
const test_person_rsp_1 = {
    display_txt: displayTxt1,
    display_txt_details: 'display_txt_detail',
    id_persistent: idPersistent1,
    version: version1,
    disabled: false,
    justification_txt: justification1
}
const columnNameTest = 'column name test'
const columnNameTest1 = 'column name test 1'
const idTagDefPersistent = 'column_id_test'
const idTagDefPersistent1 = 'column_id_test1'
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addResponseSequence(fetchMock: jest.Mock, responses: [number, any][]) {
    for (const tpl of responses) {
        const [status_code, rsp] = tpl
        fetchMock.mockImplementationOnce(
            jest.fn(() =>
                Promise.resolve({
                    status: status_code,
                    json: () => Promise.resolve(rsp)
                })
            )
        )
    }
}
function addEntitiesAndInstancesResponse(fetchMock: jest.Mock) {
    addResponseSequence(fetchMock, [
        [200, { persons: [test_person_rsp_0, test_person_rsp_1] }],
        [200, { tag_instances: [] }]
    ])
}

function addDetailsResponseSequence(fetchMock: jest.Mock) {
    addResponseSequence(fetchMock, [
        [
            200,
            {
                entity: test_person_rsp_1,
                tag_instance_list: [
                    {
                        id_persistent: idInstance,
                        id_entity_persistent: idPersistent1,
                        id_tag_definition_persistent: idTagDefPersistent,
                        value: value0,
                        version: versionInstance0
                    },
                    {
                        id_persistent: idInstance1,
                        id_entity_persistent: idPersistent1,
                        id_tag_definition_persistent: idTagDefPersistent1,
                        value: value1,
                        version: versionInstance1
                    }
                ]
            }
        ]
    ])
}
interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: {
        notification: NotificationManager
        table: TableState
        tableSelection: TableSelectionState
        tagSelection: TagSelectionState
        user: UserState
        entityDetails: EntityDetailsState
        editSession: EditSessionState
    }
}

const tagDefTest: TagDefinition = newTagDefinition({
    namePath: [columnNameTest],
    idPersistent: idTagDefPersistent,
    idParentPersistent: undefined,
    columnType: TagType.String,
    curated: false,
    owner: userTest,
    version: 2,
    hidden: false
})

const tagDefTest1: TagDefinition = newTagDefinition({
    namePath: [columnNameTest1],
    idPersistent: idTagDefPersistent1,
    idParentPersistent: undefined,
    columnType: TagType.String,
    curated: false,
    owner: userTest,
    version: 4,
    hidden: false
})

export function renderWithProviders(
    ui: React.ReactElement,
    fetchMock: jest.Mock,
    {
        preloadedState = {
            notification: newNotificationManager({}),
            table: newTableState({}),
            tableSelection: { rows: [], cols: [], rowSelectionOrder: [] },
            tagSelection: newTagSelectionState({
                tagDefinitionsByIdPersistent: {
                    [idTagDefPersistent]: newRemote(tagDefTest),
                    [idTagDefPersistent1]: newRemote(tagDefTest1)
                }
            }),
            user: newUserState({
                userInfo: newUserInfo({
                    ...userTest,
                    email: 'mail@test.org',
                    namesPersonal: 'names personal',
                    columns: [tagDefTest]
                })
            }),
            entityDetails: newEntityDetailsState({}),
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
        },
        ...renderOptions
    }: ExtendedRenderOptions = {}
) {
    const store = configureStore({
        reducer: {
            notification: notificationReducer,
            tableSelection: tableSelectionSlice.reducer,
            tagSelection: tagSelectionSlice.reducer,
            table: tableReducer,
            user: userSlice.reducer,
            entityDetails: entityDetailsReducer,
            editSession: editSessionReducer
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
