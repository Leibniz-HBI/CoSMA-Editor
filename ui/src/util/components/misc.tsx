import { Button, Placeholder } from 'react-bootstrap'
import { Remote } from '../state'

export function CosmaeLoading() {
    return (
        <div className="cosmae-table-container-outer">
            <div className="cosmae-table-container-inner">
                <div className="shimmer"></div>
            </div>
        </div>
    )
}

export function RemoteTriggerButton({
    remoteState,
    onClick,
    normalLabel,
    successLabel
}: {
    normalLabel: string
    successLabel: string
    remoteState: Remote<boolean>
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
