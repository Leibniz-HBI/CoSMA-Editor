import { Button, Card, Placeholder } from 'react-bootstrap'
import { Remote, RemoteInterface } from '../state'
import { ReactNode } from 'react'

export function CosmaeLoading() {
    return <div className="shimmer h-100 v-100"></div>
}

export function RemoteTriggerButton({
    remoteState,
    onClick,
    normalLabel,
    successLabel
}: {
    normalLabel: string
    successLabel: string
    remoteState: Remote<boolean> | RemoteInterface<boolean>
    onClick: VoidFunction
}) {
    const loading = remoteState.isLoading
    const success = remoteState.value
    if (success) {
        return (
            <Button active={false} variant="outline-primary">
                <span className="text-primary fw-bold">{successLabel}</span>
            </Button>
        )
    }
    if (loading) {
        return (
            <Placeholder.Button variant="primary" animation="wave">
                <span>{normalLabel}</span>
            </Placeholder.Button>
        )
    }
    return (
        <Button
            variant="outline-primary"
            onClick={onClick}
            data-testid="complete-column-assignment-button"
        >
            <span>{normalLabel}</span>
        </Button>
    )
}

export function ChoiceButton({
    label,
    checked,
    onClick,
    className = ''
}: {
    label: string
    checked: boolean
    onClick: VoidFunction
    className?: string
}) {
    if (checked) {
        return (
            <Button variant="primary" className={className}>
                <span>{label}</span>
            </Button>
        )
    }
    return (
        <Button variant="outline-primary" onClick={onClick} className={className}>
            <span>{label}</span>
        </Button>
    )
}

export function CosmaeCard({
    title,
    text,
    children,
    className = ''
}: {
    title?: string
    text?: string
    children: ReactNode
    className?: string
}) {
    return (
        <Card className={className}>
            <Card.Body className="bg-light d-flex flex-column pt-0 ps-0 pe-0">
                <div className="bg-primary-subtle ps-2 pe-2 pt-2 pb-3 mb-2">
                    {title !== undefined && <Card.Title>{title}</Card.Title>}
                    {text !== undefined && <Card.Text>{text}</Card.Text>}
                </div>
                {children}
            </Card.Body>
        </Card>
    )
}
