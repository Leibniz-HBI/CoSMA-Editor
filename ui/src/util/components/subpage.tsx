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
        <Row className="vh-85 overflow-hidden">
            <Col xs={2} className="h-100 overflow-y-scroll pb-3">
                <SubpageSelection
                    pages={pages}
                    selectedPage={selectedPage}
                    pathPrefix={pathPrefix}
                />
            </Col>
            <Col className="h-100 overflow-hidden d-flex flex-column">{children(selectedPage)}</Col>
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
            {Object.entries(pages).map((page, idx) => (
                <ListGroup.Item
                    key={idx}
                    active={selectedPage == page[1]}
                    role="button"
                    onClick={() => navigate(pathPrefix + page[1].toString())}
                >{page[0]}</ListGroup.Item>
            ))}
        </ListGroup>
    )
}
