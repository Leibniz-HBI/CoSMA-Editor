import { Modal, Toast, ToastContainer } from 'react-bootstrap'
import {
    Notification,
    clearHelpPath,
    removeNotification,
    selectHelpPath,
    selectNotificationList,
    setHelpPath
} from './slice'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch } from '../../store'
import { QuestionDiamondFill } from 'react-bootstrap-icons'
import { useLocation } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../hooks'
import Markdown from 'react-markdown'
import { getHelpFromPathSegments } from '../../help_texts'
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
                <NotificationToast
                    notification={notification}
                    dispatch={dispatch}
                    key={notification.id}
                />
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
        <Toast onClose={() => dispatch(removeNotification(notification.id))}>
            <Toast.Header
                closeButton={true}
                closeVariant={style.closeVariant}
                className={style.bgClass}
            ></Toast.Header>
            <Toast.Body>{notification.msg}</Toast.Body>
        </Toast>
    )
}

export function HelpButton() {
    const location = useLocation()
    const dispatch = useAppDispatch()
    return (
        <div
            className="text-warning ms-2 me-2 mt-1 mb-1"
            role="button"
            onClick={() => {
                dispatch(setHelpPath(location.pathname))
            }}
        >
            <QuestionDiamondFill size={20} />
        </div>
    )
}

const missingHelpMarkdown = `# Missing Help
the documentation for this page is still missing.
If you have a GitHub account please report it by reporting an issue on github.`

export function HelpModal() {
    const helpPath = useAppSelector(selectHelpPath)
    const dispatch = useAppDispatch()
    const helpPathParts = helpPath?.split('/') ?? ['']
    let markdown = getHelpFromPathSegments(helpPathParts)
    if (markdown === undefined) {
        markdown = missingHelpMarkdown
    }
    return (
        <Modal
            show={helpPath !== undefined}
            onHide={() => dispatch(clearHelpPath())}
            scrollable={true}
            size="lg"
        >
            <Modal.Header closeButton={true}>HELP</Modal.Header>
            <Modal.Body>
                <Markdown>{markdown}</Markdown>
            </Modal.Body>
        </Modal>
    )
}
