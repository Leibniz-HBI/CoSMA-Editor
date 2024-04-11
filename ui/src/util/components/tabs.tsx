import { ReactElement, useState } from 'react'
import { Col, Row } from 'react-bootstrap'
import { CosmaeLoading } from './misc'

export interface Tab {
    name: string
    component: ReactElement
}

export function TabView({
    tabList,
    initialTabIdx = undefined,
    isLoading = false
}: {
    tabList: Tab[]
    initialTabIdx?: number
    isLoading?: boolean
}) {
    const [selectedTabIdx, setSelectedTabIdx] = useState(initialTabIdx ?? 0)
    let body = <div />
    const tabItems = []
    for (const [idx, tab] of tabList.entries()) {
        if (idx == selectedTabIdx) {
            body = tab.component
            tabItems.push(
                <li className="nav-item " key={idx}>
                    <a className="nav-link active bg-transparent border-primary border-bottom-0">
                        {tab.name}
                    </a>
                </li>
            )
        } else {
            tabItems.push(
                <li
                    className="nav-item "
                    key={idx}
                    onClick={() => {
                        setSelectedTabIdx(idx)
                    }}
                >
                    <a className="nav-link fw-semibold border-primary border-0 bg-primary-subtle">
                        {tab.name}
                    </a>
                </li>
            )
        }
    }
    if (isLoading) {
        body = <CosmaeLoading />
    }
    return (
        <div className="text-left rounded ps-0 pe-0 h-100 overflow-y-hidden">
            <Col className="h-100 d-flex flex-column overflow-hidden flex-grow-1 flex-shrink-1">
                <Row className="ms-0 me-0 mb-1">
                    <ul className="nav nav-tabs justify-content-center border-primary">
                        {tabItems}
                    </ul>
                </Row>
                {body}
            </Col>
        </div>
    )
}
