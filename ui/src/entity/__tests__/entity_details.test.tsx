/**
 * @vitest-environment jsdom
 */
import { vi, Mock } from 'vitest'
import {
    Column,
    ColumnType,
    newColumn,
    newColumnSelectionState
} from '../../column_menu/state'
import { UserPermissionGroup, newPublicUserInfo, newUserInfo } from '../../user/state'
import { newEntity } from '../state'
import {
    NotificationType,
    newNotification,
    newNotificationManager
} from '../../util/notification/slice'
import { waitFor, screen } from '@testing-library/react'
import { newRemote } from '../../util/state'
import {
    EditSessionParticipantType,
    newEditSession,
    newEditSessionParticipant,
    newEditSessionState
} from '../../session/state'
import { newEntityDetails, newEntityDetailsState } from '../../entity/state'
import { EntityDetails } from '../components'
import { newValue } from '../../contribution/entity/state'
import { newAuthState } from '../../auth/state'
import { emptyState, renderWithProviders } from '../../util/tests/provider'
import {
    addResponseSequence,
    expectFetchCall,
    expectFetchCallList
} from '../../util/tests/response'

test('success', async () => {
    const fetchMock = vi.fn()
    addDetailsResponseSequence(fetchMock)
    const { store } = renderWithProviders(
        <EntityDetails idEntityPersistent={idEntityPersistent} />,
        fetchMock,
        { preloadedState }
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
                    valueList: [
                        newValue(idEntityPersistent, idColumnPersistent, {
                            idPersistent: idInstance,
                            value: value0,
                            version: versionInstance0,
                            isExisting: undefined,
                            isRequested: true
                        }),
                        newValue(idEntityPersistent, idColumnPersistent1, {
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
    await expectFetchCallList(fetchMock.mock.calls, [
        [
            `http://127.0.0.1:8000/cosmae/api/entities/values?id_persistent=${idEntityPersistent}`,
            { credentials: 'include' }
        ]
    ])
})
test('error', async () => {
    const fetchMock = vi.fn()
    const testError = 'Could not load entity details'
    addResponseSequence(fetchMock, [[500, { msg: testError }]])
    const { store } = renderWithProviders(
        <EntityDetails idEntityPersistent={idEntityPersistent} />,
        fetchMock,
        { preloadedState }
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
const test_entity_rsp = {
    display_txt: displayTxt,
    display_txt_details: 'display_txt_detail',
    id_persistent: idEntityPersistent,
    version: version,
    disabled: false,
    justification_txt: justification
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any

function addDetailsResponseSequence(fetchMock: Mock) {
    addResponseSequence(fetchMock, [
        [
            200,
            {
                entity: test_entity_rsp,
                value_list: [
                    {
                        id_persistent: idInstance,
                        id_entity_persistent: idEntityPersistent,
                        id_column_persistent: idColumnPersistent,
                        value: value0,
                        version: versionInstance0
                    },
                    {
                        id_persistent: idInstance1,
                        id_entity_persistent: idEntityPersistent,
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

const preloadedState = {
    ...emptyState,
    columnSelection: newColumnSelectionState({
        columnsByIdPersistent: {
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
                idColumnPersistentList: [columnTest.idPersistent]
            })
        )
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
}
