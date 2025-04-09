import { ReactNode } from 'react'
import { Col, ListGroup, Row } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'

export function Subpage<T extends string | number>({
    pages,
    selectedPage,
    pathPrefix,
    children
}: {
    pages: { [key: string]: T }
    selectedPage: T | undefined
    pathPrefix: string
    children: (page: T | undefined) => ReactNode
}) {
    return (
        <Row className="h-100 overflow-hidden d-flex flex-row">
            <Col xs={2} className="overflow-y-scroll">
                <SubpageSelection
                    pages={pages}
                    selectedPage={selectedPage}
                    pathPrefix={pathPrefix}
                />
            </Col>
            <Col className="h-100 overflow-y-hidden">{children(selectedPage)}</Col>
        </Row>
    )
}

export function SubpageSelection<T extends string | number>({
    pages,
    selectedPage,
    pathPrefix
}: {
    pages: { [key: string]: T }
    selectedPage: T | undefined
    pathPrefix: string
}) {
    const navigate = useNavigate()
    return (
        <ListGroup>
            {Object.entries(pages).map((page) => (
                <ListGroup.Item
                    active={selectedPage == page[1]}
                    role="button"
                    onClick={() => navigate(pathPrefix + page[1].toString())}
                >{page[0]}</ListGroup.Item>
            ))}
        </ListGroup>
    )
}
