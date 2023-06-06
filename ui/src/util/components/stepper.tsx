import { createElement } from 'react'
import { Col, Row } from 'react-bootstrap'
import {
    Icon0Circle,
    Icon1Circle,
    Icon2Circle,
    Icon3Circle,
    Icon4Circle,
    Icon5Circle,
    Icon6Circle,
    Icon7Circle,
    Icon8Circle,
    Icon9Circle,
    Icon0CircleFill,
    Icon1CircleFill,
    Icon2CircleFill,
    Icon3CircleFill,
    Icon4CircleFill,
    Icon5CircleFill,
    Icon6CircleFill,
    Icon7CircleFill,
    Icon8CircleFill,
    Icon9CircleFill
} from 'react-bootstrap-icons'

export function StepSpacer() {
    return (
        <Col sm="1" className="align-self-center">
            <div className="stepper-line"></div>
        </Col>
    )
}

const activeIcons = [
    Icon0CircleFill,
    Icon1CircleFill,
    Icon2CircleFill,
    Icon3CircleFill,
    Icon4CircleFill,
    Icon5CircleFill,
    Icon6CircleFill,
    Icon7CircleFill,
    Icon8CircleFill,
    Icon9CircleFill
]

const inactiveIcons = [
    Icon0Circle,
    Icon1Circle,
    Icon2Circle,
    Icon3Circle,
    Icon4Circle,
    Icon5Circle,
    Icon6Circle,
    Icon7Circle,
    Icon8Circle,
    Icon9Circle
]

export function StepTitle({
    idx,
    selectedIdx,
    name,
    onClick
}: {
    idx: number
    selectedIdx: number
    name: string
    onClick?: VoidFunction
}) {
    const icons = selectedIdx < idx ? inactiveIcons : activeIcons
    const icon = icons[idx]
    let textClass = 'fs-5'
    if (onClick == undefined) {
        textClass = 'fs-5 fw-light'
    }
    return (
        <Col sm="auto" className="align-self-start ms-2 me-2" onClick={onClick}>
            <Row className="justify-content-around align-items-center">
                <Col className="align-self-center pe-0">
                    <span className="icon">
                        {createElement(icon, { className: textClass })}
                    </span>
                </Col>
                <Col className="align-self-center ps-0">
                    <span className={textClass}>{name}</span>
                </Col>
            </Row>
        </Col>
    )
}

export function StepHeader({
    stepNames,
    selectedIdx,
    activeIdx,
    navigateCallback
}: {
    stepNames: string[]
    selectedIdx: number
    activeIdx: number
    navigateCallback: (name: string) => void
}) {
    const stepTitles = stepNames.flatMap((name, idx) => {
        const isAvailable = idx <= activeIdx
        const onClickCallback = isAvailable
            ? () => navigateCallback(name.toLowerCase())
            : undefined
        const stepTitle = (
            <StepTitle
                idx={idx}
                selectedIdx={selectedIdx}
                name={name}
                key={'step-title-' + idx.toString()}
                onClick={onClickCallback}
            />
        )
        if (idx == 0) {
            return [stepTitle]
        }
        return [<StepSpacer key={'step-spacer-' + idx.toString()} />, stepTitle]
    })
    return (
        <Row className="justify-content-between mb-2">
            <Col className="ps-5 pe-5 align-self-center">
                <Row className="justify-content-center align-items-center mb-5 text-primary">
                    {stepTitles}
                </Row>
            </Col>
        </Row>
    )
}
