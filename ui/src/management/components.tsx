import { Row } from 'react-bootstrap'
import { useLoaderData } from 'react-router-dom'
import { UserPermissionGroupComponent } from './permission_groups/components'
import { DisplayTxtManagementComponent } from './display_txt/components'
import { RegistrationForm } from '../auth/components/registration_form'
import { createUserThunk } from '../auth/thunks'
import { useAppDispatch } from '../hooks'
import { Subpage } from '../util/components/subpage'
import { ManagementPasswordComponent } from './password/components'
import { DataPublicationManagement } from './data_publication/components'
import { Reset2faComponent } from './2fa/components'
import { ManagementSshKeyComponent } from './ssh/components'

enum ManagementCategory {
    UserCreation = 'user-creation',
    UserPermission = 'user-permission',
    Password = 'password',
    MFA = 'mfa',
    DisplayTxt = 'display-txt',
    DataPublication = 'data-publication',
    SshKey = 'ssh'
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
                'Multi-Factor': ManagementCategory.MFA,
                'SSH Key': ManagementCategory.SshKey,
                'Display Text': ManagementCategory.DisplayTxt,
                'Data Publication': ManagementCategory.DataPublication
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
    } else if (selectedCategory === ManagementCategory.MFA) {
        return <Reset2faComponent />
    } else if (selectedCategory === ManagementCategory.SshKey) {
        return <ManagementSshKeyComponent />
    } else if (selectedCategory === ManagementCategory.UserCreation) {
        return <RegisterUserManagementComponent />
    } else if (selectedCategory == ManagementCategory.DisplayTxt) {
        return <DisplayTxtManagementComponent />
    } else if (selectedCategory == ManagementCategory.DataPublication) {
        return <DataPublicationManagement />
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
