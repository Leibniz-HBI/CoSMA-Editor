import { TagDefinition } from '../../column_menu/state'
import { RemoteInterface } from '../../util/state'

export interface DisplayTxtManagementState {
    tagDefinitions: RemoteInterface<TagDefinition[]>
}
