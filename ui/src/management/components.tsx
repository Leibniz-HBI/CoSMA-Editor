import { Col, ListGroup, Row } from 'react-bootstrap'
import { useLoaderData, useNavigate } from 'react-router-dom'
import { UserPermissionGroupComponent } from '../user/permission_groups/components'
import { DisplayTxtManagementComponent } from './display_txt/components'
import { RegistrationForm } from '../auth/components/registration_form'
import { createUserThunk } from '../auth/thunks'
import { useAppDispatch } from '../hooks'
import { Subpage } from '../util/components/subpage'
import { ManagementPasswordComponent } from './password/components'

enum ManagementCategory {
    UserCreation = 'user-creation',
    UserPermission = 'user-permission',
    Password = 'password',
    DisplayTxt = 'display-txt'
}

export function ManagementPage() {
    const loaderData = useLoaderData()
    let category: ManagementCategory | undefined = undefined
    try {
        category = loaderData as ManagementCategory
    } catch (_e: unknown) {
        category = undefined
    }
    return (
        <Subpage
            pages={{
                'Create User': ManagementCategory.UserCreation,
                'User Permissions': ManagementCategory.UserPermission,
                'Reset User Password': ManagementCategory.Password,
                'Display Text': ManagementCategory.DisplayTxt
            }}
            selectedPage={category}
            pathPrefix={'/management/'}
        >
            {(category) => (
                <ManagementCategoryBody
                    selectedCategory={category as ManagementCategory}
                />
            )}
        </Subpage>
    )
}
export function ManagementCategoryBody({
    selectedCategory
}: {
    selectedCategory: ManagementCategory | undefined
}) {
    if (selectedCategory == ManagementCategory.UserPermission) {
        return <UserPermissionGroupComponent />
    } else if (selectedCategory === ManagementCategory.Password) {
        return <ManagementPasswordComponent />
    } else if (selectedCategory === ManagementCategory.UserCreation) {
        return <RegisterUserManagementComponent />
    } else if (selectedCategory == ManagementCategory.DisplayTxt) {
        return <DisplayTxtManagementComponent />
    }
    return <div>Please select a management category.</div>
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
