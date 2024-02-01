import { Button, Card, Placeholder } from 'react-bootstrap'
import { ReactNode } from 'react'

export function CosmaeLoading() {
    return <div className="shimmer h-100 v-100"></div>
}

export function RemoteTriggerButton({
    isLoading,
    onClick,
    label
}: {
    label: string
    isLoading: boolean
    onClick: VoidFunction
}) {
    if (isLoading) {
        return (
            <Placeholder.Button variant="primary" animation="wave">
                <span>{label}</span>
            </Placeholder.Button>
        )
    }
    return (
        <Button
            variant="outline-primary"
            onClick={onClick}
            data-testid="complete-column-assignment-button"
        >
            <span>{label}</span>
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
