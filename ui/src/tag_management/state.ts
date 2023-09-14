import { ColumnDefinition } from '../column_menu/state'
import { PublicUserInfo } from '../user/state'
import { RemoteInterface } from '../util/state'

export interface OwnershipRequest {
    idPersistent: string
    petitioner: PublicUserInfo
    receiver: PublicUserInfo
    tagDefinition: ColumnDefinition
}

export interface OwnershipRequests {
    petitioned: RemoteInterface<OwnershipRequest>[]
    received: RemoteInterface<OwnershipRequest>[]
}

export type PutOwnershipRequest = {
    idTagDefinitionPersistent: string
    idUserPersistent: string
}

export interface TagManagementState {
    ownershipRequests: RemoteInterface<OwnershipRequests>
    putOwnershipRequest: RemoteInterface<PutOwnershipRequest | undefined>
}
