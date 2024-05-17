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
    header,
    children,
    className = ''
}: {
    header?: ReactNode
    children: ReactNode
    className?: string
}) {
    return (
        <Card className={className + ' bg-light'}>
            <Card.Body className="col bg-light h-100 pt-0 ps-0 pe-0 pb-5 mb-1 rounded-top">
                <div className="bg-primary-subtle ps-2 pe-2 pt-2 pb-3 mb-2 rounded-top flex-grow-0">
                    <div className="border-primary border-3">
                        {header !== undefined && header}
                    </div>
                </div>
                <div className="h-100 bg-light rounded-bottom">{children}</div>
            </Card.Body>
        </Card>
    )
}
