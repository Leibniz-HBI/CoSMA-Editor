import { useLoaderData } from 'react-router-dom'
import { Subpage } from '../../util/components/subpage'
import { SshKeyPage } from './ssh_key'
import { ProfilePasswordComponent } from './password'

enum ProfileCategory {
    Password = 'password',
    Ssh = 'ssh'
}
export function ProfilePage() {
    const loaderData = useLoaderData()
    let category: ProfileCategory | undefined = undefined
    try {
        category = loaderData as ProfileCategory
    } catch (_e: unknown) {
        category = undefined
    }
    return (
        <Subpage
            pages={{
                Password: ProfileCategory.Password,
                'SSH Key': ProfileCategory.Ssh
            }}
            selectedPage={category}
            pathPrefix={'/profile/'}
        >
            {(category) => (
                <ProfileCategoryBody selectedCategory={category as ProfileCategory} />
            )}
        </Subpage>
    )
}
export function ProfileCategoryBody({
    selectedCategory
}: {
    selectedCategory: ProfileCategory | undefined
}) {
    if (selectedCategory == ProfileCategory.Password) {
        return <ProfilePasswordComponent />
    }
    if (selectedCategory == ProfileCategory.Ssh) {
        return <SshKeyPage />
    }
    return <div>Please select a management category.</div>
}
