import { Column } from '../column_menu/state'
import { PublicUserInfo } from '../user/state'
import { RemoteInterface } from '../util/state'

export interface OwnershipRequest {
    idPersistent: string
    petitioner: PublicUserInfo
    receiver: PublicUserInfo
    column: Column
}

export interface OwnershipRequests {
    petitioned: RemoteInterface<OwnershipRequest>[]
    received: RemoteInterface<OwnershipRequest>[]
}

export type PutOwnershipRequest = {
    idColumnPersistent: string
    idUserPersistent: string
}

export interface ColumnManagementState {
    ownershipRequests: RemoteInterface<OwnershipRequests>
    putOwnershipRequest: RemoteInterface<PutOwnershipRequest | undefined>
}
