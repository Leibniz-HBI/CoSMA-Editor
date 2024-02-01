import { Toast, ToastContainer } from 'react-bootstrap'
import { Notification, removeNotification, selectNotificationList } from './slice'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch } from '../../store'
/**
 * Component for showing an error message and a retry button.
 * @param props
 * @returns
 */

const primaryStyle = {
    closeVariant: 'white',
    bgClass: 'bg-primary'
}
const notificationStyles: { [key: string]: { closeVariant: string; bgClass: string } } =
    {
        error: {
            closeVariant: 'white',
            bgClass: 'bg-danger'
        },
        success: primaryStyle
    }

export function NotificationToastList() {
    const errors = useSelector(selectNotificationList)
    const dispatch = useDispatch()
    return (
        <ToastContainer position="bottom-end" className="p-3 z-toast">
            {errors.map((notification) => (
                <NotificationToast notification={notification} dispatch={dispatch} />
            ))}
        </ToastContainer>
    )
}

function NotificationToast({
    notification,
    dispatch
}: {
    notification: Notification
    dispatch: AppDispatch
}) {
    const style = notificationStyles[notification.type as string] ?? primaryStyle
    return (
        <Toast
            onClose={() => dispatch(removeNotification(notification.id))}
            key={notification.id}
        >
            <Toast.Header
                closeButton={true}
                closeVariant={style.closeVariant}
                className={style.bgClass}
            ></Toast.Header>
            <Toast.Body>{notification.msg}</Toast.Body>
        </Toast>
    )
}
