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
    activeIdx,
    name
}: {
    idx: number
    activeIdx: number
    name: string
}) {
    const icons = activeIdx < idx ? inactiveIcons : activeIcons
    const icon = icons[idx]
    console.log(icon)
    return (
        <Col sm="auto" className="align-self-start ms-2 me-2">
            <Row className="justify-content-around align-items-center">
                <Col className="align-self-center pe-0">
                    <span className="icon">
                        {createElement(icon, { className: 'fs-5' })}
                    </span>
                </Col>
                <Col className="align-self-center ps-0">
                    <span className="fs-5">{name}</span>
                </Col>
            </Row>
        </Col>
    )
}

export function StepHeader({
    stepNames,
    activeIdx
}: {
    stepNames: string[]
    activeIdx: number
}) {
    const stepTitles = stepNames.flatMap((name, idx) => {
        if (idx == 0) {
            return [
                <StepTitle
                    idx={idx}
                    activeIdx={activeIdx}
                    name={name}
                    key={'step-title-0'}
                />
            ]
        }
        return [
            <StepSpacer key={'step-spacer-' + idx.toString()} />,
            <StepTitle
                idx={idx}
                activeIdx={activeIdx}
                name={name}
                key={'step-title-' + idx.toString()}
            />
        ]
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
