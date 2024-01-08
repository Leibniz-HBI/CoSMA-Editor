import { Col, ListGroup, Row } from 'react-bootstrap'
import { useLoaderData, useNavigate } from 'react-router-dom'
import { UserPermissionGroupComponent } from '../user/permission_groups/components'
import { DisplayTxtManagementComponent } from './display_txt/components'

enum ManagementCategory {
    None = '',
    User = 'user',
    DisplayTxt = 'display-txt'
}

export function ManagementPage() {
    const loaderData = useLoaderData()
    let category: ManagementCategory | undefined = undefined
    try {
        category = loaderData as ManagementCategory
    } catch (e: unknown) {
        category = ManagementCategory.None
    }
    return (
        <Row className="h-100 overflow-hidden d-flex flex-row">
            <Col xs={2} className="overflow-y-scroll">
                <ManagementCategorySelection selectedCategory={category} />
            </Col>
            <Col className="h-100 overflow-y-scroll">
                <ManagementCategoryBody selectedCategory={category} />
            </Col>
        </Row>
    )
}
export function ManagementCategoryBody({
    selectedCategory
}: {
    selectedCategory: ManagementCategory
}) {
    if (selectedCategory == ManagementCategory.User) {
        return <UserPermissionGroupComponent />
    }
    if (selectedCategory == ManagementCategory.DisplayTxt) {
        return <DisplayTxtManagementComponent />
    }
    return <div>Please select a management category.</div>
}

export function ManagementCategorySelection({
    selectedCategory
}: {
    selectedCategory: ManagementCategory
}) {
    const navigate = useNavigate()
    return (
        <ListGroup>
            <ListGroup.Item
                active={selectedCategory == ManagementCategory.User}
                onClick={() => navigate('/management/user')}
            >
                User Permissions
            </ListGroup.Item>
            <ListGroup.Item
                active={selectedCategory == ManagementCategory.DisplayTxt}
                onClick={() => navigate('/management/display-txt')}
            >
                Display Text Order
            </ListGroup.Item>
        </ListGroup>
    )
}
