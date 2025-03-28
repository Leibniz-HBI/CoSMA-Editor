import { Col, ListGroup, Row } from 'react-bootstrap'
import { useLoaderData, useNavigate } from 'react-router-dom'
import { UserPermissionGroupComponent } from '../user/permission_groups/components'
import { DisplayTxtManagementComponent } from './display_txt/components'
import { RegistrationForm } from '../auth/components/registration_form'
import { createUserThunk } from '../auth/thunks'
import { useAppDispatch } from '../hooks'

enum ManagementCategory {
    None = '',
    UserCreation = 'user-creation',
    UserPermission = 'user-permission',
    DisplayTxt = 'display-txt'
}

export function ManagementPage() {
    const loaderData = useLoaderData()
    let category: ManagementCategory | undefined = undefined
    try {
        category = loaderData as ManagementCategory
    } catch (_e: unknown) {
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
    if (selectedCategory == ManagementCategory.UserPermission) {
        return <UserPermissionGroupComponent />
    } else if (selectedCategory == ManagementCategory.DisplayTxt) {
        return <DisplayTxtManagementComponent />
    } else if (selectedCategory === ManagementCategory.UserCreation) {
        return <RegisterUserManagementComponent />
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
                active={selectedCategory == ManagementCategory.UserPermission}
                onClick={() => navigate('/management/user-permission')}
            >
                User Permissions
            </ListGroup.Item>
            <ListGroup.Item
                active={selectedCategory == ManagementCategory.UserCreation}
                onClick={() => navigate('/management/user-creation')}
            >
                Create User
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

export function RegisterUserManagementComponent() {
    const dispatch = useAppDispatch()
    return (
        <Row className="h-100 overflow-hidden d-flex flex-row mt-4">
            <RegistrationForm
                registrationCallback={(props) => dispatch(createUserThunk(props))}
            />
        </Row>
    )
}
