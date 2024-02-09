import { PayloadAction, createSelector, createSlice } from '@reduxjs/toolkit'
import { v4 as uuid4 } from 'uuid'
import { AppDispatch, RootState } from '../../store'

export enum NotificationType {
    Error = 'error',
    Success = 'success'
}

export interface Notification {
    id: string
    msg: string
    type: NotificationType
}

export function newNotification({
    msg,
    type = NotificationType.Success,
    id = undefined
}: {
    msg: string
    type?: NotificationType
    id?: string
}) {
    let errorId = id
    if (errorId === undefined) {
        errorId = uuid4()
    }
    return {
        msg,
        type,
        id: errorId
    }
}

export interface NotificationManager {
    notificationList: Notification[]
    notificationMap: { [key: string]: number }
    helpPath?: string
}

export function newNotificationManager({
    notificationList = [],
    notificationMap = {},
    helpPath = undefined
}: {
    notificationList?: Notification[]
    notificationMap?: { [key: string]: number }
    helpPath?: string
}): NotificationManager {
    return { notificationList, notificationMap, helpPath }
}

const initialState: NotificationManager = {
    notificationList: [],
    notificationMap: {}
}

const notificationSlice = createSlice({
    initialState,
    name: 'error',
    reducers: {
        addNotification: (
            state: NotificationManager,
            action: PayloadAction<{ msg: string; type?: NotificationType; id?: string }>
        ) => {
            const notification = newNotification(action.payload)
            addNotificationToState(state, notification)
        },
        addError: (state: NotificationManager, action: PayloadAction<string>) => {
            const notification = newNotification({
                msg: action.payload,
                type: NotificationType.Error
            })
            addNotificationToState(state, notification)
        },
        removeNotification: (
            state: NotificationManager,
            action: PayloadAction<string>
        ) => {
            const idx = state.notificationMap[action.payload]
            delete state.notificationMap[action.payload]
            if (idx !== undefined) {
                state.notificationList.splice(idx, 1)
                for (const [key, value] of Object.entries(state.notificationMap)) {
                    if (value > idx) {
                        state.notificationMap[key] = value - 1
                    }
                }
            }
        },
        setHelpPath: (state: NotificationManager, action: PayloadAction<string>) => {
            state.helpPath = action.payload
        },
        clearHelpPath: (state: NotificationManager) => {
            state.helpPath = undefined
        }
    }
})

export const notificationReducer = notificationSlice.reducer

export const {
    addError,
    addNotification,
    removeNotification,
    setHelpPath,
    clearHelpPath
} = notificationSlice.actions

function addNotificationToState(
    state: NotificationManager,
    notification: { msg: string; type: NotificationType; id: string }
) {
    state.notificationMap[notification.id] = state.notificationList.length
    state.notificationList.push(notification)
}

export function addVanishingNotification(props: {
    msg: string
    type: NotificationType
    id?: string
    vanishDelay: number
}) {
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    return async (dispatch: AppDispatch) => {
        const notification = newNotification(props)
        dispatch(addNotification(notification))
        setTimeout(
            () => dispatch(removeNotification(notification.id)),
            props.vanishDelay
        )
    }
}

export function addSuccessVanish(msg: string, vanishDelay = 3000) {
    return addVanishingNotification({
        msg: msg,
        type: NotificationType.Success,
        vanishDelay: vanishDelay
    })
}

export function selectNotificationManager(state: RootState): NotificationManager {
    return state.notification
}

export const selectNotificationList = createSelector(
    selectNotificationManager,
    (manager) => manager.notificationList
)
export const selectHelpPath = createSelector(
    selectNotificationManager,
    (manager) => manager.helpPath
)
