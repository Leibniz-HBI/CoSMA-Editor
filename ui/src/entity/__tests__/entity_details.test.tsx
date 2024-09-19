/**
 * @jest-environment jsdom
 */
import {
    TagDefinition,
    TagSelectionState,
    TagType,
    newTagDefinition,
    newTagSelectionState
} from '../../column_menu/state'
import {
    UserPermissionGroup,
    UserState,
    newPublicUserInfo,
    newUserInfo,
    newUserState
} from '../../user/state'
import { TableState, newEntity, newTableState } from '../../table/state'
import {
    NotificationManager,
    NotificationType,
    newNotification,
    newNotificationManager,
    notificationReducer
} from '../../util/notification/slice'
import { RenderOptions, waitFor, render, screen } from '@testing-library/react'
import { tableReducer } from '../../table/slice'
import { configureStore } from '@reduxjs/toolkit'
import { PropsWithChildren } from 'react'
import { Provider } from 'react-redux'
import { userSlice } from '../../user/slice'
import { TableSelectionState, tableSelectionSlice } from '../../table/selection/slice'
import { tagSelectionSlice } from '../../column_menu/slice'
import { newRemote } from '../../util/state'
import {
    EditSessionParticipantType,
    EditSessionState,
    newEditSession,
    newEditSessionParticipant,
    newEditSessionState
} from '../../session/state'
import { editSessionReducer } from '../../session/slice'
import { entityDetailsReducer } from '../../entity/slice'
import {
    EntityDetailsState,
    newEntityDetails,
    newEntityDetailsState
} from '../../entity/state'
import { EntityDetails } from '../components'
import { newTagInstance } from '../../contribution/entity/state'

test('success', async () => {
    const fetchMock = jest.fn()
    addDetailsResponseSequence(fetchMock)
    const { store } = renderWithProviders(
        <EntityDetails idEntityPersistent={idEntityPersistent} />,
        fetchMock
    )
    await waitFor(() => {
        screen.getByText(columnNameTest)
        screen.getByText(value0)
        screen.getByText(columnNameTest1)
        screen.getByText(value1)
    })
    expect(store.getState().notification).toEqual(newNotificationManager({}))
    expect(store.getState().entityDetails).toEqual(
        newEntityDetailsState({
            showEntityDetails: idEntityPersistent,
            entityDetails: newRemote(
                newEntityDetails({
                    entity: newEntity({
                        idPersistent: idEntityPersistent,
                        displayTxt: displayTxt,
                        version: version,
                        displayTxtDetails: 'display_txt_detail',
                        disabled: false,
                        justificationTxt: justification
                    }),
                    tagInstanceList: [
                        newTagInstance(idEntityPersistent, idTagDefPersistent, {
                            idPersistent: idInstance,
                            value: value0,
                            version: versionInstance0,
                            isExisting: undefined,
                            isRequested: true
                        }),
                        newTagInstance(idEntityPersistent, idTagDefPersistent1, {
                            idPersistent: idInstance1,
                            value: value1,
                            version: versionInstance1,
                            isExisting: undefined,
                            isRequested: true
                        })
                    ]
                })
            )
        })
    )
})
test('error', async () => {
    const fetchMock = jest.fn()
    const testError = 'Could not load entity details'
    addResponseSequence(fetchMock, [[500, { msg: testError }]])
    const { store } = renderWithProviders(
        <EntityDetails idEntityPersistent={idEntityPersistent} />,
        fetchMock
    )
    await waitFor(() => {
        const state = store.getState()
        expect(state.entityDetails).toEqual(
            newEntityDetailsState({ showEntityDetails: idEntityPersistent })
        )
        expect(state.notification).toEqual(
            newNotificationManager({
                notificationList: [
                    newNotification({
                        msg: testError,
                        type: NotificationType.Error,
                        id: expect.anything()
                    })
                ],
                notificationMap: expect.anything()
            })
        )
    })
})
const idEntityPersistent = 'test-id-0'
const version = 0
const displayTxt = 'test display txt 0'
const justification = 'very prolific shit poster'
const test_person_rsp = {
    display_txt: displayTxt,
    display_txt_details: 'display_txt_detail',
    id_persistent: idEntityPersistent,
    version: version,
    disabled: false,
    justification_txt: justification
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

function addDetailsResponseSequence(fetchMock: jest.Mock) {
    addResponseSequence(fetchMock, [
        [
            200,
            {
                entity: test_person_rsp,
                tag_instance_list: [
                    {
                        id_persistent: idInstance,
                        id_entity_persistent: idEntityPersistent,
                        id_tag_definition_persistent: idTagDefPersistent,
                        value: value0,
                        version: versionInstance0
                    },
                    {
                        id_persistent: idInstance1,
                        id_entity_persistent: idEntityPersistent,
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
            entityDetails: newEntityDetailsState({
                showEntityDetails: idEntityPersistent
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
